-- 东软智能制造云平台 数据库初始化脚本
-- Database: db_factory

CREATE DATABASE IF NOT EXISTS `db_factory` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `db_factory`;

-- 工厂定义表
DROP TABLE IF EXISTS `t_factory`;
CREATE TABLE `t_factory` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '工厂ID',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `bak` varchar(500) DEFAULT NULL COMMENT '备注',
  `factory_name` varchar(500) DEFAULT NULL COMMENT '工厂名称',
  `factory_img_url` varchar(500) DEFAULT NULL COMMENT '工厂图片',
  `factory_addr` varchar(500) DEFAULT NULL COMMENT '工厂地址',
  `factory_url` varchar(200) DEFAULT NULL COMMENT '工厂网址',
  `factory_worker` int(11) DEFAULT NULL COMMENT '工厂人数',
  `factory_status` int(11) DEFAULT NULL COMMENT '工厂状态 0:正常 1:关闭',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

-- 用户表
DROP TABLE IF EXISTS `t_user`;
CREATE TABLE `t_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '注册时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `user_status` int(11) DEFAULT NULL COMMENT '用户状态 0:正常 1:锁定',
  `user_name` varchar(50) NOT NULL COMMENT '用户名',
  `user_real_name` varchar(100) DEFAULT NULL COMMENT '用户姓名',
  `user_passwd` varchar(100) NOT NULL COMMENT '用户密码',
  `user_job_num` varchar(100) DEFAULT NULL COMMENT '用户工号',
  `user_phone_num` char(11) DEFAULT NULL COMMENT '用户手机号',
  `user_email` varchar(100) DEFAULT NULL COMMENT '用户email',
  `role_id` int(11) DEFAULT NULL COMMENT '角色ID',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 角色表
DROP TABLE IF EXISTS `t_user_role`;
CREATE TABLE `t_user_role` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `role_desc` varchar(500) DEFAULT NULL COMMENT '角色描述',
  `role_name` varchar(300) DEFAULT NULL COMMENT '角色名称',
  `role_status` int(11) DEFAULT NULL COMMENT '角色状态 0:正常 1:禁用',
  `factory_id` int(11) DEFAULT NULL COMMENT '工厂ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

-- 权限表
DROP TABLE IF EXISTS `t_permit`;
CREATE TABLE `t_permit` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `status` int(11) DEFAULT NULL COMMENT '权限状态 0:正常 1:停用',
  `parent_id` int(11) DEFAULT NULL COMMENT '权限父ID',
  `permit_name` varchar(300) DEFAULT NULL COMMENT '权限名称',
  `permit_desc` varchar(300) DEFAULT NULL COMMENT '权限描述',
  `permit_path` varchar(300) DEFAULT NULL COMMENT '校验地址',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 角色权限对应表
DROP TABLE IF EXISTS `t_role_permit`;
CREATE TABLE `t_role_permit` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `factory_id` int(11) DEFAULT NULL COMMENT '工厂ID',
  `role_id` int(11) DEFAULT NULL COMMENT '角色ID',
  `permit_id` int(11) DEFAULT NULL COMMENT '权限ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 产品表
DROP TABLE IF EXISTS `t_product`;
CREATE TABLE `t_product` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `product_num` varchar(200) NOT NULL COMMENT '产品编号',
  `product_name` varchar(300) NOT NULL COMMENT '产品名称',
  `product_img_url` varchar(300) DEFAULT NULL COMMENT '产品图片所在目录',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  PRIMARY KEY (`id`),
  KEY `Index_product_name` (`product_num`),
  KEY `Index_product_num` (`product_num`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COMMENT='用于定义产品';

-- 设备表
DROP TABLE IF EXISTS `t_equipment`;
CREATE TABLE `t_equipment` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:失效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `equipment_seq` varchar(200) NOT NULL COMMENT '设备序号',
  `equipment_name` varchar(300) DEFAULT NULL COMMENT '设备名称',
  `equipment_img_url` varchar(300) DEFAULT NULL COMMENT '设备图片',
  `equipment_status` int(11) DEFAULT '10' COMMENT '设备状态 10:启用 20:停用 30:故障',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

-- 设备与产品对应表
DROP TABLE IF EXISTS `t_equipment_product`;
CREATE TABLE `t_equipment_product` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `equipment_id` int(11) NOT NULL COMMENT '设备ID',
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `yield` int(11) DEFAULT NULL COMMENT '产能',
  `unit` int(11) DEFAULT NULL COMMENT '产能单位 10:天 20:月 30:年 40:小时',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COMMENT='设备与产品对应表';

-- 产品订单表
DROP TABLE IF EXISTS `t_product_order`;
CREATE TABLE `t_product_order` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `order_seq` varchar(200) NOT NULL COMMENT '订单编号',
  `order_source` int(11) DEFAULT NULL COMMENT '订单来源 1:线下',
  `product_id` int(11) DEFAULT NULL COMMENT '产品ID',
  `product_count` int(11) NOT NULL COMMENT '产品数量',
  `end_date` date NOT NULL COMMENT '订单截止日期',
  `order_status` int(11) NOT NULL DEFAULT '10' COMMENT '订单状态 10:未接单 20:已接单 30:已拒绝 40:生产中 50:订单完成',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  `factory_yield` int(11) DEFAULT NULL COMMENT '工厂产能',
  PRIMARY KEY (`id`),
  KEY `Index_order_seq` (`order_seq`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 生产计划表
DROP TABLE IF EXISTS `t_product_plan`;
CREATE TABLE `t_product_plan` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `plan_seq` varchar(200) DEFAULT NULL COMMENT '计划编号',
  `order_id` int(11) NOT NULL COMMENT '订单ID',
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `plan_count` int(11) DEFAULT NULL COMMENT '计划数量',
  `delivery_date` date DEFAULT NULL COMMENT '交货日期',
  `plan_start_date` date DEFAULT NULL COMMENT '计划开始日期',
  `plan_end_date` date DEFAULT NULL COMMENT '计划结束日期',
  `plan_status` int(11) DEFAULT '10' COMMENT '计划状态 10:未启动 20:已启动 30:已完成',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  PRIMARY KEY (`id`),
  KEY `Index_plan_seq` (`plan_seq`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COMMENT='生产计划表';

-- 生产调度表（工单表）
DROP TABLE IF EXISTS `t_product_schedule`;
CREATE TABLE `t_product_schedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `schedule_seq` varchar(200) DEFAULT NULL COMMENT '工单编号',
  `schedule_count` int(11) DEFAULT NULL COMMENT '工单数量',
  `schedule_status` int(11) NOT NULL DEFAULT '10' COMMENT '工单状态 10:未开始 20:生产中 30:已完成',
  `plan_id` int(11) NOT NULL COMMENT '计划ID',
  `product_id` int(11) NOT NULL COMMENT '产品ID',
  `equipment_id` int(11) DEFAULT NULL COMMENT '设备ID',
  `start_date` date DEFAULT NULL COMMENT '开始日期',
  `end_date` date DEFAULT NULL COMMENT '结束日期',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COMMENT='生产调度表';

