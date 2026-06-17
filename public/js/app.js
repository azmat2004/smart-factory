// ============================================================
// 东软智能制造云平台 - 主应用
// ============================================================

const STATUS = {
  order: { 10: '未接单', 20: '已接单', 30: '已拒绝', 40: '生产中', 50: '已完成' },
  plan: { 10: '未启动', 20: '已启动', 30: '已完成' },
  schedule: { 10: '未开始', 20: '生产中', 30: '已完成' },
  equipment: { 10: '启用', 20: '停用', 30: '故障' },
  unit: { 10: '天', 20: '月', 30: '年', 40: '小时' }
};

function statusBadge(type, val) {
  const clsMap = {
    order: { 10: 'info', 20: 'warning', 30: 'error', 40: 'processing', 50: 'success' },
    plan: { 10: 'info', 20: 'warning', 30: 'success' },
    schedule: { 10: 'info', 20: 'warning', 30: 'success' },
    equipment: { 10: 'success', 20: 'error', 30: 'error' }
  };
  const label = (STATUS[type] && STATUS[type][val]) ? STATUS[type][val] : '未知';
  const cls = (clsMap[type] && clsMap[type][val]) ? clsMap[type][val] : 'default';
  return `<span class="status-badge ${cls}">${label}</span>`;
}

// Toast
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const item = document.createElement('div'); item.className = `toast-item ${type}`; item.textContent = msg;
  container.appendChild(item);
  setTimeout(() => item.remove(), 3000);
}

// Modal
function showModal(title, bodyHtml, onSave) {
  const overlay = document.createElement('div'); overlay.className = 'modal-backdrop-custom';
  overlay.innerHTML = `<div class="modal-custom">
    <div class="modal-header"><h5>${title}</h5><button class="btn-close" id="modalClose"></button></div>
    <div class="modal-body">${bodyHtml}</div>
    <div style="padding:0 24px 20px;text-align:right;">
      <button class="btn btn-secondary me-2" id="modalCancel">取消</button>
      <button class="btn btn-primary" id="modalSave">保存</button>
    </div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#modalClose').onclick = overlay.querySelector('#modalCancel').onclick = () => overlay.remove();
  overlay.querySelector('#modalSave').onclick = () => { onSave(overlay); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  return overlay;
}

function showConfirm(msg, onConfirm) {
  const overlay = document.createElement('div'); overlay.className = 'modal-backdrop-custom';
  overlay.innerHTML = `<div class="modal-custom" style="width:400px;">
    <div class="modal-header"><h5>确认操作</h5><button class="btn-close" id="cfClose"></button></div>
    <div class="modal-body"><p>${msg}</p></div>
    <div style="padding:0 24px 20px;text-align:right;">
      <button class="btn btn-secondary me-2" id="cfCancel">取消</button>
      <button class="btn btn-danger" id="cfConfirm">确认</button>
    </div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#cfClose').onclick = overlay.querySelector('#cfCancel').onclick = () => overlay.remove();
  overlay.querySelector('#cfConfirm').onclick = () => { overlay.remove(); onConfirm(); };
}

// ============ ROUTER ============
const routes = { login: renderLogin, register: renderRegister, dashboard: renderDashboard, product: renderProduct, equipment: renderEquipment, order: renderOrder, plan: renderPlan, schedule: renderSchedule, track: renderTrack };

function navigate(page) {
  if (page === 'login' || page === 'register') {
    document.getElementById('app').innerHTML = '';
    routes[page]();
  } else {
    if (!localStorage.getItem('token') && !isLoggedIn()) { renderLogin(); return; }
    renderLayout(page);
  }
}

function isLoggedIn() { return true; } // 开发模式下默认已登录

// ============ LOGIN ============
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <h2><i class="bi bi-cpu-fill"></i> 东软智能制造云平台</h2>
        <p class="subtitle">工业4.0 · 智能工厂管理系统</p>
        <form id="loginForm">
          <div class="mb-3"><label>用户名</label><input type="text" class="form-control" id="userName" value="admin" required></div>
          <div class="mb-3"><label>密码</label><input type="password" class="form-control" id="password" value="123456" required></div>
          <button type="submit" class="btn btn-primary w-100">登 录</button>
          <div class="text-center mt-3"><a href="javascript:navigate('register')">注册新工厂</a></div>
        </form>
      </div>
    </div>`;
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const res = await API.login({ userName: document.getElementById('userName').value, password: document.getElementById('password').value });
    if (res.status === 'success') {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      showToast('登录成功');
      navigate('dashboard');
    } else showToast(res.msg, 'error');
  };
}

// ============ REGISTER ============
function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="login-container">
      <div class="register-card">
        <h2>工厂入驻注册</h2>
        <p class="subtitle" style="text-align:center;">注册后即可使用智能工厂管理平台</p>
        <form id="regForm">
          <h6 class="mb-3">工厂信息</h6>
          <div class="row"><div class="col-md-6 mb-3"><label>工厂名称 *</label><input type="text" class="form-control" id="factoryName" required></div>
          <div class="col-md-6 mb-3"><label>工厂地址</label><input type="text" class="form-control" id="factoryAddr"></div></div>
          <div class="row"><div class="col-md-6 mb-3"><label>工厂人数</label><input type="number" class="form-control" id="factoryWorker"></div></div>
          <h6 class="mb-3 mt-2">管理员信息</h6>
          <div class="row"><div class="col-md-6 mb-3"><label>用户名 *</label><input type="text" class="form-control" id="userName" required></div>
          <div class="col-md-6 mb-3"><label>真实姓名</label><input type="text" class="form-control" id="userRealName"></div></div>
          <div class="row"><div class="col-md-6 mb-3"><label>密码 *</label><input type="password" class="form-control" id="password" required></div>
          <div class="col-md-6 mb-3"><label>工号</label><input type="text" class="form-control" id="userJobNum"></div></div>
          <div class="row"><div class="col-md-6 mb-3"><label>手机号</label><input type="text" class="form-control" id="userPhone"></div>
          <div class="col-md-6 mb-3"><label>邮箱</label><input type="email" class="form-control" id="userEmail"></div></div>
          <button type="submit" class="btn btn-primary w-100">注 册</button>
          <div class="text-center mt-3"><a href="javascript:navigate('login')">已有账户？去登录</a></div>
        </form>
      </div>
    </div>`;
  document.getElementById('regForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      factoryName: document.getElementById('factoryName').value,
      factoryAddr: document.getElementById('factoryAddr').value,
      factoryWorker: parseInt(document.getElementById('factoryWorker').value) || 0,
      userName: document.getElementById('userName').value,
      userRealName: document.getElementById('userRealName').value,
      password: document.getElementById('password').value,
      userJobNum: document.getElementById('userJobNum').value,
      userPhone: document.getElementById('userPhone').value,
      userEmail: document.getElementById('userEmail').value
    };
    const res = await API.register(data);
    if (res.status === 'success') { showToast('注册成功，请登录'); setTimeout(() => navigate('login'), 1000); }
    else showToast(res.msg, 'error');
  };
}

