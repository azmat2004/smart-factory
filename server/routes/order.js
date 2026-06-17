const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getNow, generateSeq } = require('../utils/helpers');

// 查询订单列表
router.get('/list', async (req, res) => {
  try {
    const { orderSeq, productId, orderStatus, page = 1, pageSize = 10 } = req.query;
    let sql = `SELECT o.*, p.product_name, p.product_num FROM t_product_order o LEFT JOIN t_product p ON o.product_id = p.id WHERE o.flag = 0 AND o.factory_id = ?`;
    const params = [req.factoryId];
    if (orderSeq) { sql += ` AND o.order_seq LIKE ?`; params.push(`%${orderSeq}%`); }
    if (productId) { sql += ` AND o.product_id = ?`; params.push(parseInt(productId)); }
    if (orderStatus) { sql += ` AND o.order_status = ?`; params.push(parseInt(orderStatus)); }

    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ` ORDER BY o.create_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    const [rows] = await pool.query(sql, params);

    // 获取订单完成数量(从订单跟踪表聚合)
    for (let row of rows) {
      const [track] = await pool.query(
        `SELECT COALESCE(SUM(qualified_count), 0) as completed FROM t_order_track WHERE schedule_id IN
         (SELECT id FROM t_product_schedule WHERE plan_id IN (SELECT id FROM t_product_plan WHERE order_id = ?)) AND flag = 0`,
        [row.id]
      );
      row.completedCount = track[0].completed;
      // 计算可用产能
      const [yield] = await pool.query(
        `SELECT COALESCE(SUM(ep.yield), 0) as total FROM t_equipment_product ep
         INNER JOIN t_equipment e ON ep.equipment_id = e.id WHERE ep.product_id = ? AND e.factory_id = ? AND e.flag = 0 AND e.equipment_status = 10`,
        [row.product_id, req.factoryId]
      );
      row.availableYield = yield[0].total;
    }

    res.json({ status: 'success', data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 新建订单
router.post('/add', async (req, res) => {
  try {
    const { productId, productCount, endDate, orderSource } = req.body;
    if (!productId || !productCount || !endDate) {
      return res.json({ status: 'error', msg: '产品、数量和截止日期为必填项' });
    }
    // 检查工厂是否有产品
    const [pRows] = await pool.query('SELECT id FROM t_product WHERE id = ? AND flag = 0 AND factory_id = ?', [productId, req.factoryId]);
    if (pRows.length === 0) return res.json({ status: 'error', msg: '产品不存在或不属于当前工厂' });

    const now = getNow();
    const orderSeq = generateSeq('O');
    await pool.query(
      `INSERT INTO t_product_order (flag, create_time, create_userid, order_seq, order_source, product_id, product_count, end_date, order_status, factory_id)
       VALUES (0, ?, ?, ?, ?, ?, ?, ?, 10, ?)`,
      [now, req.user.id, orderSeq, orderSource || 1, productId, parseInt(productCount), endDate, req.factoryId]
    );
    res.json({ status: 'success', msg: '订单创建成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '创建失败: ' + err.message });
  }
});

// 接单
router.post('/accept', async (req, res) => {
  try {
    const { id } = req.body;
    const [order] = await pool.query('SELECT * FROM t_product_order WHERE id = ? AND flag = 0', [id]);
    if (order.length === 0) return res.json({ status: 'error', msg: '订单不存在' });
    if (order[0].order_status !== 10) return res.json({ status: 'error', msg: '只有未接单状态的订单可以接单' });
    // 检查可用产能
    const [yield] = await pool.query(
      `SELECT COALESCE(SUM(ep.yield), 0) as total FROM t_equipment_product ep
       INNER JOIN t_equipment e ON ep.equipment_id = e.id WHERE ep.product_id = ? AND e.factory_id = ? AND e.flag = 0 AND e.equipment_status = 10`,
      [order[0].product_id, req.factoryId]
    );
    if (yield[0].total < order[0].product_count) {
      return res.json({ status: 'error', msg: `可用产能(${yield[0].total})不足，无法满足订单数量(${order[0].product_count})` });
    }
    await pool.query(`UPDATE t_product_order SET order_status = 20, update_time = ? WHERE id = ?`, [getNow(), id]);
    res.json({ status: 'success', msg: '接单成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '接单失败: ' + err.message });
  }
});

// 拒单
router.post('/reject', async (req, res) => {
  try {
    const { id, remark } = req.body;
    if (!remark) return res.json({ status: 'error', msg: '拒绝订单须填写备注' });
    const [order] = await pool.query('SELECT * FROM t_product_order WHERE id = ? AND flag = 0', [id]);
    if (order.length === 0) return res.json({ status: 'error', msg: '订单不存在' });
    if (order[0].order_status !== 10) return res.json({ status: 'error', msg: '只有未接单状态的订单可以拒单' });
    await pool.query(`UPDATE t_product_order SET order_status = 30, update_time = ?, factory_yield = ? WHERE id = ?`,
      [getNow(), remark, id]);
    res.json({ status: 'success', msg: '拒单成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '拒单失败: ' + err.message });
  }
});

// 转成生产计划
router.post('/toPlan', async (req, res) => {
  try {
    const { id, planStartDate, planEndDate } = req.body;
    if (!planStartDate || !planEndDate) return res.json({ status: 'error', msg: '请填写计划起止日期' });
    const [order] = await pool.query('SELECT * FROM t_product_order WHERE id = ? AND flag = 0', [id]);
    if (order.length === 0) return res.json({ status: 'error', msg: '订单不存在' });
    if (order[0].order_status !== 20) return res.json({ status: 'error', msg: '只有已接单状态的订单可转成生产计划' });
    const now = getNow();
    const planSeq = generateSeq('P');
    await pool.query(
      `INSERT INTO t_product_plan (flag, create_time, create_userid, plan_seq, order_id, product_id, plan_count, delivery_date, plan_start_date, plan_end_date, plan_status, factory_id)
       VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, ?)`,
      [now, req.user.id, planSeq, id, order[0].product_id, order[0].product_count, order[0].end_date, planStartDate, planEndDate, req.factoryId]
    );
    await pool.query(`UPDATE t_product_order SET order_status = 40, update_time = ? WHERE id = ?`, [now, id]);
    res.json({ status: 'success', msg: '已生成生产计划，订单进入生产中状态' });
  } catch (err) {
    res.json({ status: 'error', msg: '操作失败: ' + err.message });
  }
});

// 完成订单
router.post('/complete', async (req, res) => {
  try {
    const { id, remark } = req.body;
    const [order] = await pool.query('SELECT * FROM t_product_order WHERE id = ? AND flag = 0', [id]);
    if (order.length === 0) return res.json({ status: 'error', msg: '订单不存在' });
    if (order[0].order_status !== 40) return res.json({ status: 'error', msg: '只有生产中的订单可以完成' });
    // 检查完成数量
    const [track] = await pool.query(
      `SELECT COALESCE(SUM(qualified_count), 0) as total FROM t_order_track WHERE schedule_id IN
       (SELECT id FROM t_product_schedule WHERE plan_id IN (SELECT id FROM t_product_plan WHERE order_id = ?)) AND flag = 0`,
      [id]
    );
    const completed = track[0].total;
    const now = getNow();
    if (completed < order[0].product_count) {
      if (!remark) return res.json({ status: 'error', msg: `完成数量(${completed})未达到订单数量(${order[0].product_count})，需填写备注才可完成` });
      // 记录备注到订单
      await pool.query(`UPDATE t_product_order SET order_status = 50, update_time = ?, factory_yield = ? WHERE id = ?`, [now, remark, id]);
    } else {
      await pool.query(`UPDATE t_product_order SET order_status = 50, update_time = ? WHERE id = ?`, [now, id]);
    }
    // 将关联的所有计划和工单置为已完成
    await pool.query(
      `UPDATE t_product_plan SET plan_status = 30 WHERE order_id = ? AND flag = 0`,
      [id]
    );
    await pool.query(
      `UPDATE t_product_schedule SET schedule_status = 30 WHERE plan_id IN (SELECT id FROM t_product_plan WHERE order_id = ?) AND flag = 0`,
      [id]
    );
    res.json({ status: 'success', msg: '订单已完成' });
  } catch (err) {
    res.json({ status: 'error', msg: '操作失败: ' + err.message });
  }
});

module.exports = router;
