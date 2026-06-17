function generateSeq(prefix) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${y}${m}${d}${h}${min}${s}${rand}`;
}

function getNow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

const STATUS_LABELS = {
  equipment: { 10: '启用', 20: '停用', 30: '故障' },
  order: { 10: '未接单', 20: '已接单', 30: '已拒绝', 40: '生产中', 50: '已完成' },
  plan: { 10: '未启动', 20: '已启动', 30: '已完成' },
  schedule: { 10: '未开始', 20: '生产中', 30: '已完成' },
  unit: { 10: '天', 20: '月', 30: '年', 40: '小时' }
};

function getStatusLabel(type, val) {
  return STATUS_LABELS[type] && STATUS_LABELS[type][val] ? STATUS_LABELS[type][val] : '未知';
}

module.exports = { generateSeq, getNow, getStatusLabel, STATUS_LABELS };