// ============ LAYOUT ============
function renderLayout(activePage) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const menuItems = [
    { page: 'dashboard', icon: 'bi-speedometer2', label: '首页' },
    { page: 'product', icon: 'bi-box-seam', label: '产品管理' },
    { page: 'equipment', icon: 'bi-tools', label: '设备管理' },
    { page: 'order', icon: 'bi-file-earmark-text', label: '订单管理' },
    { page: 'plan', icon: 'bi-calendar-check', label: '生产计划' },
    { page: 'schedule', icon: 'bi-diagram-3', label: '生产调度' },
    { page: 'track', icon: 'bi-clipboard-data', label: '生产跟踪' }
  ];

  document.getElementById('app').innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar">
        <a href="javascript:navigate('dashboard')" class="sidebar-logo"><i class="bi bi-cpu"></i> 智能制造云平台</a>
        <ul class="sidebar-menu">${menuItems.map(m =>
          `<li><a href="javascript:navigate('${m.page}')" class="${activePage === m.page ? 'active' : ''}" data-page="${m.page}"><i class="bi ${m.icon}"></i> ${m.label}</a></li>`
        ).join('')}</ul>
      </aside>
      <div class="main-content">
        <header class="top-header">
          <button class="menu-toggle" id="menuToggle"><i class="bi bi-list"></i></button>
          <div class="user-info">
            <span>${user.factoryName || '工厂'} - ${user.realName || user.userName || '管理员'}</span>
            <button class="btn btn-sm btn-outline-secondary" onclick="localStorage.clear();navigate('login')"><i class="bi bi-box-arrow-right"></i> 退出</button>
          </div>
        </header>
        <div class="page-content" id="pageContent"></div>
      </div>
    </div>`;

  document.getElementById('menuToggle').onclick = () => document.getElementById('sidebar').classList.toggle('open');

  // Render page content
  if (activePage && routes[activePage]) routes[activePage]();
}

// ============ DASHBOARD ============
async function renderDashboard() {
  const el = document.getElementById('pageContent');
  el.innerHTML = '<div class="text-center p-5"><div class="spinner-border"></div></div>';
  const res = await API.getDashboardStats();
  if (res.status !== 'success') { el.innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><p>${res.msg}</p></div>`; return; }
  const d = res.data;

  el.innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-md-3"><div class="stat-card"><div class="icon blue"><i class="bi bi-tools"></i></div><div><div class="value">${d.equipment.total}</div><div class="label">设备总数</div></div></div></div>
      <div class="col-md-3"><div class="stat-card"><div class="icon green"><i class="bi bi-play-circle"></i></div><div><div class="value">${d.equipment.processing}</div><div class="label">加工中设备 · 开机率 ${d.equipment.startupRate}%</div></div></div></div>
      <div class="col-md-3"><div class="stat-card"><div class="icon orange"><i class="bi bi-pause-circle"></i></div><div><div class="value">${d.equipment.standby}</div><div class="label">待机设备 · 运行率 ${d.equipment.processingRate}%</div></div></div></div>
      <div class="col-md-3"><div class="stat-card"><div class="icon red"><i class="bi bi-exclamation-triangle"></i></div><div><div class="value">${d.equipment.fault}</div><div class="label">故障设备 · 故障率 ${d.equipment.faultRate}%</div></div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-3"><div class="stat-card"><div class="icon purple"><i class="bi bi-file-earmark"></i></div><div><div class="value">${d.orders.total}</div><div class="label">订单总数</div></div></div></div>
      <div class="col-md-3"><div class="stat-card"><div class="icon cyan"><i class="bi bi-check-circle"></i></div><div><div class="value">${d.orders.accepted}</div><div class="label">已接单</div></div></div></div>
      <div class="col-md-3"><div class="stat-card"><div class="icon blue"><i class="bi bi-gear"></i></div><div><div class="value">${d.orders.inProduction}</div><div class="label">生产中</div></div></div></div>
      <div class="col-md-3"><div class="stat-card"><div class="icon green"><i class="bi bi-flag"></i></div><div><div class="value">${d.orders.completed}</div><div class="label">已完成</div></div></div></div>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-8"><div class="chart-card"><h6>年度订单统计</h6><div id="yearChart" style="height:300px;"></div></div></div>
      <div class="col-md-4"><div class="chart-card"><h6>设备运行状态分布</h6><div id="eqChart" style="height:300px;"></div></div></div>
    </div>
    <div class="table-card mb-4"><div class="card-header"><h5>设备运行状态</h5></div>
      <div class="eq-grid">${d.equipment.list.map(eq => {
        const cls = eq.runningStatus === '加工中' ? 'processing' : eq.runningStatus === '待机' ? 'standby' : eq.runningStatus === '故障' ? 'fault' : 'standby';
        const statusCls = eq.runningStatus === '加工中' ? 'processing' : eq.runningStatus === '待机' ? 'success' : 'error';
        return `<div class="eq-card ${cls}"><div class="d-flex justify-content-between"><strong>${eq.equipment_name}</strong><span class="status-badge ${statusCls}">${eq.runningStatus}</span></div>
          <small class="text-muted">序列号: ${eq.equipment_seq}</small><br><small class="text-muted">可生产: ${eq.product_names || '-'}</small></div>`;
      }).join('')}</div>
    </div>
    ${d.recentWorks.length ? `<div class="table-card"><div class="card-header"><h5>近期报工记录</h5></div>
      <table class="table table-hover"><thead><tr><th>工单编号</th><th>设备</th><th>产品</th><th>加工数量</th><th>合格数量</th><th>时间</th></tr></thead>
      <tbody>${d.recentWorks.map(w => `<tr><td>${w.schedule_seq}</td><td>${w.equipment_name || '-'}</td><td>${w.product_name || '-'}</td><td>${w.working_count}</td><td>${w.qualified_count}</td><td>${w.create_time}</td></tr>`).join('')}</tbody></table></div>` : ''}`;

  // Charts
  setTimeout(() => {
    const yearC = echarts.init(document.getElementById('yearChart'));
    yearC.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['已接单', '已排产', '已完成'] },
      xAxis: { data: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'] },
      yAxis: { type: 'value' },
      series: [
        { name: '已接单', type: 'bar', data: d.monthlyOrders.map(m => m.accepted), color: '#1890ff' },
        { name: '已排产', type: 'bar', data: d.monthlyOrders.map(m => m.planned), color: '#fa8c16' },
        { name: '已完成', type: 'bar', data: d.monthlyOrders.map(m => m.completed), color: '#52c41a' }
      ]
    });
    const eqC = echarts.init(document.getElementById('eqChart'));
    eqC.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['50%', '75%'], center: ['50%', '50%'],
        data: [
          { value: d.equipment.processing, name: '加工中', itemStyle: { color: '#1890ff' } },
          { value: d.equipment.standby, name: '待机', itemStyle: { color: '#fa8c16' } },
          { value: d.equipment.fault, name: '故障', itemStyle: { color: '#ff4d4f' } },
          { value: d.equipment.total - d.equipment.running, name: '停用', itemStyle: { color: '#d9d9d9' } }
        ].filter(d => d.value > 0)
      }]
    });
  }, 100);
}

// ============ PRODUCT MANAGEMENT ============
async function renderProduct() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `<div class="table-card"><div class="card-header"><h5>产品管理</h5><button class="btn btn-primary btn-sm" onclick="showProductForm()"><i class="bi bi-plus-lg"></i> 添加产品</button></div>
    <div class="search-bar"><div><label>产品名称</label><input type="text" class="form-control form-control-sm" id="searchName" placeholder="输入产品名称查询"></div>
    <div><button class="btn btn-primary btn-sm" onclick="loadProductList()">查询</button></div></div>
    <div id="productTable"></div><div id="productPager" class="pagination-bar"></div></div>`;
  loadProductList();
}

async function loadProductList(page = 1) {
  const name = document.getElementById('searchName')?.value || '';
  const res = await API.getProductList({ productName: name, page, pageSize: 10 });
  const { list, total } = res.data || {};
  document.getElementById('productTable').innerHTML = `<table class="table table-hover"><thead><tr><th>产品编号</th><th>产品图片</th><th>产品名称</th><th>创建时间</th><th>关联订单</th><th>操作</th></tr></thead>
    <tbody>${list && list.length ? list.map(p => `<tr>
      <td>${p.product_num}</td><td><img src="${p.product_img_url}" width="48" style="border-radius:4px;" onerror="this.src='/uploads/default/product.png'"></td>
      <td>${p.product_name}</td><td>${p.create_time}</td><td>${p.orderCount || 0}</td>
      <td><button class="btn btn-sm btn-outline-primary me-1" onclick="showProductForm(${p.id})">编辑</button><button class="btn btn-sm btn-outline-danger" onclick="delProduct(${p.id},'${p.product_name}')">删除</button></td></tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted py-4">暂无数据</td></tr>'}</tbody></table>`;
  renderPager('productPager', total, page, 10, loadProductList);
}

async function showProductForm(id) {
  let p = { product_name: '', product_img_url: '' }; let title = '添加产品';
  if (id) { const res = await API.getProductList({ page: 1, pageSize: 100 }); p = (res.data?.list || []).find(x => x.id === id) || p; title = '编辑产品'; }
  const m = showModal(title, `<div class="mb-3"><label>产品名称 *</label><input type="text" class="form-control" id="fName" value="${p.product_name}"></div>
    <div class="mb-3"><label>产品图片</label><input type="file" class="form-control" id="fImg" accept="image/*"></div>
    <input type="hidden" id="fImgUrl" value="${p.product_img_url || ''}">
    <div class="text-center"><img id="fPreview" src="${p.product_img_url || '/uploads/default/product.png'}" style="max-width:120px;border-radius:8px;"></div>`, async (overlay) => {
    const name = overlay.querySelector('#fName').value;
    if (!name) { showToast('产品名称不能为空', 'error'); return; }
    let imgUrl = overlay.querySelector('#fImgUrl').value;
    const file = overlay.querySelector('#fImg').files[0];
    if (file) { const fd = new FormData(); fd.append('file', file); const upRes = await API.uploadProductImg(fd); if (upRes.status === 'success') imgUrl = upRes.msg; }
    const data = { id, productName: name, productImgUrl: imgUrl };
    const res = await (id ? API.editProduct(data) : API.addProduct(data));
    if (res.status === 'success') { showToast(res.msg); overlay.remove(); loadProductList(); } else showToast(res.msg, 'error');
  });
  m.querySelector('#fImg').onchange = (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => { m.querySelector('#fPreview').src = ev.target.result; }; r.readAsDataURL(f); } };
}

