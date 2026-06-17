const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getNow } = require('../utils/helpers');

// 获取生产中工单列表（报工用）
router.get('/active-schedules', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, pl.plan_seq, p.product_name, e.equipment_seq, e.equipment_name
       FROM t_product_schedule s
       LEFT JOIN t_product_plan pl ON s.plan_id = pl.id
       LEFT JOIN t_product p ON s.product_id = p.id
       LEFT JOIN t_equipment e ON s.equipment_id = e.id
       WHERE s.flag = 0 AND s.factory_id = ? AND s.schedule_status = 20`,
      [req.factoryId]
    );
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 查询报工记录
router.get('/list', async (req, res) => {
  try {
    const { scheduleId, page = 1, pageSize = 10 } = req.query;
    let sql = `SELECT dw.*, s.schedule_seq, e.equipment_name, p.product_name
               FROM t_daily_work dw
               LEFT JOIN t_product_schedule s ON dw.schedule_id = s.id
               LEFT JOIN t_equipment e ON dw.equipment_id = e.id
               LEFT JOIN t_product p ON s.product_id = p.id
               WHERE dw.flag = 0 AND dw.factory_id = ?`;
    const params = [req.factoryId];
    if (scheduleId) { sql += ` AND dw.schedule_id = ?`; params.push(parseInt(scheduleId)); }

    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ` ORDER BY dw.create_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    const [rows] = await pool.query(sql, params);

    res.json({ status: 'success', data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 报工
router.post('/report', async (req, res) => {
  try {
    const { scheduleId, workingCount, qualifiedCount, startTime, endTime, completeFlag, bak } = req.body;
    if (!scheduleId || !workingCount || qualifiedCount === undefined || !startTime || !endTime) {
      return res.json({ status: 'error', msg: '请完善报工信息' });
    }
    const [sch] = await pool.query('SELECT * FROM t_product_schedule WHERE id = ? AND flag = 0', [scheduleId]);
    if (sch.length === 0) return res.json({ status: 'error', msg: '工单不存在' });
    if (sch[0].schedule_status !== 20) return res.json({ status: 'error', msg: '只能对生产中的工单报工' });

    const wc = parseInt(workingCount);
    const qc = parseInt(qualifiedCount);
    const unq = wc - qc;
    const isComplete = completeFlag === true || completeFlag === 1 || completeFlag === '1' || completeFlag === 'true';
    const now = getNow();

    // 插入报工记录
    await pool.query(
      `INSERT INTO t_daily_work (flag, create_time, create_userid, schedule_id, equipment_id, equipment_seq, start_time, end_time, working_count, qualified_count, unqualified_cout, complete_flag, factory_id, bak)
       VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [now, req.user.id, scheduleId, sch[0].equipment_id, sch[0].equipment_seq,
       startTime, endTime, wc, qc, unq, isComplete ? 0 : 1, req.factoryId, bak || '']
    );

    // 更新订单跟踪表
    const [track] = await pool.query('SELECT * FROM t_order_track WHERE schedule_id = ? AND flag = 0', [scheduleId]);
    if (track.length > 0) {
      await pool.query(
        `UPDATE t_order_track SET working_count = working_count + ?, qualified_count = qualified_count + ?, update_time = ? WHERE schedule_id = ?`,
        [wc, qc, now, scheduleId]
      );
    }

    // 如果是完成报工，更新工单状态
    if (isComplete) {
      await pool.query(`UPDATE t_product_schedule SET schedule_status = 30, update_time = ? WHERE id = ?`, [now, scheduleId]);

      // 检查是否所有工单都完成，如果是则完成计划
      const [schs] = await pool.query('SELECT COUNT(*) as cnt FROM t_product_schedule WHERE plan_id = ? AND flag = 0 AND schedule_status != 30', [sch[0].plan_id]);
      if (schs[0].cnt === 0) {
        await pool.query(`UPDATE t_product_plan SET plan_status = 30 WHERE id = ?`, [sch[0].plan_id]);
      }

      // 更新订单完成数量
      const [plan] = await pool.query('SELECT order_id FROM t_product_plan WHERE id = ?', [sch[0].plan_id]);
      if (plan.length > 0) {
        const [allTrack] = await pool.query(
          `SELECT COALESCE(SUM(qualified_count), 0) as total FROM t_order_track WHERE schedule_id IN
           (SELECT id FROM t_product_schedule WHERE plan_id IN (SELECT id FROM t_product_plan WHERE order_id = ?)) AND flag = 0`,
          [plan[0].order_id]
        );
        // 检查是否需要自动完成订单
        const [order] = await pool.query('SELECT * FROM t_product_order WHERE id = ? AND flag = 0', [plan[0].order_id]);
        if (order.length > 0 && allTrack[0].total >= order[0].product_count) {
          await pool.query(`UPDATE t_product_order SET order_status = 50, update_time = ? WHERE id = ?`, [now, plan[0].order_id]);
        }
      }
    }

    res.json({ status: 'success', msg: isComplete ? '完成报工成功，工单已完成' : '报工成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '报工失败: ' + err.message });
  }
});

// 获取工单详情（报工页面使用）
router.get('/schedule-detail/:id', async (req, res) => {
  try {
    const [sch] = await pool.query(
      `SELECT s.*, pl.plan_seq, p.product_name, p.product_num, e.equipment_seq, e.equipment_name
       FROM t_product_schedule s
       LEFT JOIN t_product_plan pl ON s.plan_id = pl.id
       LEFT JOIN t_product p ON s.product_id = p.id
       LEFT JOIN t_equipment e ON s.equipment_id = e.id
       WHERE s.id = ? AND s.flag = 0`,
      [req.params.id]
    );
    if (sch.length === 0) return res.json({ status: 'error', msg: '工单不存在' });
    const [works] = await pool.query(
      `SELECT COALESCE(SUM(working_count), 0) as totalWork, COALESCE(SUM(qualified_count), 0) as totalQualified
       FROM t_daily_work WHERE schedule_id = ? AND flag = 0`,
      [req.params.id]
    );
    res.json({
      status: 'success',
      data: { ...sch[0], totalWorkCount: works[0].totalWork, totalQualifiedCount: works[0].totalQualified }
    });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

module.exports = router;