-- 订单跟踪表
DROP TABLE IF EXISTS `t_order_track`;
CREATE TABLE `t_order_track` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `schedule_id` int(11) DEFAULT NULL COMMENT '调度id',
  `plan_id` int(11) DEFAULT NULL COMMENT '计划id',
  `product_id` int(11) DEFAULT NULL COMMENT '产品id',
  `working_count` int(11) DEFAULT NULL COMMENT '加工数量',
  `qualified_count` int(11) DEFAULT '0' COMMENT '合格数',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  PRIMARY KEY (`id`),
  KEY `Index_schedule_seq` (`schedule_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COMMENT='订单跟踪表';

-- 报工表（日常工作报告表）
DROP TABLE IF EXISTS `t_daily_work`;
CREATE TABLE `t_daily_work` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID标识',
  `flag` int(11) DEFAULT '0' COMMENT '有效标识 0:有效 1:无效',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `create_userid` int(11) DEFAULT NULL COMMENT '创建人ID',
  `update_time` datetime DEFAULT NULL COMMENT '修改时间',
  `update_userid` int(11) DEFAULT NULL COMMENT '修改人ID',
  `schedule_id` int(11) NOT NULL COMMENT '调度ID',
  `equipment_id` int(11) DEFAULT NULL COMMENT '设备id',
  `equipment_seq` varchar(200) DEFAULT NULL COMMENT '设备序号',
  `start_time` datetime DEFAULT NULL COMMENT '加工开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '加工结束时间',
  `working_count` int(11) DEFAULT NULL COMMENT '加工数量',
  `qualified_count` int(11) DEFAULT NULL COMMENT '合格数量',
  `unqualified_cout` int(11) DEFAULT NULL COMMENT '不合格数量',
  `complete_flag` int(11) DEFAULT '1' COMMENT '结束报工标识 0:是 1:否',
  `factory_id` int(11) NOT NULL COMMENT '工厂ID',
  `bak` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============= 初始数据 =============

INSERT INTO `t_factory` (`id`,`flag`,`create_time`,`create_userid`,`update_time`,`update_userid`,`bak`,`factory_name`,`factory_img_url`,`factory_addr`,`factory_url`,`factory_worker`,`factory_status`)
VALUES (1,0,'2018-03-02 16:48:51',1,NULL,NULL,NULL,'科技工厂','/uploads/default/noImage.png','沈阳','www.gc.com',10,0);

INSERT INTO `t_user_role` (`id`,`flag`,`create_time`,`create_userid`,`update_time`,`update_userid`,`role_desc`,`role_name`,`role_status`,`factory_id`)
VALUES
(1,0,'2018-03-02 16:51:46',1,NULL,NULL,'管理员','管理员',0,1),
(2,0,NOW(),1,NULL,NULL,'订单管理员','订单管理员',0,1),
(3,0,NOW(),1,NULL,NULL,'计划管理员','计划管理员',0,1),
(4,0,NOW(),1,NULL,NULL,'调度管理员','调度管理员',0,1),
(5,0,NOW(),1,NULL,NULL,'生产员工','生产员工',0,1);

INSERT INTO `t_user` (`id`,`flag`,`create_time`,`create_userid`,`update_time`,`update_userid`,`user_status`,`user_name`,`user_real_name`,`user_passwd`,`user_job_num`,`user_phone_num`,`user_email`,`role_id`,`factory_id`)
VALUES (1,0,'2018-03-02 16:50:36',1,NULL,NULL,0,'admin','管理员','123456','1001','18902401001','mgr@test.com',1,1);

INSERT INTO `t_product` (`id`,`flag`,`create_time`,`create_userid`,`update_time`,`update_userid`,`product_num`,`product_name`,`product_img_url`,`factory_id`)
VALUES
(1,0,'2018-03-02 00:55:53',1,'2018-03-12 18:24:20',1,'CP201803020001','产品一','/uploads/default/product.png',1),
(2,0,'2018-03-02 00:56:34',1,'2018-03-07 21:39:00',1,'CP201803020002','产品二','/uploads/default/product.png',1),
(3,0,'2018-03-02 00:56:42',1,'2018-03-07 21:39:09',1,'CP201803020003','产品三','/uploads/default/product.png',1),
(4,0,'2018-03-02 00:56:49',1,'2018-03-07 21:39:22',1,'CP201803020004','产品四','/uploads/default/product.png',1);

INSERT INTO `t_equipment` (`id`,`flag`,`create_time`,`create_userid`,`update_time`,`update_userid`,`equipment_seq`,`equipment_name`,`equipment_img_url`,`equipment_status`,`factory_id`)
VALUES
(1,0,'2018-03-02 00:55:22',1,'2018-03-09 14:45:30',1,'RQQ001','设备一','/uploads/default/equipment.png',10,1),
(2,0,'2018-03-02 01:03:48',1,'2018-03-07 21:39:46',1,'RQQ002','设备二','/uploads/default/equipment.png',10,1),
(3,0,'2018-03-02 01:03:59',1,'2018-03-07 21:39:53',1,'RQQ003','设备三','/uploads/default/equipment.png',10,1),
(4,0,'2018-03-02 01:04:11',1,'2018-03-07 23:48:56',1,'RQQ004','设备四','/uploads/default/equipment.png',10,1);

INSERT INTO `t_equipment_product` (`id`,`equipment_id`,`product_id`,`yield`,`unit`,`factory_id`)
VALUES
(10,2,1,100,NULL,1),(11,3,1,100,NULL,1),(13,4,4,100,NULL,1),
(14,1,4,100,NULL,1),(15,2,2,100,NULL,1),(16,1,1,100,NULL,1);

INSERT INTO `t_product_order` (`id`,`flag`,`create_time`,`create_userid`,`update_time`,`update_userid`,`order_seq`,`order_source`,`product_id`,`product_count`,`end_date`,`order_status`,`factory_id`,`factory_yield`)
VALUES
(1,0,'2018-03-02 17:05:04',1,NULL,NULL,'LG001',1,1,1000,'2018-04-30',20,1,500),
(2,0,'2018-03-02 17:06:27',1,NULL,NULL,'XS002',1,1,2000,'2018-04-30',20,1,500),
(3,0,'2018-03-09 15:56:20',1,NULL,NULL,'OS003',1,2,3000,'2018-04-30',20,1,500),
(4,0,'2018-03-09 15:56:22',1,NULL,NULL,'XX004',1,2,4000,'2018-04-30',20,1,500),
(5,0,'2018-03-09 15:58:09',1,NULL,NULL,'LT005',1,3,5000,'2018-04-30',20,1,500);