async function delProduct(id, name) {
  showConfirm(`确定删除产品「${name}」吗？`, async () => {
    const res = await API.deleteProduct(id);
    if (res.status === 'success') { showToast('删除成功'); loadProductList(); } else showToast(res.msg, 'error');
  });
}

// ============ EQUIPMENT MANAGEMENT ============
async function renderEquipment() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `<div class="table-card"><div class="card-header"><h5>设备管理</h5><button class="btn btn-primary btn-sm" onclick="showEqForm()"><i class="bi bi-plus-lg"></i> 添加设备</button></div>
    <div class="search-bar"><div><label>设备名称</label><input type="text" class="form-control form-control-sm" id="eqSearchName"></div>
    <div><label>产品名称</label><input type="text" class="form-control form-control-sm" id="eqSearchProd"></div>
    <div><button class="btn btn-primary btn-sm" onclick="loadEqList()">查询</button></div></div>
    <div id="eqTable"></div><div id="eqPager" class="pagination-bar"></div></div>`;
  loadEqList();
}

async function loadEqList(page = 1) {
  const name = document.getElementById('eqSearchName')?.value || '';
  const prod = document.getElementById('eqSearchProd')?.value || '';
  const res = await API.getEquipmentList({ equipmentName: name, productName: prod, page, pageSize: 10 });
  const { list, total } = res.data || {};
  document.getElementById('eqTable').innerHTML = `<table class="table table-hover"><thead><tr><th>设备序列号</th><th>设备图片</th><th>设备名称</th><th>设备状态</th><th>可生产产品(产能)</th><th>操作</th></tr></thead>
    <tbody>${list && list.length ? list.map(e => `<tr><td>${e.equipment_seq}</td>
      <td><img src="${e.equipment_img_url}" width="48" style="border-radius:4px;" onerror="this.src='/uploads/default/equipment.png'"></td>
      <td>${e.equipment_name}</td><td>${statusBadge('equipment', e.equipment_status)}</td>
      <td>${(e.products || []).map(ep => `${ep.product_name}(${ep.yield})`).join(', ') || '-'}</td>
      <td><button class="btn btn-sm btn-outline-primary me-1" onclick="showEqForm(${e.id})">编辑</button><button class="btn btn-sm btn-outline-danger" onclick="delEq(${e.id},'${e.equipment_name}')">删除</button></td></tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted py-4">暂无数据</td></tr>'}</tbody></table>`;
  renderPager('eqPager', total, page, 10, loadEqList);
}

