const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getNow, generateSeq } = require('../utils/helpers');

// 查询生产计划列表
router.get('/list', async (req, res) => {
  try {
    const { planSeq, orderId, planStatus, page = 1, pageSize = 10 } = req.query;
    let sql = `SELECT pl.*, o.order_seq, p.product_name, p.product_num FROM t_product_plan pl
               LEFT JOIN t_product_order o ON pl.order_id = o.id
               LEFT JOIN t_product p ON pl.product_id = p.id
               WHERE pl.flag = 0 AND pl.factory_id = ?`;
    const params = [req.factoryId];
    if (planSeq) { sql += ` AND pl.plan_seq LIKE ?`; params.push(`%${planSeq}%`); }
    if (orderId) { sql += ` AND pl.order_id = ?`; params.push(parseInt(orderId)); }
    if (planStatus) { sql += ` AND pl.plan_status = ?`; params.push(parseInt(planStatus)); }

    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ` ORDER BY pl.create_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    const [rows] = await pool.query(sql, params);

    // 获取工单数
    for (let row of rows) {
      const [sch] = await pool.query('SELECT COUNT(*) as cnt FROM t_product_schedule WHERE plan_id = ? AND flag = 0', [row.id]);
      row.scheduleCount = sch[0].cnt;
    }

    res.json({ status: 'success', data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 获取已接单的订单列表(用于新建计划下拉)
router.get('/acceptable-orders', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.order_seq, o.product_count, o.end_date, p.product_name, p.id as product_id
       FROM t_product_order o LEFT JOIN t_product p ON o.product_id = p.id
       WHERE o.flag = 0 AND o.factory_id = ? AND o.order_status = 20`,
      [req.factoryId]
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 新建生产计划
router.post('/add', async (req, res) => {
  try {
    const { orderId, planCount, planStartDate, planEndDate } = req.body;
    if (!orderId || !planCount || !planStartDate || !planEndDate) {
      return res.json({ status: 'error', msg: '请完善计划信息' });
    }
    const [order] = await pool.query('SELECT * FROM t_product_order WHERE id = ? AND flag = 0 AND factory_id = ?', [orderId, req.factoryId]);
    if (order.length === 0) return res.json({ status: 'error', msg: '订单不存在' });
    if (order[0].order_status !== 20 && order[0].order_status !== 40) {
      return res.json({ status: 'error', msg: '只有已接单或生产中的订单可创建计划' });
    }
    const now = getNow();
    const planSeq = generateSeq('P');
    await pool.query(
      `INSERT INTO t_product_plan (flag, create_time, create_userid, plan_seq, order_id, product_id, plan_count, delivery_date, plan_start_date, plan_end_date, plan_status, factory_id)
       VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, ?)`,
      [now, req.user.id, planSeq, orderId, order[0].product_id, parseInt(planCount), order[0].end_date, planStartDate, planEndDate, req.factoryId]
    );
    // 如果订单状态是已接单(20)，更新为生产中(40)
    if (order[0].order_status === 20) {
      await pool.query(`UPDATE t_product_order SET order_status = 40 WHERE id = ?`, [orderId]);
    }
    res.json({ status: 'success', msg: '生产计划创建成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '创建失败: ' + err.message });
  }
});

// 编辑生产计划（仅未启动的可以编辑）
router.post('/edit', async (req, res) => {
  try {
    const { id, planCount, planStartDate, planEndDate } = req.body;
    if (!id) return res.json({ status: 'error', msg: '参数错误' });
    const [plan] = await pool.query('SELECT * FROM t_product_plan WHERE id = ? AND flag = 0', [id]);
    if (plan.length === 0) return res.json({ status: 'error', msg: '计划不存在' });
    if (plan[0].plan_status !== 10) return res.json({ status: 'error', msg: '已启动计划不可编辑' });
    await pool.query(
      `UPDATE t_product_plan SET plan_count = ?, plan_start_date = ?, plan_end_date = ?, update_time = ? WHERE id = ?`,
      [parseInt(planCount), planStartDate, planEndDate, getNow(), id]
    );
    res.json({ status: 'success', msg: '计划修改成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '修改失败: ' + err.message });
  }
});

// 启动计划
router.post('/start', async (req, res) => {
  try {
    const { id } = req.body;
    const [plan] = await pool.query('SELECT * FROM t_product_plan WHERE id = ? AND flag = 0', [id]);
    if (plan.length === 0) return res.json({ status: 'error', msg: '计划不存在' });
    if (plan[0].plan_status !== 10) return res.json({ status: 'error', msg: '只有未启动的计划可以启动' });
    const now = getNow();
    // 更新计划状态
    await pool.query(`UPDATE t_product_plan SET plan_status = 20, update_time = ? WHERE id = ?`, [now, id]);
    // 自动生成一条未开始的工单
    const scheduleSeq = generateSeq('PS');
    await pool.query(
      `INSERT INTO t_product_schedule (flag, create_time, create_userid, schedule_seq, schedule_count, schedule_status, plan_id, product_id, equipment_id, start_date, end_date, factory_id)
       VALUES (0, ?, ?, ?, ?, 10, ?, ?, NULL, ?, ?, ?)`,
      [now, req.user.id, scheduleSeq, plan[0].plan_count, id, plan[0].product_id, plan[0].plan_start_date, plan[0].plan_end_date, req.factoryId]
    );
    res.json({ status: 'success', msg: '计划已启动，已生成关联工单' });
  } catch (err) {
    res.json({ status: 'error', msg: '启动失败: ' + err.message });
  }
});

// 删除计划（仅未启动的可以删除）
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const [plan] = await pool.query('SELECT * FROM t_product_plan WHERE id = ? AND flag = 0', [id]);
    if (plan.length === 0) return res.json({ status: 'error', msg: '计划不存在' });
    if (plan[0].plan_status !== 10) return res.json({ status: 'error', msg: '已启动计划不可删除' });
    // 检查是否是该订单的唯一计划
    const [plans] = await pool.query('SELECT COUNT(*) as cnt FROM t_product_plan WHERE order_id = ? AND flag = 0', [plan[0].order_id]);
    if (plans[0].cnt <= 1) {
      return res.json({ status: 'error', msg: '每条生产中订单必须有一条以上生产计划，不可删除' });
    }
    await pool.query(`UPDATE t_product_plan SET flag = 1 WHERE id = ?`, [id]);
    res.json({ status: 'success', msg: '计划删除成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '删除失败: ' + err.message });
  }
});

module.exports = router;
