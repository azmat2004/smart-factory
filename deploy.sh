#!/bin/bash
# ==========================================
# 智能制造云平台 - 一键部署脚本
# 使用方法: bash deploy.sh
# ==========================================

set -e

APP_DIR="/opt/smart-factory"
APP_NAME="smart-factory"

echo "=== 智能制造云平台部署脚本 ==="

# 1. 安装 Node.js (如未安装)
if ! command -v node &> /dev/null; then
    echo "[1/6] 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "[1/6] Node.js 已安装: $(node -v)"
fi

# 2. 安装 PM2 (如未安装)
if ! command -v pm2 &> /dev/null; then
    echo "[2/6] 安装 PM2..."
    sudo npm install -g pm2
else
    echo "[2/6] PM2 已安装: $(pm2 -v)"
fi

# 3. 安装 Nginx (如未安装)
if ! command -v nginx &> /dev/null; then
    echo "[3/6] 安装 Nginx..."
    sudo apt-get update && sudo apt-get install -y nginx
else
    echo "[3/6] Nginx 已安装"
fi

# 4. 部署应用代码
echo "[4/6] 部署应用代码..."
sudo mkdir -p $APP_DIR
sudo cp -r . $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
cd $APP_DIR
npm install --production

# 5. 初始化数据库
echo "[5/6] 初始化数据库..."
node db/init-db.js

# 6. 启动应用
echo "[6/6] 启动应用..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

echo ""
echo "=== 部署完成! ==="
echo "应用运行在: http://localhost:3000"
echo ""
echo "下一步:"
echo "1. 配置 Nginx: sudo cp nginx.conf /etc/nginx/conf.d/smart-factory.conf"
echo "2. 编辑域名: sudo nano /etc/nginx/conf.d/smart-factory.conf"
echo "3. 重启 Nginx: sudo systemctl restart nginx"
echo "4. 配置域名 DNS 解析到本服务器 IP"
echo "5. 安装 SSL 证书: sudo apt install certbot && sudo certbot --nginx"