async function showEqForm(id) {
  let eq = { equipment_seq: '', equipment_name: '', equipment_status: 10, equipment_img_url: '', products: [] }; let title = '添加设备';
  if (id) { const res = await API.getEquipmentList({ page: 1, pageSize: 100 }); eq = (res.data?.list || []).find(x => x.id === id) || eq; title = '编辑设备'; }
  const allProdRes = await API.getAllProducts();
  const allProducts = allProdRes.data || [];
  const prodOpts = allProducts.map(p => `<option value="${p.id}">${p.product_name}</option>`).join('');
  const productsHtml = (eq.products || []).map((ep, i) => `<div class="product-row">
    <select class="form-select form-select-sm prod-select" style="flex:2;"><option value="">选择产品</option>${allProducts.map(p => `<option value="${p.id}" ${p.id===ep.product_id?'selected':''}>${p.product_name}</option>`).join('')}</select>
    <input type="number" class="form-control form-control-sm prod-yield" placeholder="产能" value="${ep.yield || ''}" style="flex:1;">
    <input type="number" class="form-control form-control-sm prod-unit" placeholder="单位" value="${ep.unit || 10}" style="flex:1;">
    <button class="btn btn-sm btn-outline-danger" onclick="this.closest('.product-row').remove()"><i class="bi bi-trash"></i></button></div>`).join('');
  const m = showModal(title, `<div class="row"><div class="col-md-6 mb-3"><label>设备序列号 *</label><input type="text" class="form-control" id="fSeq" value="${eq.equipment_seq}"></div>
    <div class="col-md-6 mb-3"><label>设备名称</label><input type="text" class="form-control" id="fName" value="${eq.equipment_name}"></div></div>
    <div class="row"><div class="col-md-6 mb-3"><label>设备状态</label><select class="form-select" id="fStatus"><option value="10" ${eq.equipment_status===10?'selected':''}>启用</option><option value="20" ${eq.equipment_status===20?'selected':''}>停用</option><option value="30" ${eq.equipment_status===30?'selected':''}>故障</option></select></div>
    <div class="col-md-6 mb-3"><label>设备图片</label><input type="file" class="form-control" id="fImg" accept="image/*"></div></div>
    <input type="hidden" id="fImgUrl" value="${eq.equipment_img_url || ''}">
    <div class="text-center mb-3"><img id="fPreview" src="${eq.equipment_img_url || '/uploads/default/equipment.png'}" style="max-width:120px;border-radius:8px;"></div>
    <label>可生产产品及产能 <button class="btn btn-sm btn-outline-primary ms-2" id="addProdRow"><i class="bi bi-plus"></i> 添加</button></label>
    <div id="prodRows">${productsHtml || '<div class="product-row"><select class="form-select form-select-sm prod-select" style="flex:2;"><option value="">选择产品</option>'+prodOpts+'</select><input type="number" class="form-control form-control-sm prod-yield" placeholder="产能" style="flex:1;"><input type="number" class="form-control form-control-sm prod-unit" placeholder="单位" value="10" style="flex:1;"><button class="btn btn-sm btn-outline-danger" onclick="this.closest(\'.product-row\').remove()"><i class="bi bi-trash"></i></button></div>'}</div>`, async (overlay) => {
    const seq = overlay.querySelector('#fSeq').value;
    if (!seq) { showToast('设备序列号必填', 'error'); return; }
    let imgUrl = overlay.querySelector('#fImgUrl').value;
    const file = overlay.querySelector('#fImg').files[0];
    if (file) { const fd = new FormData(); fd.append('file', file); const ur = await API.uploadEquipmentImg(fd); if (ur.status === 'success') imgUrl = ur.msg; }
    const prods = []; overlay.querySelectorAll('#prodRows .product-row').forEach(row => {
      const pid = row.querySelector('.prod-select').value; const y = row.querySelector('.prod-yield').value; const u = row.querySelector('.prod-unit').value;
      if (pid && y) prods.push({ productId: parseInt(pid), yield: parseInt(y), unit: parseInt(u) || 10 });
    });
    const data = { id, equipmentSeq: seq, equipmentName: overlay.querySelector('#fName').value, equipmentStatus: parseInt(overlay.querySelector('#fStatus').value), equipmentImgUrl: imgUrl, products: prods };
    const res = await (id ? API.editEquipment(data) : API.addEquipment(data));
    if (res.status === 'success') { showToast(res.msg); overlay.remove(); loadEqList(); } else showToast(res.msg, 'error');
  });
  m.querySelector('#fImg').onchange = (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => { m.querySelector('#fPreview').src = ev.target.result; }; r.readAsDataURL(f); } };
  m.querySelector('#addProdRow').onclick = () => {
    const div = document.createElement('div'); div.className = 'product-row';
    div.innerHTML = `<select class="form-select form-select-sm prod-select" style="flex:2;"><option value="">选择产品</option>${prodOpts}</select><input type="number" class="form-control form-control-sm prod-yield" placeholder="产能" style="flex:1;"><input type="number" class="form-control form-control-sm prod-unit" placeholder="单位" value="10" style="flex:1;"><button class="btn btn-sm btn-outline-danger" onclick="this.closest('.product-row').remove()"><i class="bi bi-trash"></i></button>`;
    m.querySelector('#prodRows').appendChild(div);
  };
}

