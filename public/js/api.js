// API 请求封装
const API = {
  base: '',

  async request(method, url, data) {
    try {
      const config = {
        method,
        url: this.base + url,
        headers: { 'Content-Type': 'application/json' }
      };
      const token = localStorage.getItem('token');
      if (token) config.headers['Authorization'] = 'Bearer ' + token;
      if (data) config.data = data;
      const res = await axios(config);
      return res.data;
    } catch (err) {
      return { status: 'error', msg: '网络请求失败: ' + err.message };
    }
  },

  get(url, params) { return this.request('get', url + (params ? '?' + new URLSearchParams(params).toString() : '')); },
  post(url, data) { return this.request('post', url, data); },
  upload(url, formData) {
    return new Promise((resolve) => {
      const token = localStorage.getItem('token');
      axios.post(this.base + url, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
      }).then(r => resolve(r.data)).catch(e => resolve({ status: 'error', msg: '上传失败: ' + e.message }));
    });
  },

  // Auth
  login(data) { return this.post('/api/auth/login', data); },
  register(data) { return this.post('/api/auth/register', data); },

  // Dashboard
  getDashboardStats() { return this.get('/api/dashboard/stats'); },

  // Product
  getProductList(params) { return this.get('/api/product/list', params); },
  getAllProducts() { return this.get('/api/product/all'); },
  addProduct(data) { return this.post('/api/product/add', data); },
  editProduct(data) { return this.post('/api/product/edit', data); },
  deleteProduct(id) { return this.post('/api/product/delete', { id }); },
  uploadProductImg(fd) { return this.upload('/api/product/upload', fd); },

  // Equipment
  getEquipmentList(params) { return this.get('/api/equipment/list', params); },
  addEquipment(data) { return this.post('/api/equipment/add', data); },
  editEquipment(data) { return this.post('/api/equipment/edit', data); },
  deleteEquipment(id) { return this.post('/api/equipment/delete', { id }); },
  uploadEquipmentImg(fd) { return this.upload('/api/equipment/upload', fd); },
  getEquipmentByProduct(pid) { return this.get('/api/equipment/by-product/' + pid); },

  // Order
  getOrderList(params) { return this.get('/api/order/list', params); },
  addOrder(data) { return this.post('/api/order/add', data); },
  acceptOrder(id) { return this.post('/api/order/accept', { id }); },
  rejectOrder(id, remark) { return this.post('/api/order/reject', { id, remark }); },
  orderToPlan(id, planStartDate, planEndDate) { return this.post('/api/order/toPlan', { id, planStartDate, planEndDate }); },
  completeOrder(id, remark) { return this.post('/api/order/complete', { id, remark }); },

  // Plan
  getPlanList(params) { return this.get('/api/plan/list', params); },
  getAcceptableOrders() { return this.get('/api/plan/acceptable-orders'); },
  addPlan(data) { return this.post('/api/plan/add', data); },
  editPlan(data) { return this.post('/api/plan/edit', data); },
  startPlan(id) { return this.post('/api/plan/start', { id }); },
  deletePlan(id) { return this.post('/api/plan/delete', { id }); },

  // Schedule
  getScheduleList(params) { return this.get('/api/schedule/list', params); },
  getActivePlans() { return this.get('/api/schedule/active-plans'); },
  addSchedule(data) { return this.post('/api/schedule/add', data); },
  editSchedule(data) { return this.post('/api/schedule/edit', data); },
  startSchedule(id) { return this.post('/api/schedule/start', { id }); },
  deleteSchedule(id) { return this.post('/api/schedule/delete', { id }); },

  // Track
  getActiveSchedules() { return this.get('/api/track/active-schedules'); },
  getWorkList(params) { return this.get('/api/track/list', params); },
  reportWork(data) { return this.post('/api/track/report', data); },
  getScheduleDetail(id) { return this.get('/api/track/schedule-detail/' + id); }
};
