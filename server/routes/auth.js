const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { getNow, generateSeq } = require('../utils/helpers');

// 登录
router.post('/login', async (req, res) => {
  try {
    const { userName, password } = req.body;
    if (!userName || !password) {
      return res.json({ status: 'error', msg: '用户名和密码不能为空' });
    }
    const [rows] = await pool.query(
      `SELECT u.*, r.role_name FROM t_user u LEFT JOIN t_user_role r ON u.role_id = r.id WHERE u.user_name = ? AND u.user_passwd = ? AND u.flag = 0`,
      [userName, password]
    );
    if (rows.length === 0) {
      return res.json({ status: 'error', msg: '用户名或密码错误' });
    }
    const user = rows[0];
    if (user.user_status === 1) {
      return res.json({ status: 'error', msg: '账户已被锁定，请联系管理员' });
    }
    const token = generateToken(user);
    res.json({
      status: 'success',
      msg: '登录成功',
      data: {
        token,
        user: { id: user.id, userName: user.user_name, realName: user.user_real_name, roleId: user.role_id, roleName: user.role_name, factoryId: user.factory_id, factoryName: user.factory_name }
      }
    });
  } catch (err) {
    res.json({ status: 'error', msg: '登录失败: ' + err.message });
  }
});

// 注册
router.post('/register', async (req, res) => {
  try {
    const { factoryName, factoryAddr, factoryWorker, userName, userRealName, password, userJobNum, userPhone, userEmail } = req.body;
    if (!factoryName || !userName || !password) {
      return res.json({ status: 'error', msg: '工厂名称、用户名、密码为必填项' });
    }
    // 检查工厂名是否重复
    const [fRows] = await pool.query('SELECT id FROM t_factory WHERE factory_name = ? AND flag = 0', [factoryName]);
    if (fRows.length > 0) {
      return res.json({ status: 'error', msg: '工厂名称已存在' });
    }
    // 检查用户名是否重复
    const [uRows] = await pool.query('SELECT id FROM t_user WHERE user_name = ? AND flag = 0', [userName]);
    if (uRows.length > 0) {
      return res.json({ status: 'error', msg: '用户名已存在' });
    }
    const now = getNow();
    // 创建工厂
    const [fRes] = await pool.query(
      `INSERT INTO t_factory (flag, create_time, factory_name, factory_addr, factory_worker, factory_status, factory_img_url)
       VALUES (0, ?, ?, ?, ?, 0, '/uploads/default/noImage.png')`,
      [now, factoryName, factoryAddr || '', factoryWorker || 0]
    );
    const factoryId = fRes.insertId;
    // 创建角色
    await pool.query(`INSERT INTO t_user_role (flag, create_time, role_name, role_desc, role_status, factory_id) VALUES
      (0, ?, '管理员', '管理员', 0, ?),(0, ?, '订单管理员', '订单管理员', 0, ?),(0, ?, '计划管理员', '计划管理员', 0, ?),
      (0, ?, '调度管理员', '调度管理员', 0, ?),(0, ?, '生产员工', '生产员工', 0, ?)`,
      [now, factoryId, now, factoryId, now, factoryId, now, factoryId, now, factoryId]);
    // 获取管理员角色ID
    const [rRows] = await pool.query('SELECT id FROM t_user_role WHERE factory_id = ? AND role_name = ? AND flag = 0', [factoryId, '管理员']);
    const adminRoleId = rRows[0].id;
    // 创建管理员用户
    await pool.query(
      `INSERT INTO t_user (flag, create_time, user_status, user_name, user_real_name, user_passwd, user_job_num, user_phone_num, user_email, role_id, factory_id)
       VALUES (0, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [now, userName, userRealName || '', password, userJobNum || '', userPhone || '', userEmail || '', adminRoleId, factoryId]
    );
    res.json({ status: 'success', msg: '注册成功，请登录' });
  } catch (err) {
    res.json({ status: 'error', msg: '注册失败: ' + err.message });
  }
});

// 获取当前用户信息
router.get('/userinfo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.*, r.role_name, f.factory_name FROM t_user u
       LEFT JOIN t_user_role r ON u.role_id = r.id
       LEFT JOIN t_factory f ON u.factory_id = f.id
       WHERE u.id = ? AND u.flag = 0`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.json({ status: 'error', msg: '用户不存在' });
    }
    const u = rows[0];
    res.json({
      status: 'success',
      data: { id: u.id, userName: u.user_name, realName: u.user_real_name, roleId: u.role_id, roleName: u.role_name, factoryId: u.factory_id, factoryName: u.factory_name }
    });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 获取角色列表
router.get('/roles', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, role_name, role_desc FROM t_user_role WHERE flag = 0 AND factory_id = ?', [req.factoryId]);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

module.exports = router;