async function delEq(id, name) {
  showConfirm(`确定删除设备「${name}」吗？`, async () => {
    const res = await API.deleteEquipment(id);
    if (res.status === 'success') { showToast('删除成功'); loadEqList(); } else showToast(res.msg, 'error');
  });
}

// ============ ORDER MANAGEMENT ============
async function renderOrder() {
  const el = document.getElementById('pageContent');
  const prodRes = await API.getAllProducts();
  const prodOpts = (prodRes.data || []).map(p => `<option value="${p.id}">${p.product_name}</option>`).join('');
  el.innerHTML = `<div class="table-card"><div class="card-header"><h5>订单管理</h5><button class="btn btn-primary btn-sm" onclick="showOrderForm()"><i class="bi bi-plus-lg"></i> 新建订单</button></div>
    <div class="search-bar"><div><label>订单编号</label><input type="text" class="form-control form-control-sm" id="oSearchSeq"></div>
    <div><label>产品</label><select class="form-select form-select-sm" id="oSearchProd"><option value="">全部</option>${prodOpts}</select></div>
    <div><label>状态</label><select class="form-select form-select-sm" id="oSearchStatus"><option value="">全部</option><option value="10">未接单</option><option value="20">已接单</option><option value="30">已拒绝</option><option value="40">生产中</option><option value="50">已完成</option></select></div>
    <div><button class="btn btn-primary btn-sm" onclick="loadOrderList()">查询</button></div></div>
    <div id="orderTable"></div><div id="orderPager" class="pagination-bar"></div></div>`;
  loadOrderList();
}

async function loadOrderList(page = 1) {
  const seq = document.getElementById('oSearchSeq')?.value || '';
  const pid = document.getElementById('oSearchProd')?.value || '';
  const st = document.getElementById('oSearchStatus')?.value || '';
  const res = await API.getOrderList({ orderSeq: seq, productId: pid, orderStatus: st, page, pageSize: 10 });
  const { list, total } = res.data || {};
  document.getElementById('orderTable').innerHTML = `<table class="table table-hover"><thead><tr><th>订单编号</th><th>产品</th><th>数量</th><th>截止日期</th><th>状态</th><th>已完成</th><th>可用产能</th><th>操作</th></tr></thead>
    <tbody>${list && list.length ? list.map(o => {
      let a = ''; if (o.order_status === 10) a = `<button class="btn btn-sm btn-success me-1" onclick="acceptOrder(${o.id})">接单</button><button class="btn btn-sm btn-danger me-1" onclick="rejectOrder(${o.id})">拒单</button>`;
      else if (o.order_status === 20) a = `<button class="btn btn-sm btn-primary me-1" onclick="orderToPlan(${o.id})">转计划</button>`;
      else if (o.order_status === 40) a = `<button class="btn btn-sm btn-success me-1" onclick="completeOrder(${o.id})">完成</button>`;
      return `<tr><td>${o.order_seq}</td><td>${o.product_name || '-'}</td><td>${o.product_count}</td><td>${o.end_date}</td><td>${statusBadge('order', o.order_status)}</td><td>${o.completedCount}</td><td>${o.availableYield}</td><td>${a || '-'}</td></tr>`;
    }).join('') : '<tr><td colspan="8" class="text-center text-muted py-4">暂无数据</td></tr>'}</tbody></table>`;
  renderPager('orderPager', total, page, 10, loadOrderList);
}

async function showOrderForm() {
  const prodRes = await API.getAllProducts();
  const opts = (prodRes.data || []).map(p => `<option value="${p.id}">${p.product_name}</option>`).join('');
  const m = showModal('新建订单', `<div class="mb-3"><label>产品 *</label><select class="form-select" id="fProd">${opts}</select></div>
    <div class="row"><div class="col-md-6 mb-3"><label>产品数量 *</label><input type="number" class="form-control" id="fCount" min="1"></div>
    <div class="col-md-6 mb-3"><label>截止日期 *</label><input type="date" class="form-control" id="fEndDate"></div></div>`, async (overlay) => {
    const pid = overlay.querySelector('#fProd').value; const cnt = overlay.querySelector('#fCount').value; const end = overlay.querySelector('#fEndDate').value;
    if (!pid || !cnt || !end) { showToast('请填完所有必填项', 'error'); return; }
    const res = await API.addOrder({ productId: parseInt(pid), productCount: parseInt(cnt), endDate: end });
    if (res.status === 'success') { showToast(res.msg); overlay.remove(); loadOrderList(); } else showToast(res.msg, 'error');
  });
}

