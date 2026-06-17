const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getNow, generateSeq } = require('../utils/helpers');

// 查询工单列表
router.get('/list', async (req, res) => {
  try {
    const { scheduleSeq, planId, scheduleStatus, page = 1, pageSize = 10 } = req.query;
    let sql = `SELECT s.*, pl.plan_seq, p.product_name, p.product_num, e.equipment_seq, e.equipment_name
               FROM t_product_schedule s
               LEFT JOIN t_product_plan pl ON s.plan_id = pl.id
               LEFT JOIN t_product p ON s.product_id = p.id
               LEFT JOIN t_equipment e ON s.equipment_id = e.id
               WHERE s.flag = 0 AND s.factory_id = ?`;
    const params = [req.factoryId];
    if (scheduleSeq) { sql += ` AND s.schedule_seq LIKE ?`; params.push(`%${scheduleSeq}%`); }
    if (planId) { sql += ` AND s.plan_id = ?`; params.push(parseInt(planId)); }
    if (scheduleStatus) { sql += ` AND s.schedule_status = ?`; params.push(parseInt(scheduleStatus)); }

    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ` ORDER BY s.create_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    const [rows] = await pool.query(sql, params);

    // 获取报工记录
    for (let row of rows) {
      const [works] = await pool.query(
        `SELECT COALESCE(SUM(working_count), 0) as totalWork, COALESCE(SUM(qualified_count), 0) as totalQualified
         FROM t_daily_work WHERE schedule_id = ? AND flag = 0`,
        [row.id]
      );
      row.totalWorkCount = works[0].totalWork;
      row.totalQualifiedCount = works[0].totalQualified;
    }

    res.json({ status: 'success', data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 获取已启动计划（下拉框用）
router.get('/active-plans', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pl.id, pl.plan_seq, pl.product_id, pl.plan_count, p.product_name
       FROM t_product_plan pl LEFT JOIN t_product p ON pl.product_id = p.id
       WHERE pl.flag = 0 AND pl.factory_id = ? AND pl.plan_status = 20`,
      [req.factoryId]
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 新建工单
router.post('/add', async (req, res) => {
  try {
    const { planId, scheduleCount, equipmentId, startDate, endDate } = req.body;
    if (!planId || !scheduleCount || !startDate || !endDate) {
      return res.json({ status: 'error', msg: '请完善工单信息' });
    }
    const [plan] = await pool.query('SELECT * FROM t_product_plan WHERE id = ? AND flag = 0', [planId]);
    if (plan.length === 0) return res.json({ status: 'error', msg: '计划不存在' });
    if (plan[0].plan_status !== 20) return res.json({ status: 'error', msg: '只有已启动的计划可以新建工单' });
    // 验证设备可生产该产品
    if (equipmentId) {
      const [ep] = await pool.query(
        'SELECT * FROM t_equipment_product WHERE equipment_id = ? AND product_id = ?',
        [equipmentId, plan[0].product_id]
      );
      if (ep.length === 0) return res.json({ status: 'error', msg: '该设备不能生产此产品' });
    }
    const now = getNow();
    const scheduleSeq = generateSeq('PS');
    await pool.query(
      `INSERT INTO t_product_schedule (flag, create_time, create_userid, schedule_seq, schedule_count, schedule_status, plan_id, product_id, equipment_id, start_date, end_date, factory_id)
       VALUES (0, ?, ?, ?, ?, 10, ?, ?, ?, ?, ?, ?)`,
      [now, req.user.id, scheduleSeq, parseInt(scheduleCount), planId, plan[0].product_id, equipmentId || null, startDate, endDate, req.factoryId]
    );
    res.json({ status: 'success', msg: '工单创建成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '创建失败: ' + err.message });
  }
});

// 启动工单
router.post('/start', async (req, res) => {
  try {
    const { id } = req.body;
    const [sch] = await pool.query('SELECT * FROM t_product_schedule WHERE id = ? AND flag = 0', [id]);
    if (sch.length === 0) return res.json({ status: 'error', msg: '工单不存在' });
    if (sch[0].schedule_status !== 10) return res.json({ status: 'error', msg: '只有未开始的工单可以启动' });
    if (!sch[0].equipment_id) return res.json({ status: 'error', msg: '请先为工单分配设备' });
    await pool.query(`UPDATE t_product_schedule SET schedule_status = 20, update_time = ? WHERE id = ?`, [getNow(), id]);
    // 创建订单跟踪记录
    await pool.query(
      `INSERT INTO t_order_track (flag, create_time, schedule_id, plan_id, product_id, working_count, qualified_count, factory_id)
       VALUES (0, ?, ?, ?, ?, 0, 0, ?)`,
      [getNow(), id, sch[0].plan_id, sch[0].product_id, req.factoryId]
    );
    res.json({ status: 'success', msg: '工单已启动' });
  } catch (err) {
    res.json({ status: 'error', msg: '启动失败: ' + err.message });
  }
});

// 删除工单（仅未开始的可以删除）
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const [sch] = await pool.query('SELECT * FROM t_product_schedule WHERE id = ? AND flag = 0', [id]);
    if (sch.length === 0) return res.json({ status: 'error', msg: '工单不存在' });
    if (sch[0].schedule_status !== 10) return res.json({ status: 'error', msg: '已启动工单不可删除' });
    // 检查是否是计划中的唯一工单
    const [schs] = await pool.query('SELECT COUNT(*) as cnt FROM t_product_schedule WHERE plan_id = ? AND flag = 0', [sch[0].plan_id]);
    if (schs[0].cnt <= 1) {
      return res.json({ status: 'error', msg: '每一条已启动计划中必须有一条以上工单记录，不可删除' });
    }
    await pool.query(`UPDATE t_product_schedule SET flag = 1 WHERE id = ?`, [id]);
    res.json({ status: 'success', msg: '工单删除成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '删除失败: ' + err.message });
  }
});

// 编辑工单（仅未开始的可以编辑）
router.post('/edit', async (req, res) => {
  try {
    const { id, scheduleCount, equipmentId, startDate, endDate } = req.body;
    if (!id) return res.json({ status: 'error', msg: '参数错误' });
    const [sch] = await pool.query('SELECT * FROM t_product_schedule WHERE id = ? AND flag = 0', [id]);
    if (sch.length === 0) return res.json({ status: 'error', msg: '工单不存在' });
    if (sch[0].schedule_status !== 10) return res.json({ status: 'error', msg: '已启动工单不可编辑' });
    await pool.query(
      `UPDATE t_product_schedule SET schedule_count = ?, equipment_id = ?, start_date = ?, end_date = ?, update_time = ? WHERE id = ?`,
      [parseInt(scheduleCount), equipmentId || null, startDate, endDate, getNow(), id]
    );
    res.json({ status: 'success', msg: '工单修改成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '修改失败: ' + err.message });
  }
});

module.exports = router;
