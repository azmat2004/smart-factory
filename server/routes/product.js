const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { getNow, generateSeq } = require('../utils/helpers');

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/uploads/product');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// 查询产品列表
router.get('/list', async (req, res) => {
  try {
    const { productName, page = 1, pageSize = 10 } = req.query;
    let sql = `SELECT p.*, f.factory_name FROM t_product p LEFT JOIN t_factory f ON p.factory_id = f.id WHERE p.flag = 0 AND p.factory_id = ?`;
    const params = [req.factoryId];
    if (productName) {
      sql += ` AND p.product_name LIKE ?`;
      params.push(`%${productName}%`);
    }

    // 总数
    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ` ORDER BY p.create_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    const [rows] = await pool.query(sql, params);

    // 获取每个产品的关联订单数(已接单及以上)
    for (let row of rows) {
      const [oRows] = await pool.query(
        `SELECT COUNT(*) as cnt FROM t_product_order WHERE product_id = ? AND flag = 0 AND order_status IN (20, 40)`,
        [row.id]
      );
      row.orderCount = oRows[0].cnt;
    }

    res.json({ status: 'success', data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 获取所有产品（下拉框用）
router.get('/all', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, product_num, product_name FROM t_product WHERE flag = 0 AND factory_id = ? ORDER BY create_time DESC', [req.factoryId]);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 上传产品图片
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ status: 'error', msg: '未选择文件' });
    const url = '/uploads/product/' + req.file.filename;
    res.json({ status: 'success', msg: url });
  } catch (err) {
    res.json({ status: 'error', msg: err.message });
  }
});

// 添加产品
router.post('/add', async (req, res) => {
  try {
    const { productName, productImgUrl } = req.body;
    if (!productName) return res.json({ status: 'error', msg: '产品名称不能为空' });
    // 同名检查
    const [dup] = await pool.query('SELECT id FROM t_product WHERE product_name = ? AND factory_id = ? AND flag = 0', [productName, req.factoryId]);
    if (dup.length > 0) return res.json({ status: 'error', msg: '同一工厂产品不可重名' });
    const now = getNow();
    const productNum = generateSeq('CP');
    await pool.query(
      `INSERT INTO t_product (flag, create_time, create_userid, product_num, product_name, product_img_url, factory_id)
       VALUES (0, ?, ?, ?, ?, ?, ?)`,
      [now, req.user.id, productNum, productName, productImgUrl || '/uploads/default/product.png', req.factoryId]
    );
    res.json({ status: 'success', msg: '产品添加成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '添加失败: ' + err.message });
  }
});

// 编辑产品
router.post('/edit', async (req, res) => {
  try {
    const { id, productName, productImgUrl } = req.body;
    if (!id) return res.json({ status: 'error', msg: '参数错误' });
    if (!productName) return res.json({ status: 'error', msg: '产品名称不能为空' });
    // 同名检查(排除自己)
    const [dup] = await pool.query('SELECT id FROM t_product WHERE product_name = ? AND factory_id = ? AND flag = 0 AND id != ?', [productName, req.factoryId, id]);
    if (dup.length > 0) return res.json({ status: 'error', msg: '同一工厂产品不可重名' });
    await pool.query(
      `UPDATE t_product SET product_name = ?, product_img_url = ?, update_time = ?, update_userid = ? WHERE id = ?`,
      [productName, productImgUrl, getNow(), req.user.id, id]
    );
    res.json({ status: 'success', msg: '产品修改成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '修改失败: ' + err.message });
  }
});

// 删除产品
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    // 检查关联订单
    const [orders] = await pool.query(
      `SELECT COUNT(*) as cnt FROM t_product_order WHERE product_id = ? AND flag = 0 AND order_status IN (20, 40)`,
      [id]
    );
    if (orders[0].cnt > 0) {
      return res.json({ status: 'error', msg: '存在关联的已接单订单，不可删除' });
    }
    await pool.query(`UPDATE t_product SET flag = 1, update_time = ? WHERE id = ?`, [getNow(), id]);
    res.json({ status: 'success', msg: '产品删除成功' });
  } catch (err) {
    res.json({ status: 'error', msg: '删除失败: ' + err.message });
  }
});

module.exports = router;