async function acceptOrder(id) { showConfirm('确认接单？', async () => { const r = await API.acceptOrder(id); if (r.status === 'success') { showToast('接单成功'); loadOrderList(); } else showToast(r.msg, 'error'); }); }
async function rejectOrder(id) {
  const m = showModal('拒单原因', `<div class="mb-3"><label>备注 *</label><textarea class="form-control" id="fRemark" rows="3"></textarea></div>`, async (overlay) => {
    const r = overlay.querySelector('#fRemark').value; if (!r) { showToast('请填写拒单原因', 'error'); return; }
    const res = await API.rejectOrder(id, r); if (res.status === 'success') { showToast('拒单成功'); overlay.remove(); loadOrderList(); } else showToast(res.msg, 'error');
  });
}
async function orderToPlan(id) {
  const m = showModal('转成生产计划', `<div class="row"><div class="col-md-6 mb-3"><label>计划开始日期 *</label><input type="date" class="form-control" id="fStart"></div>
    <div class="col-md-6 mb-3"><label>计划结束日期 *</label><input type="date" class="form-control" id="fEnd"></div></div>`, async (overlay) => {
    const s = overlay.querySelector('#fStart').value; const e = overlay.querySelector('#fEnd').value;
    if (!s || !e) { showToast('请填写起止日期', 'error'); return; }
    const res = await API.orderToPlan(id, s, e); if (res.status === 'success') { showToast(res.msg); overlay.remove(); loadOrderList(); } else showToast(res.msg, 'error');
  });
}
async function completeOrder(id) {
  const m = showModal('完成订单', `<p>确认完成此订单？</p><div class="mb-3"><label>备注（数量不足时必填）</label><textarea class="form-control" id="fRemark"></textarea></div>`, async (overlay) => {
    const r = overlay.querySelector('#fRemark').value;
    const res = await API.completeOrder(id, r || ''); if (res.status === 'success') { showToast(res.msg); overlay.remove(); loadOrderList(); } else showToast(res.msg, 'error');
  });
}

// ============ PRODUCTION PLAN ============
async function renderPlan() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `<div class="table-card"><div class="card-header"><h5>生产计划管理</h5><button class="btn btn-primary btn-sm" onclick="showPlanForm()"><i class="bi bi-plus-lg"></i> 新建计划</button></div>
    <div class="search-bar"><div><label>计划编号</label><input type="text" class="form-control form-control-sm" id="pSearchSeq"></div>
    <div><label>状态</label><select class="form-select form-select-sm" id="pSearchStatus"><option value="">全部</option><option value="10">未启动</option><option value="20">已启动</option><option value="30">已完成</option></select></div>
    <div><button class="btn btn-primary btn-sm" onclick="loadPlanList()">查询</button></div></div>
    <div id="planTable"></div><div id="planPager" class="pagination-bar"></div></div>`;
  loadPlanList();
}

async function loadPlanList(page = 1) {
  const seq = document.getElementById('pSearchSeq')?.value || '';
  const st = document.getElementById('pSearchStatus')?.value || '';
  const res = await API.getPlanList({ planSeq: seq, planStatus: st, page, pageSize: 10 });
  const { list, total } = res.data || {};
  document.getElementById('planTable').innerHTML = `<table class="table table-hover"><thead><tr><th>计划编号</th><th>订单编号</th><th>产品</th><th>计划数量</th><th>交货日期</th><th>起止日期</th><th>状态</th><th>工单数</th><th>操作</th></tr></thead>
    <tbody>${list && list.length ? list.map(p => {
      let a = ''; if (p.plan_status === 10) a = `<button class="btn btn-sm btn-success me-1" onclick="startPlan(${p.id})">启动</button><button class="btn btn-sm btn-outline-primary me-1" onclick="showPlanForm(${p.id})">编辑</button><button class="btn btn-sm btn-outline-danger" onclick="delPlan(${p.id})">删除</button>`;
      return `<tr><td>${p.plan_seq}</td><td>${p.order_seq}</td><td>${p.product_name}</td><td>${p.plan_count}</td><td>${p.delivery_date}</td><td>${p.plan_start_date} ~ ${p.plan_end_date}</td><td>${statusBadge('plan', p.plan_status)}</td><td>${p.scheduleCount}</td><td>${a || '-'}</td></tr>`;
    }).join('') : '<tr><td colspan="9" class="text-center text-muted py-4">暂无数据</td></tr>'}</tbody></table>`;
  renderPager('planPager', total, page, 10, loadPlanList);
}

async function showPlanForm(id) {
  let p = { order_id: '', plan_count: '', plan_start_date: '', plan_end_date: '' }; let title = '新建生产计划';
  if (id) { const res = await API.getPlanList({ page: 1, pageSize: 100 }); const found = (res.data?.list || []).find(x => x.id === id); if (found) { p = { order_id: found.order_id, plan_count: found.plan_count, plan_start_date: found.plan_start_date, plan_end_date: found.plan_end_date }; title = '编辑计划'; } }
  const ordRes = await API.getAcceptableOrders();
  const ordOpts = (ordRes.data || []).map(o => `<option value="${o.id}" ${o.id===p.order_id?'selected':''}>${o.order_seq} - ${o.product_name} (${o.product_count})</option>`).join('');
  const m = showModal(title, `<div class="mb-3"><label>订单 *</label><select class="form-select" id="fOrder">${ordOpts}</select></div>
    <div class="row"><div class="col-md-6 mb-3"><label>计划数量 *</label><input type="number" class="form-control" id="fCount" value="${p.plan_count}"></div></div>
    <div class="row"><div class="col-md-6 mb-3"><label>开始日期 *</label><input type="date" class="form-control" id="fStart" value="${p.plan_start_date}"></div>
    <div class="col-md-6 mb-3"><label>结束日期 *</label><input type="date" class="form-control" id="fEnd" value="${p.plan_end_date}"></div></div>`, async (overlay) => {
    const oid = overlay.querySelector('#fOrder').value; const cnt = overlay.querySelector('#fCount').value;
    const s = overlay.querySelector('#fStart').value; const e = overlay.querySelector('#fEnd').value;
    if (!oid || !cnt || !s || !e) { showToast('请填完所有必填项', 'error'); return; }
    const data = { orderId: parseInt(oid), planCount: parseInt(cnt), planStartDate: s, planEndDate: e };
    const res = await (id ? API.editPlan({ id, ...data }) : API.addPlan(data));
    if (res.status === 'success') { showToast(res.msg); overlay.remove(); loadPlanList(); } else showToast(res.msg, 'error');
  });
}

