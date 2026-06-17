const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'db_factory.sqlite');

// Remove existing DB if present
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Removed existing database.');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Creating database tables...');

db.exec(`
CREATE TABLE t_factory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  bak TEXT,
  factory_name TEXT,
  factory_img_url TEXT,
  factory_addr TEXT,
  factory_url TEXT,
  factory_worker INTEGER,
  factory_status INTEGER DEFAULT 0
);

CREATE TABLE t_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  user_status INTEGER DEFAULT 0,
  user_name TEXT NOT NULL,
  user_real_name TEXT,
  user_passwd TEXT NOT NULL,
  user_job_num TEXT,
  user_phone_num TEXT,
  user_email TEXT,
  role_id INTEGER,
  factory_id INTEGER NOT NULL
);

CREATE TABLE t_user_role (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  role_desc TEXT,
  role_name TEXT,
  role_status INTEGER DEFAULT 0,
  factory_id INTEGER
);

CREATE TABLE t_permit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  status INTEGER DEFAULT 0,
  parent_id INTEGER,
  permit_name TEXT,
  permit_desc TEXT,
  permit_path TEXT
);

CREATE TABLE t_role_permit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  factory_id INTEGER,
  role_id INTEGER,
  permit_id INTEGER
);

CREATE TABLE t_product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  product_num TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_img_url TEXT,
  factory_id INTEGER NOT NULL
);
CREATE INDEX idx_product_name ON t_product(product_num);
CREATE INDEX idx_product_num ON t_product(product_num);

CREATE TABLE t_equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  equipment_seq TEXT NOT NULL,
  equipment_name TEXT,
  equipment_img_url TEXT,
  equipment_status INTEGER DEFAULT 10,
  factory_id INTEGER NOT NULL
);

CREATE TABLE t_equipment_product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  yield INTEGER,
  unit INTEGER,
  factory_id INTEGER NOT NULL
);

CREATE TABLE t_product_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  order_seq TEXT NOT NULL,
  order_source INTEGER DEFAULT 1,
  product_id INTEGER,
  product_count INTEGER NOT NULL,
  end_date TEXT NOT NULL,
  order_status INTEGER DEFAULT 10,
  factory_id INTEGER NOT NULL,
  factory_yield INTEGER
);
CREATE INDEX idx_order_seq ON t_product_order(order_seq);

CREATE TABLE t_product_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  plan_seq TEXT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  plan_count INTEGER,
  delivery_date TEXT,
  plan_start_date TEXT,
  plan_end_date TEXT,
  plan_status INTEGER DEFAULT 10,
  factory_id INTEGER NOT NULL
);
CREATE INDEX idx_plan_seq ON t_product_plan(plan_seq);

CREATE TABLE t_product_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  schedule_seq TEXT,
  schedule_count INTEGER,
  schedule_status INTEGER DEFAULT 10,
  plan_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  equipment_id INTEGER,
  start_date TEXT,
  end_date TEXT,
  factory_id INTEGER NOT NULL
);

CREATE TABLE t_order_track (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  schedule_id INTEGER,
  plan_id INTEGER,
  product_id INTEGER,
  working_count INTEGER DEFAULT 0,
  qualified_count INTEGER DEFAULT 0,
  factory_id INTEGER NOT NULL
);
CREATE INDEX idx_track_schedule ON t_order_track(schedule_id);

CREATE TABLE t_daily_work (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag INTEGER DEFAULT 0,
  create_time TEXT,
  create_userid INTEGER,
  update_time TEXT,
  update_userid INTEGER,
  schedule_id INTEGER NOT NULL,
  equipment_id INTEGER,
  equipment_seq TEXT,
  start_time TEXT,
  end_time TEXT,
  working_count INTEGER,
  qualified_count INTEGER,
  unqualified_cout INTEGER,
  complete_flag INTEGER DEFAULT 1,
  factory_id INTEGER NOT NULL,
  bak TEXT
);
`);

console.log('Tables created. Inserting sample data...');

