const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../db/db_factory.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Wrap sync SQLite in async-compatible interface matching mysql2 style
async function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') ||
                     sql.trim().toUpperCase().startsWith('WITH');
    if (isSelect) {
      const rows = stmt.all(...(Array.isArray(params) ? params : [params]));
      return [rows];
    } else {
      const result = stmt.run(...(Array.isArray(params) ? params : [params]));
      return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
    }
  } catch (err) {
    throw err;
  }
}

module.exports = { query, db };
