const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const { db } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-initialize database on first run
function ensureDatabase() {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='t_factory'").get();
  if (!tableCheck) {
    console.log('首次启动，正在初始化数据库...');
    const initSql = fs.readFileSync(path.join(__dirname, '../db/init.sql'), 'utf8');
    // 转换 MySQL SQL 为 SQLite
    const sqlite = initSql
      .replace(/AUTO_INCREMENT=\d+/g, '')
      .replace(/int\(\d+\)/g, 'INTEGER')
      .replace(/datetime/g, 'TEXT')
      .replace(/char\(\d+\)/g, 'TEXT')
      .replace(/varchar\(\d+\)/g, 'TEXT')
      .replace(/COMMENT\s+'[^']*'/g, '')
      .replace(/ENGINE=InnoDB/g, '')
      .replace(/DEFAULT CHARSET=utf8mb4/g, '')
      .replace(/\/\*[^*]*\*\/\n?/g, '')
      .replace(/--[^\n]*\n/g, '\n')
      .replace(/\bNOW\(\)/g, "datetime('now')")
      .replace(/PRIMARY KEY\s*\(`id`\)/g, 'PRIMARY KEY (id)')
      .replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT')
      .replace(/COLLATE utf8mb4_unicode_ci/g, '')
      .replace(/USE\s+`[^`]*`;/g, '')
      .replace(/CREATE DATABASE[^;]*;/g, '')
      .replace(/LOCK TABLES[^;]*;/g, '')
      .replace(/UNLOCK TABLES;/g, '')
      .replace(/\/\*![^\n]*\n/g, '')
      .replace(/SET\s+\w+[^;]*;/g, '');

    const statements = sqlite.split(';').filter(s => s.trim()).map(s => s.trim() + ';');
    let created = 0;
    for (const stmt of statements) {
      try {
        if (stmt.includes('CREATE TABLE') || stmt.includes('INSERT INTO') || stmt.includes('CREATE INDEX')) {
          db.exec(stmt);
          created++;
        }
      } catch (e) { /* skip duplicates */ }
    }
    console.log(`数据库初始化完成，执行了 ${created} 条语句`);
  } else {
    console.log('数据库已就绪');
  }
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

ensureDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`智能工厂云平台服务已启动: http://0.0.0.0:${PORT}`);
});