async function startPlan(id) { showConfirm('启动计划？', async () => { const r = await API.startPlan(id); if (r.status === 'success') { showToast('计划已启动'); loadPlanList(); } else showToast(r.msg, 'error'); }); }
async function delPlan(id) { showConfirm('确定删除此计划？', async () => { const r = await API.deletePlan(id); if (r.status === 'success') { showToast('删除成功'); loadPlanList(); } else showToast(r.msg, 'error'); }); }

// ============ PRODUCTION SCHEDULING ============
async function renderSchedule() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `<div class="table-card"><div class="card-header"><h5>生产调度管理</h5><button class="btn btn-primary btn-sm" onclick="showScheduleForm()"><i class="bi bi-plus-lg"></i> 新建工单</button></div>
    <div class="search-bar"><div><label>工单编号</label><input type="text" class="form-control form-control-sm" id="sSearchSeq"></div>
    <div><label>状态</label><select class="form-select form-select-sm" id="sSearchStatus"><option value="">全部</option><option value="10">未开始</option><option value="20">生产中</option><option value="30">已完成</option></select></div>
    <div><button class="btn btn-primary btn-sm" onclick="loadSchList()">查询</button></div></div>
    <div id="schTable"></div><div id="schPager" class="pagination-bar"></div></div>`;
  loadSchList();
}

async function loadSchList(page = 1) {
  const seq = document.getElementById('sSearchSeq')?.value || '';
  const st = document.getElementById('sSearchStatus')?.value || '';
  const res = await API.getScheduleList({ scheduleSeq: seq, scheduleStatus: st, page, pageSize: 10 });
  const { list, total } = res.data || {};
  document.getElementById('schTable').innerHTML = `<table class="table table-hover"><thead><tr><th>工单编号</th><th>计划编号</th><th>产品</th><th>数量</th><th>设备</th><th>起止日期</th><th>状态</th><th>已加工/合格</th><th>操作</th></tr></thead>
    <tbody>${list && list.length ? list.map(s => {
      let a = ''; if (s.schedule_status === 10) a = `<button class="btn btn-sm btn-success me-1" onclick="startSchedule(${s.id})">启动</button><button class="btn btn-sm btn-outline-primary me-1" onclick="showScheduleForm(${s.id})">编辑</button><button class="btn btn-sm btn-outline-danger" onclick="delSchedule(${s.id})">删除</button>`;
      return `<tr><td>${s.schedule_seq}</td><td>${s.plan_seq}</td><td>${s.product_name}</td><td>${s.schedule_count}</td><td>${s.equipment_name || '未分配'}</td><td>${s.start_date} ~ ${s.end_date}</td><td>${statusBadge('schedule', s.schedule_status)}</td><td>${s.totalWorkCount}/${s.totalQualifiedCount}</td><td>${a || '-'}</td></tr>`;
    }).join('') : '<tr><td colspan="9" class="text-center text-muted py-4">暂无数据</td></tr>'}</tbody></table>`;
  renderPager('schPager', total, page, 10, loadSchList);
}

async function showScheduleForm(id) {
  let s = { plan_id: '', schedule_count: '', equipment_id: '', start_date: '', end_date: '' }; let title = '新建工单';
  if (id) { const res = await API.getScheduleList({ page: 1, pageSize: 100 }); const found = (res.data?.list || []).find(x => x.id === id); if (found) { s = { plan_id: found.plan_id, schedule_count: found.schedule_count, equipment_id: found.equipment_id || '', start_date: found.start_date, end_date: found.end_date }; title = '编辑工单'; } }
  const planRes = await API.getActivePlans();
  const planOpts = (planRes.data || []).map(p => `<option value="${p.id}" data-pid="${p.product_id}" ${p.id===s.plan_id?'selected':''}>${p.plan_seq} - ${p.product_name}</option>`).join('');
  window._eqData = {}; (planRes.data || []).forEach(p => { window._eqData[p.id] = p.product_id; });
  let eqOpts = ''; const firstPid = s.plan_id ? window._eqData[s.plan_id] : (planRes.data?.[0]?.product_id);
  if (firstPid) { const eqRes = await API.getEquipmentByProduct(firstPid); eqOpts = (eqRes.data || []).map(e => `<option value="${e.id}" ${e.id===s.equipment_id?'selected':''}>${e.equipment_name} (${e.equipment_seq})</option>`).join(''); }
  const m = showModal(title, `<div class="mb-3"><label>生产计划 *</label><select class="form-select" id="fPlan">${planOpts}</select></div>
    <div class="row"><div class="col-md-6 mb-3"><label>工单数量 *</label><input type="number" class="form-control" id="fCount" value="${s.schedule_count}"></div></div>
    <div class="mb-3"><label>分配设备</label><select class="form-select" id="fEquip"><option value="">未分配</option>${eqOpts}</select></div>
    <div class="row"><div class="col-md-6 mb-3"><label>开始日期 *</label><input type="date" class="form-control" id="fStart" value="${s.start_date}"></div>
    <div class="col-md-6 mb-3"><label>结束日期 *</label><input type="date" class="form-control" id="fEnd" value="${s.end_date}"></div></div>`, async (overlay) => {
    const pid = overlay.querySelector('#fPlan').value; const cnt = overlay.querySelector('#fCount').value; const eid = overlay.querySelector('#fEquip').value;
    const start = overlay.querySelector('#fStart').value; const end = overlay.querySelector('#fEnd').value;
    if (!pid || !cnt || !start || !end) { showToast('请填完所有必填项', 'error'); return; }
    const data = { planId: parseInt(pid), scheduleCount: parseInt(cnt), equipmentId: eid ? parseInt(eid) : null, startDate: start, endDate: end };
    const r = await (id ? API.editSchedule({ id, ...data }) : API.addSchedule(data));
    if (r.status === 'success') { showToast(r.msg); overlay.remove(); loadSchList(); } else showToast(r.msg, 'error');
  });
  m.querySelector('#fPlan').onchange = async function() { const pid = window._eqData[this.value]; if (pid) { const eqRes2 = await API.getEquipmentByProduct(pid); m.querySelector('#fEquip').innerHTML = '<option value="">未分配</option>' + (eqRes2.data || []).map(e => `<option value="${e.id}">${e.equipment_name} (${e.equipment_seq})</option>`).join(''); } };
}

