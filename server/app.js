const express = require('express');
const cors = require('cors');
const path = require('path');
const { authMiddleware } = require('./middleware/auth');
const { db } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-initialize SQLite database
function ensureDatabase() {
  console.log('[DB] 开始检查数据库...');

  const tables = [
    ['t_factory', `CREATE TABLE IF NOT EXISTS t_factory (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, bak TEXT, factory_name TEXT, factory_img_url TEXT, factory_addr TEXT, factory_url TEXT, factory_worker INTEGER, factory_status INTEGER DEFAULT 0)`],
    ['t_user_role', `CREATE TABLE IF NOT EXISTS t_user_role (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, role_desc TEXT, role_name TEXT, role_status INTEGER DEFAULT 0, factory_id INTEGER)`],
    ['t_user', `CREATE TABLE IF NOT EXISTS t_user (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, user_status INTEGER DEFAULT 0, user_name TEXT NOT NULL, user_real_name TEXT, user_passwd TEXT NOT NULL, user_job_num TEXT, user_phone_num TEXT, user_email TEXT, role_id INTEGER, factory_id INTEGER NOT NULL)`],
    ['t_product', `CREATE TABLE IF NOT EXISTS t_product (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, product_num TEXT NOT NULL, product_name TEXT NOT NULL, product_img_url TEXT, factory_id INTEGER NOT NULL)`],
    ['t_equipment', `CREATE TABLE IF NOT EXISTS t_equipment (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, equipment_seq TEXT NOT NULL, equipment_name TEXT, equipment_img_url TEXT, equipment_status INTEGER DEFAULT 10, factory_id INTEGER NOT NULL)`],
    ['t_equipment_product', `CREATE TABLE IF NOT EXISTS t_equipment_product (id INTEGER PRIMARY KEY AUTOINCREMENT, equipment_id INTEGER NOT NULL, product_id INTEGER NOT NULL, yield INTEGER, unit INTEGER, factory_id INTEGER NOT NULL)`],
    ['t_product_order', `CREATE TABLE IF NOT EXISTS t_product_order (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, order_seq TEXT NOT NULL, order_source INTEGER DEFAULT 1, product_id INTEGER, product_count INTEGER NOT NULL, end_date TEXT NOT NULL, order_status INTEGER DEFAULT 10, factory_id INTEGER NOT NULL, factory_yield INTEGER)`],
    ['t_product_plan', `CREATE TABLE IF NOT EXISTS t_product_plan (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, plan_seq TEXT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, plan_count INTEGER, delivery_date TEXT, plan_start_date TEXT, plan_end_date TEXT, plan_status INTEGER DEFAULT 10, factory_id INTEGER NOT NULL)`],
    ['t_product_schedule', `CREATE TABLE IF NOT EXISTS t_product_schedule (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, schedule_seq TEXT, schedule_count INTEGER, schedule_status INTEGER DEFAULT 10, plan_id INTEGER NOT NULL, product_id INTEGER NOT NULL, equipment_id INTEGER, start_date TEXT, end_date TEXT, factory_id INTEGER NOT NULL)`],
    ['t_order_track', `CREATE TABLE IF NOT EXISTS t_order_track (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, schedule_id INTEGER, plan_id INTEGER, product_id INTEGER, working_count INTEGER DEFAULT 0, qualified_count INTEGER DEFAULT 0, factory_id INTEGER NOT NULL)`],
    ['t_daily_work', `CREATE TABLE IF NOT EXISTS t_daily_work (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, schedule_id INTEGER NOT NULL, equipment_id INTEGER, equipment_seq TEXT, start_time TEXT, end_time TEXT, working_count INTEGER, qualified_count INTEGER, unqualified_cout INTEGER, complete_flag INTEGER DEFAULT 1, factory_id INTEGER NOT NULL, bak TEXT)`],
    ['t_permit', `CREATE TABLE IF NOT EXISTS t_permit (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, status INTEGER DEFAULT 0, parent_id INTEGER, permit_name TEXT, permit_desc TEXT, permit_path TEXT)`],
    ['t_role_permit', `CREATE TABLE IF NOT EXISTS t_role_permit (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER DEFAULT 0, create_time TEXT, create_userid INTEGER, update_time TEXT, update_userid INTEGER, factory_id INTEGER, role_id INTEGER, permit_id INTEGER)`]
  ];

  // Create tables one by one with error handling
  for (const [name, sql] of tables) {
    try {
      db.exec(sql);
      console.log('[DB] 表 ' + name + ' 就绪');
    } catch (e) {
      console.error('[DB] 创建表 ' + name + ' 失败: ' + e.message);
    }
  }

  // Create indexes
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_pn ON t_product(product_num)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_os ON t_product_order(order_seq)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_ps ON t_product_plan(plan_seq)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_ot ON t_order_track(schedule_id)'); } catch(e) {}

  // Check if seed data exists
  try {
    const userCheck = db.prepare('SELECT id FROM t_user WHERE user_name = ?').get('admin');
    if (userCheck) {
      console.log('[DB] 管理员账户已存在，跳过数据插入');
      return;
    }
  } catch (e) {
    console.error('[DB] 检查用户失败: ' + e.message);
  }

  console.log('[DB] 正在插入初始数据...');
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const inserts = [
    `INSERT OR IGNORE INTO t_factory (id,flag,create_time,create_userid,bak,factory_name,factory_img_url,factory_addr,factory_url,factory_worker,factory_status) VALUES (1,0,'2018-03-02 16:48:51',1,NULL,'科技工厂','/uploads/default/noImage.png','沈阳','www.gc.com',10,0)`,
    `INSERT OR IGNORE INTO t_user_role (id,flag,create_time,create_userid,role_desc,role_name,role_status,factory_id) VALUES (1,0,'2018-03-02 16:51:46',1,'管理员','管理员',0,1)`,
    `INSERT OR IGNORE INTO t_user_role (id,flag,create_time,create_userid,role_desc,role_name,role_status,factory_id) VALUES (2,0,'${now}',1,'订单管理员','订单管理员',0,1)`,
    `INSERT OR IGNORE INTO t_user_role (id,flag,create_time,create_userid,role_desc,role_name,role_status,factory_id) VALUES (3,0,'${now}',1,'计划管理员','计划管理员',0,1)`,
    `INSERT OR IGNORE INTO t_user_role (id,flag,create_time,create_userid,role_desc,role_name,role_status,factory_id) VALUES (4,0,'${now}',1,'调度管理员','调度管理员',0,1)`,
    `INSERT OR IGNORE INTO t_user_role (id,flag,create_time,create_userid,role_desc,role_name,role_status,factory_id) VALUES (5,0,'${now}',1,'生产员工','生产员工',0,1)`,
    `INSERT OR IGNORE INTO t_user (id,flag,create_time,create_userid,user_status,user_name,user_real_name,user_passwd,user_job_num,user_phone_num,user_email,role_id,factory_id) VALUES (1,0,'2018-03-02 16:50:36',1,0,'admin','管理员','123456','1001','18902401001','mgr@test.com',1,1)`,
    `INSERT OR IGNORE INTO t_product (id,flag,create_time,create_userid,update_time,update_userid,product_num,product_name,product_img_url,factory_id) VALUES (1,0,'2018-03-02 00:55:53',1,'2018-03-12 18:24:20',1,'CP201803020001','产品一','/uploads/default/product.png',1)`,
    `INSERT OR IGNORE INTO t_product (id,flag,create_time,create_userid,update_time,update_userid,product_num,product_name,product_img_url,factory_id) VALUES (2,0,'2018-03-02 00:56:34',1,'2018-03-07 21:39:00',1,'CP201803020002','产品二','/uploads/default/product.png',1)`,
    `INSERT OR IGNORE INTO t_product (id,flag,create_time,create_userid,update_time,update_userid,product_num,product_name,product_img_url,factory_id) VALUES (3,0,'2018-03-02 00:56:42',1,'2018-03-07 21:39:09',1,'CP201803020003','产品三','/uploads/default/product.png',1)`,
    `INSERT OR IGNORE INTO t_product (id,flag,create_time,create_userid,update_time,update_userid,product_num,product_name,product_img_url,factory_id) VALUES (4,0,'2018-03-02 00:56:49',1,'2018-03-07 21:39:22',1,'CP201803020004','产品四','/uploads/default/product.png',1)`,
    `INSERT OR IGNORE INTO t_equipment (id,flag,create_time,create_userid,update_time,update_userid,equipment_seq,equipment_name,equipment_img_url,equipment_status,factory_id) VALUES (1,0,'2018-03-02 00:55:22',1,'2018-03-09 14:45:30',1,'RQQ001','设备一','/uploads/default/equipment.png',10,1)`,
    `INSERT OR IGNORE INTO t_equipment (id,flag,create_time,create_userid,update_time,update_userid,equipment_seq,equipment_name,equipment_img_url,equipment_status,factory_id) VALUES (2,0,'2018-03-02 01:03:48',1,'2018-03-07 21:39:46',1,'RQQ002','设备二','/uploads/default/equipment.png',10,1)`,
    `INSERT OR IGNORE INTO t_equipment (id,flag,create_time,create_userid,update_time,update_userid,equipment_seq,equipment_name,equipment_img_url,equipment_status,factory_id) VALUES (3,0,'2018-03-02 01:03:59',1,'2018-03-07 21:39:53',1,'RQQ003','设备三','/uploads/default/equipment.png',10,1)`,
    `INSERT OR IGNORE INTO t_equipment (id,flag,create_time,create_userid,update_time,update_userid,equipment_seq,equipment_name,equipment_img_url,equipment_status,factory_id) VALUES (4,0,'2018-03-02 01:04:11',1,'2018-03-07 23:48:56',1,'RQQ004','设备四','/uploads/default/equipment.png',10,1)`,
    `INSERT OR IGNORE INTO t_equipment_product (id,equipment_id,product_id,yield,unit,factory_id) VALUES (10,2,1,100,NULL,1)`,
    `INSERT OR IGNORE INTO t_equipment_product (id,equipment_id,product_id,yield,unit,factory_id) VALUES (11,3,1,100,NULL,1)`,
    `INSERT OR IGNORE INTO t_equipment_product (id,equipment_id,product_id,yield,unit,factory_id) VALUES (13,4,4,100,NULL,1)`,
    `INSERT OR IGNORE INTO t_equipment_product (id,equipment_id,product_id,yield,unit,factory_id) VALUES (14,1,4,100,NULL,1)`,
    `INSERT OR IGNORE INTO t_equipment_product (id,equipment_id,product_id,yield,unit,factory_id) VALUES (15,2,2,100,NULL,1)`,
    `INSERT OR IGNORE INTO t_equipment_product (id,equipment_id,product_id,yield,unit,factory_id) VALUES (16,1,1,100,NULL,1)`,
    `INSERT OR IGNORE INTO t_product_order (id,flag,create_time,create_userid,order_seq,order_source,product_id,product_count,end_date,order_status,factory_id,factory_yield) VALUES (1,0,'2018-03-02 17:05:04',1,'LG001',1,1,1000,'2018-04-30',20,1,500)`,
    `INSERT OR IGNORE INTO t_product_order (id,flag,create_time,create_userid,order_seq,order_source,product_id,product_count,end_date,order_status,factory_id,factory_yield) VALUES (2,0,'2018-03-02 17:06:27',1,'XS002',1,1,2000,'2018-04-30',20,1,500)`,
    `INSERT OR IGNORE INTO t_product_order (id,flag,create_time,create_userid,order_seq,order_source,product_id,product_count,end_date,order_status,factory_id,factory_yield) VALUES (3,0,'2018-03-09 15:56:20',1,'OS003',1,2,3000,'2018-04-30',20,1,500)`,
    `INSERT OR IGNORE INTO t_product_order (id,flag,create_time,create_userid,order_seq,order_source,product_id,product_count,end_date,order_status,factory_id,factory_yield) VALUES (4,0,'2018-03-09 15:56:22',1,'XX004',1,2,4000,'2018-04-30',20,1,500)`,
    `INSERT OR IGNORE INTO t_product_order (id,flag,create_time,create_userid,order_seq,order_source,product_id,product_count,end_date,order_status,factory_id,factory_yield) VALUES (5,0,'2018-03-09 15:58:09',1,'LT005',1,3,5000,'2018-04-30',20,1,500)`
  ];

  let inserted = 0, failed = 0;
  for (const sql of inserts) {
    try {
      const r = db.prepare(sql).run();
      if (r.changes > 0) inserted++;
    } catch (e) {
      failed++;
      console.error('[DB] 插入失败: ' + e.message.substring(0, 80));
    }
  }
  console.log('[DB] 初始化完成! 插入 ' + inserted + ' 条, 失败 ' + failed + ' 条. 管理员: admin / 123456');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Public routes (no auth needed)
app.use('/api/auth', require('./routes/auth'));

// Protected routes (auth middleware)
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));
app.use('/api/product', authMiddleware, require('./routes/product'));
app.use('/api/equipment', authMiddleware, require('./routes/equipment'));
app.use('/api/order', authMiddleware, require('./routes/order'));
app.use('/api/plan', authMiddleware, require('./routes/plan'));
app.use('/api/schedule', authMiddleware, require('./routes/schedule'));
app.use('/api/track', authMiddleware, require('./routes/track'));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

try {
  ensureDatabase();
  // Verify tables were created
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='t_user'").get();
  if (tableCheck) {
    console.log('[DB] 验证通过: t_user 表存在');
  } else {
    console.error('[DB] 严重错误: t_user 表不存在，数据库初始化可能未执行!');
  }
} catch (e) {
  console.error('[DB] 数据库初始化异常: ' + e.message);
  console.error('[DB] 堆栈: ' + e.stack);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`智能工厂云平台服务已启动: http://0.0.0.0:${PORT}`);
});