db.exec(`
INSERT INTO t_factory (id,flag,create_time,create_userid,update_time,update_userid,bak,factory_name,factory_img_url,factory_addr,factory_url,factory_worker,factory_status)
VALUES (1,0,'2018-03-02 16:48:51',1,NULL,NULL,NULL,'科技工厂','/uploads/default/noImage.png','沈阳','www.gc.com',10,0);

INSERT INTO t_user_role (id,flag,create_time,create_userid,update_time,update_userid,role_desc,role_name,role_status,factory_id) VALUES
(1,0,'2018-03-02 16:51:46',1,NULL,NULL,'管理员','管理员',0,1),
(2,0,datetime('now'),1,NULL,NULL,'订单管理员','订单管理员',0,1),
(3,0,datetime('now'),1,NULL,NULL,'计划管理员','计划管理员',0,1),
(4,0,datetime('now'),1,NULL,NULL,'调度管理员','调度管理员',0,1),
(5,0,datetime('now'),1,NULL,NULL,'生产员工','生产员工',0,1);

INSERT INTO t_user (id,flag,create_time,create_userid,update_time,update_userid,user_status,user_name,user_real_name,user_passwd,user_job_num,user_phone_num,user_email,role_id,factory_id)
VALUES (1,0,'2018-03-02 16:50:36',1,NULL,NULL,0,'admin','管理员','123456','1001','18902401001','mgr@test.com',1,1);

INSERT INTO t_product (id,flag,create_time,create_userid,update_time,update_userid,product_num,product_name,product_img_url,factory_id) VALUES
(1,0,'2018-03-02 00:55:53',1,'2018-03-12 18:24:20',1,'CP201803020001','产品一','/uploads/default/product.png',1),
(2,0,'2018-03-02 00:56:34',1,'2018-03-07 21:39:00',1,'CP201803020002','产品二','/uploads/default/product.png',1),
(3,0,'2018-03-02 00:56:42',1,'2018-03-07 21:39:09',1,'CP201803020003','产品三','/uploads/default/product.png',1),
(4,0,'2018-03-02 00:56:49',1,'2018-03-07 21:39:22',1,'CP201803020004','产品四','/uploads/default/product.png',1);

INSERT INTO t_equipment (id,flag,create_time,create_userid,update_time,update_userid,equipment_seq,equipment_name,equipment_img_url,equipment_status,factory_id) VALUES
(1,0,'2018-03-02 00:55:22',1,'2018-03-09 14:45:30',1,'RQQ001','设备一','/uploads/default/equipment.png',10,1),
(2,0,'2018-03-02 01:03:48',1,'2018-03-07 21:39:46',1,'RQQ002','设备二','/uploads/default/equipment.png',10,1),
(3,0,'2018-03-02 01:03:59',1,'2018-03-07 21:39:53',1,'RQQ003','设备三','/uploads/default/equipment.png',10,1),
(4,0,'2018-03-02 01:04:11',1,'2018-03-07 23:48:56',1,'RQQ004','设备四','/uploads/default/equipment.png',10,1);

INSERT INTO t_equipment_product (id,equipment_id,product_id,yield,unit,factory_id) VALUES
(10,2,1,100,NULL,1),(11,3,1,100,NULL,1),(13,4,4,100,NULL,1),(14,1,4,100,NULL,1),(15,2,2,100,NULL,1),(16,1,1,100,NULL,1);

INSERT INTO t_product_order (id,flag,create_time,create_userid,update_time,update_userid,order_seq,order_source,product_id,product_count,end_date,order_status,factory_id,factory_yield) VALUES
(1,0,'2018-03-02 17:05:04',1,NULL,NULL,'LG001',1,1,1000,'2018-04-30',20,1,500),
(2,0,'2018-03-02 17:06:27',1,NULL,NULL,'XS002',1,1,2000,'2018-04-30',20,1,500),
(3,0,'2018-03-09 15:56:20',1,NULL,NULL,'OS003',1,2,3000,'2018-04-30',20,1,500),
(4,0,'2018-03-09 15:56:22',1,NULL,NULL,'XX004',1,2,4000,'2018-04-30',20,1,500),
(5,0,'2018-03-09 15:58:09',1,NULL,NULL,'LT005',1,3,5000,'2018-04-30',20,1,500);
`);

console.log('Database initialized successfully at:', dbPath);
console.log('Default login: admin / 123456');
db.close();