async function startSchedule(id) { showConfirm('确定启动此工单？', async () => { const r = await API.startSchedule(id); if (r.status === 'success') { showToast('工单已启动'); loadSchList(); } else showToast(r.msg, 'error'); }); }
async function delSchedule(id) { showConfirm('确定删除此工单？', async () => { const r = await API.deleteSchedule(id); if (r.status === 'success') { showToast('删除成功'); loadSchList(); } else showToast(r.msg, 'error'); }); }

// ============ PRODUCTION TRACKING ============
async function renderTrack() {
  const el = document.getElementById('pageContent');
  el.innerHTML = `<div class="table-card"><div class="card-header"><h5>生产跟踪 - 报工管理</h5><button class="btn btn-primary btn-sm" onclick="showReportForm()"><i class="bi bi-clipboard-plus"></i> 新增报工</button></div>
    <div id="workTable"></div><div id="workPager" class="pagination-bar"></div></div>`;
  loadWorkList();
}

async function loadWorkList(page = 1) {
  const res = await API.getWorkList({ page, pageSize: 15 });
  const { list, total } = res.data || {};
  document.getElementById('workTable').innerHTML = `<table class="table table-hover"><thead><tr><th>工单</th><th>设备</th><th>产品</th><th>加工数量</th><th>合格</th><th>不合格</th><th>开始时间</th><th>结束时间</th><th>完成报工</th></tr></thead>
    <tbody>${list && list.length ? list.map(w => `<tr><td>${w.schedule_seq}</td><td>${w.equipment_name || '-'}</td><td>${w.product_name || '-'}</td><td>${w.working_count}</td><td>${w.qualified_count}</td><td>${w.unqualified_cout}</td><td>${w.start_time}</td><td>${w.end_time}</td><td>${w.complete_flag === 0 ? '<span class="status-badge success">是</span>' : '<span class="status-badge default">否</span>'}</td></tr>`).join('') : '<tr><td colspan="9" class="text-center text-muted py-4">暂无报工记录</td></tr>'}</tbody></table>`;
  renderPager('workPager', total, page, 15, loadWorkList);
}

async function showReportForm() {
  const schRes = await API.getActiveSchedules();
  const schOpts = (schRes.data || []).map(s => `<option value="${s.id}">${s.schedule_seq} - ${s.product_name} / ${s.equipment_name || '未分配设备'}</option>`).join('');
  if (!schOpts) { showToast('当前没有生产中的工单', 'error'); return; }
  const m = showModal('新增报工', `<div class="mb-3"><label>工单 *</label><select class="form-select" id="fSch" onchange="loadSchDetail(this.value)">${schOpts}</select></div>
    <div id="schDetail" class="alert alert-info py-2" style="font-size:13px;">请选择工单查看详情</div>
    <div class="row"><div class="col-md-6 mb-3"><label>加工开始时间 *</label><input type="datetime-local" class="form-control" id="fStart"></div>
    <div class="col-md-6 mb-3"><label>加工结束时间 *</label><input type="datetime-local" class="form-control" id="fEnd"></div></div>
    <div class="row"><div class="col-md-6 mb-3"><label>加工数量 *</label><input type="number" class="form-control" id="fCount" min="1"></div>
    <div class="col-md-6 mb-3"><label>合格数量 *</label><input type="number" class="form-control" id="fQualified" min="0"></div></div>
    <div class="mb-3"><label>备注</label><textarea class="form-control" id="fBak" rows="2"></textarea></div>
    <div class="form-check"><input class="form-check-input" type="checkbox" id="fComplete"><label class="form-check-label" for="fComplete">结束报工（完成后工单状态变为已完成）</label></div>`, async (overlay) => {
    const sid = overlay.querySelector('#fSch').value; const start = overlay.querySelector('#fStart').value; const end = overlay.querySelector('#fEnd').value;
    const cnt = overlay.querySelector('#fCount').value; const qc = overlay.querySelector('#fQualified').value;
    if (!sid || !start || !end || !cnt || qc === '') { showToast('请填完所有必填项', 'error'); return; }
    const res = await API.reportWork({
      scheduleId: parseInt(sid), workingCount: parseInt(cnt), qualifiedCount: parseInt(qc),
      startTime: start, endTime: end, completeFlag: overlay.querySelector('#fComplete').checked,
      bak: overlay.querySelector('#fBak').value
    });
    if (res.status === 'success') { showToast(res.msg); overlay.remove(); loadWorkList(); } else showToast(res.msg, 'error');
  });
}

async function loadSchDetail(sid) {
  if (!sid) return; const el = document.getElementById('schDetail'); if (!el) return;
  const res = await API.getScheduleDetail(sid);
  if (res.status !== 'success') { el.innerHTML = '加载失败'; return; }
  const s = res.data;
  el.innerHTML = `<strong>${s.schedule_seq}</strong> | 产品: ${s.product_name} | 设备: ${s.equipment_name || '未分配'} | 计划数量: ${s.schedule_count} | 已加工: ${s.totalWorkCount} | 已合格: ${s.totalQualifiedCount}`;
}

// ============ UTILS ============
function renderPager(elId, total, page, pageSize, loadFn) {
  const el = document.getElementById(elId); if (!el) return;
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) { el.innerHTML = `<small class="text-muted">共 ${total} 条</small>`; return; }
  let html = `<small class="text-muted">共 ${total} 条</small><div>`;
  for (let i = 1; i <= pages; i++) { html += `<button class="btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline-secondary'} ms-1" onclick="${loadFn.name}(${i})">${i}</button>`; }
  html += '</div>'; el.innerHTML = html;
}

// Init
navigate('login');
