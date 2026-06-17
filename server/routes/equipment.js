const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { getNow } = require('../utils/helpers');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/uploads/equipment');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// 查询设备列表
router.get('/list', async (req, res) => {
  try {
    const { equipmentName, productName, page = 1, pageSize = 10 } = req.query;
    let sql = `SELECT e.* FROM t_equipment e WHERE e.flag = 0 AND e.factory_id = ?`;
    const params = [req.factoryId];
    if (equipmentName) { sql += ` AND e.equipment_name LIKE ?`; params.push(`%${equipmentName}%`); }
    if (productName) {
      sql += ` AND e.id IN (SELECT equipment_id FROM t_equipment_product ep LEFT JOIN t_product p ON ep.product_id = p.id WHERE p.product_name LIKE ?)`;
      params.push(`%${productName}%`);
    }

    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ` ORDER BY e.create_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    const [rows] = await pool.query(sql, params);

    // 获取产能信息
    for (let row of rows) {
      const [ep] = await pool.query(
        `SELECT ep.*, p.product_name, p.product_num FROM t_equipment_product ep
         LEFT JOIN t_product p ON ep.product_id = p.id
         WHERE ep.equipment_id = ?`,
        [row.id]
      );
      row.products = ep;
      // 检查是否关联进行中的工单
      const [activeSch] = await pool.query(
        `SELECT COUNT(*) as cnt FROM t_product_schedule WHERE equipment_id = ? AND schedule_status = 20 AND flag = 0`,
        [row.id]
      );
      row.hasActiveSchedule = activeSch[0].cnt > 0;
    }

    res.json({ status: 'success', data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 获取可用设备列表（下拉框用）
router.get('/available', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, equipment_seq, equipment_name, equipment_status FROM t_equipment WHERE flag = 0 AND factory_id = ? AND equipment_status = 10`,
      [req.factoryId]
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 获取可生产某产品的设备
router.get('/by-product/:productId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.equipment_seq, e.equipment_name, ep.yield
       FROM t_equipment e
       INNER JOIN t_equipment_product ep ON e.id = ep.equipment_id
       WHERE e.flag = 0 AND e.factory_id = ? AND ep.product_id = ? AND e.equipment_status = 10`,
      [req.factoryId, req.params.productId]
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 上传设备图片
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ status: 'error', msg: '未选择文件' });
    res.json({ status: 'success', msg: '/uploads/equipment/' + req.file.filename });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 添加设备
router.post('/add', async (req, res) => {
  try {
    const { equipmentSeq, equipmentName, equipmentStatus, equipmentImgUrl, products } = req.body;
    if (!equipmentSeq) return res.json({ status: 'error', msg: '设备序列号必填' });
    // 序列号唯一检查
    const [dup] = await pool.query('SELECT id FROM t_equipment WHERE equipment_seq = ? AND factory_id = ? AND flag = 0', [equipmentSeq, req.factoryId]);
    if (dup.length > 0) return res.json({ status: 'error', msg: '设备序列号不可重复' });
    const now = getNow();
    const [result] = await pool.query(
      `INSERT INTO t_equipment (flag, create_time, create_userid, equipment_seq, equipment_name, equipment_img_url, equipment_status, factory_id)
       VALUES (0, ?, ?, ?, ?, ?, ?, ?)`,
      [now, req.user.id, equipmentSeq, equipmentName || '', equipmentImgUrl || '/uploads/default/equipment.png', equipmentStatus || 10, req.factoryId]
    );
    const eqId = result.insertId;
    // 保存产能关联
    if (products && Array.isArray(products)) {
      for (const p of products) {
        if (p.productId && p.yield) {
          const [dupEP] = await pool.query('SELECT id FROM t_equipment_product WHERE equipment_id = ? AND product_id = ?', [eqId, p.productId]);
          if (dupEP.length === 0) {
            await pool.query(
              `INSERT INTO t_equipment_product (equipment_id, product_id, yield, unit, factory_id) VALUES (?, ?, ?, ?, ?)`,
              [eqId, p.productId, p.yield, p.unit || 10, req.factoryId]
            );
          }
        }
      }
    }
    res.json({ status: 'success', msg: '设备添加成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '添加失败: ' + err.message });
  }
});

// 编辑设备
router.post('/edit', async (req, res) => {
  try {
    const { id, equipmentSeq, equipmentName, equipmentStatus, equipmentImgUrl, products } = req.body;
    if (!id) return res.json({ status: 'error', msg: '参数错误' });
    if (!equipmentSeq) return res.json({ status: 'error', msg: '设备序列号必填' });
    // 序列号唯一检查
    const [dup] = await pool.query('SELECT id FROM t_equipment WHERE equipment_seq = ? AND factory_id = ? AND flag = 0 AND id != ?', [equipmentSeq, req.factoryId, id]);
    if (dup.length > 0) return res.json({ status: 'error', msg: '设备序列号不可重复' });
    const now = getNow();
    await pool.query(
      `UPDATE t_equipment SET equipment_seq = ?, equipment_name = ?, equipment_img_url = ?, equipment_status = ?, update_time = ?, update_userid = ? WHERE id = ?`,
      [equipmentSeq, equipmentName, equipmentImgUrl, equipmentStatus || 10, now, req.user.id, id]
    );
    // 更新产能关联 - 先删后增
    await pool.query('DELETE FROM t_equipment_product WHERE equipment_id = ?', [id]);
    if (products && Array.isArray(products)) {
      for (const p of products) {
        if (p.productId && p.yield) {
          await pool.query(
            `INSERT INTO t_equipment_product (equipment_id, product_id, yield, unit, factory_id) VALUES (?, ?, ?, ?, ?)`,
            [id, p.productId, p.yield, p.unit || 10, req.factoryId]
          );
        }
      }
    }
    res.json({ status: 'success', msg: '设备修改成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '修改失败: ' + err.message });
  }
});

// 删除设备
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const [active] = await pool.query(
      `SELECT COUNT(*) as cnt FROM t_product_schedule WHERE equipment_id = ? AND schedule_status = 20 AND flag = 0`,
      [id]
    );
    if (active[0].cnt > 0) {
      return res.json({ status: 'error', msg: '已关联启动工单的设备不可删除' });
    }
    await pool.query(`UPDATE t_equipment SET flag = 1 WHERE id = ?`, [id]);
    res.json({ status: 'success', msg: '设备删除成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '删除失败: ' + err.message });
  }
});

module.exports = router;
