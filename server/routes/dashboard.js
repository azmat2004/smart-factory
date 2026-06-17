const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// 首页数据统计
router.get('/stats', async (req, res) => {
  try {
    const fid = req.factoryId;
    const now = new Date();
    const currentYear = now.getFullYear();

    // 设备统计
    const [eqTotal] = await query('SELECT COUNT(*) as cnt FROM t_equipment WHERE flag = 0 AND factory_id = ?', [fid]);
    const [eqRunning] = await query('SELECT COUNT(*) as cnt FROM t_equipment WHERE flag = 0 AND factory_id = ? AND equipment_status IN (10, 20)', [fid]);
    const [eqProcessing] = await query('SELECT COUNT(*) as cnt FROM t_equipment WHERE flag = 0 AND factory_id = ? AND equipment_status = 10', [fid]);
    const [eqFault] = await query('SELECT COUNT(*) as cnt FROM t_equipment WHERE flag = 0 AND factory_id = ? AND equipment_status = 30', [fid]);
    const [eqStandby] = await query('SELECT COUNT(*) as cnt FROM t_equipment WHERE flag = 0 AND factory_id = ? AND equipment_status = 20', [fid]);

    const totalEq = eqTotal[0]?.cnt || 1;
    const runningEq = eqRunning[0]?.cnt || 0;
    const processingEq = eqProcessing[0]?.cnt || 0;
    const faultEq = eqFault[0]?.cnt || 0;
    const standbyEq = eqStandby[0]?.cnt || 0;

    // 设备列表
    const [equipments] = await query(
      `SELECT e.*, (SELECT group_concat(p.product_name, ', ') FROM t_equipment_product ep
        LEFT JOIN t_product p ON ep.product_id = p.id AND p.flag = 0 WHERE ep.equipment_id = e.id) as product_names
       FROM t_equipment e WHERE e.flag = 0 AND e.factory_id = ? GROUP BY e.id`,
      [fid]
    );

    const enhancedEquipments = [];
    for (const eq of (equipments || [])) {
      const [activeSch] = await query(
        'SELECT id, schedule_seq FROM t_product_schedule WHERE equipment_id = ? AND schedule_status = 20 AND flag = 0 AND factory_id = ?',
        [eq.id, fid]
      );
      let runningStatus = '待机';
      if (eq.equipment_status === 30) runningStatus = '故障';
      else if (eq.equipment_status === 20) runningStatus = '停用';
      else if (activeSch && activeSch.length > 0) runningStatus = '加工中';
      enhancedEquipments.push({ ...eq, runningStatus });
    }

    // 订单统计
    const [orderTotal] = await query('SELECT COUNT(*) as cnt FROM t_product_order WHERE flag = 0 AND factory_id = ?', [fid]);
    const [orderAccepted] = await query('SELECT COUNT(*) as cnt FROM t_product_order WHERE flag = 0 AND factory_id = ? AND order_status = 20', [fid]);
    const [orderInProd] = await query('SELECT COUNT(*) as cnt FROM t_product_order WHERE flag = 0 AND factory_id = ? AND order_status = 40', [fid]);
    const [orderComplete] = await query('SELECT COUNT(*) as cnt FROM t_product_order WHERE flag = 0 AND factory_id = ? AND order_status = 50', [fid]);

    // 当前订单跟踪
    const [orderTracks] = await query(
      `SELECT ot.*, o.order_seq, p.product_name FROM t_order_track ot
       LEFT JOIN t_product_order o ON ot.schedule_id = o.id
       LEFT JOIN t_product p ON ot.product_id = p.id
       WHERE ot.flag = 0 AND ot.factory_id = ?`,
      [fid]
    );

    // 年度订单统计 - 使用 strftime for SQLite
    const [monthlyOrders] = await query(
      `SELECT CAST(strftime('%m', create_time) AS INTEGER) as month, order_status, COUNT(*) as cnt
       FROM t_product_order WHERE flag = 0 AND factory_id = ? AND CAST(strftime('%Y', create_time) AS INTEGER) = ?
       GROUP BY month, order_status`,
      [fid, currentYear]
    );

    // 组装月度数据
    const monthData = [];
    for (let m = 1; m <= 12; m++) {
      const accepted = (monthlyOrders || []).filter(o => o.month === m && o.order_status >= 20 && o.order_status !== 30).reduce((s, o) => s + o.cnt, 0);
      const planned = (monthlyOrders || []).filter(o => o.month === m && o.order_status >= 40).reduce((s, o) => s + o.cnt, 0);
      const completed = (monthlyOrders || []).filter(o => o.month === m && o.order_status === 50).reduce((s, o) => s + o.cnt, 0);
      monthData.push({ month: m, accepted, planned, completed });
    }

    // 近期报工记录
    const [recentWorks] = await query(
      `SELECT dw.*, s.schedule_seq, e.equipment_name, p.product_name FROM t_daily_work dw
       LEFT JOIN t_product_schedule s ON dw.schedule_id = s.id
       LEFT JOIN t_equipment e ON dw.equipment_id = e.id
       LEFT JOIN t_product p ON s.product_id = p.id
       WHERE dw.flag = 0 AND dw.factory_id = ? ORDER BY dw.create_time DESC LIMIT 10`,
      [fid]
    );

    res.json({
      status: 'success',
      data: {
        equipment: {
          total: totalEq, running: runningEq, processing: processingEq,
          standby: standbyEq, fault: faultEq,
          startupRate: totalEq > 0 ? Math.round((runningEq / totalEq) * 100) : 0,
          faultRate: totalEq > 0 ? Math.round((faultEq / totalEq) * 100) : 0,
          processingRate: totalEq > 0 ? Math.round((processingEq / totalEq) * 100) : 0,
          efficiency: runningEq > 0 ? Math.round((processingEq / runningEq) * 100) : 0,
          list: enhancedEquipments
        },
        orders: {
          total: orderTotal[0]?.cnt || 0,
          accepted: orderAccepted[0]?.cnt || 0,
          inProduction: orderInProd[0]?.cnt || 0,
          completed: orderComplete[0]?.cnt || 0,
          tracks: orderTracks || []
        },
        monthlyOrders: monthData,
        recentWorks: recentWorks || []
      }
    });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

module.exports = router;
