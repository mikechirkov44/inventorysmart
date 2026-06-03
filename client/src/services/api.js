import axios from 'axios';

function getBaseUrl() {
  const stored = localStorage.getItem('inventorysmart_api_url');
  if (stored && stored.trim()) {
    return `${stored.replace(/\/+$/, '')}/api`;
  }
  return '/api';
}

const api = axios.create({
  baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const equipmentAPI = {
  getAll: (params) => api.get('/equipment', { params }),
  getById: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  getQR: (id) => api.get(`/equipment/${id}/qr`),
};

export const workOrderAPI = {
  getAll: () => api.get('/work-orders'),
  getById: (id) => api.get(`/work-orders/${id}`),
  getByEquipment: (equipmentId) => api.get(`/work-orders/equipment/${equipmentId}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.put(`/work-orders/${id}`, data),
  delete: (id) => api.delete(`/work-orders/${id}`),
};

export const worksAPI = {
  getAll: (params) => api.get('/works', { params }),
  getById: (id) => api.get(`/works/${id}`),
  create: (data) => api.post('/works', data),
  update: (id, data) => api.put(`/works/${id}`, data),
  delete: (id) => api.delete(`/works/${id}`),
};

export const roomsAPI = {
  getAll: (params) => api.get('/rooms', { params }),
  getById: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
};

export const employeesAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const scanAPI = {
  scanQR: (qrCode) => api.get(`/scan/${qrCode}`),
  completeTask: (data) => api.post('/scan/complete', data),
};

export const calendarAPI = {
  getEvents: (month, year) => api.get('/calendar', { params: { month, year } }),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const incidentsAPI = {
  getAll: (params) => api.get('/incidents', { params }),
  getById: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  delete: (id) => api.delete(`/incidents/${id}`),
};

export const sparePartsAPI = {
  getAll: (params) => api.get('/spare-parts', { params }),
  getById: (id) => api.get(`/spare-parts/${id}`),
  getByEquipment: (equipmentId) => api.get('/spare-parts', { params: { equipmentId } }),
  create: (data) => api.post('/spare-parts', data),
  update: (id, data) => api.put(`/spare-parts/${id}`, data),
  delete: (id) => api.delete(`/spare-parts/${id}`),
  replenish: (items) => api.post('/spare-parts/replenish', { items }),
};

export const sparePartsReceiptsAPI = {
  getAll: () => api.get('/spare-parts-receipts'),
  getById: (id) => api.get(`/spare-parts-receipts/${id}`),
  getNextNumber: () => api.get('/spare-parts-receipts/next-number'),
  create: (data) => api.post('/spare-parts-receipts', data),
  delete: (id) => api.delete(`/spare-parts-receipts/${id}`),
};

export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics'),
  getSummary: () => api.get('/analytics/summary'),
};

export const scheduleAPI = {
  getSchedule: (params) => api.get('/schedule', { params }),
};

export const importAPI = {
  importExcel: (formData) => api.post('/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  downloadTemplate: () => api.get('/import/template', { responseType: 'blob' }),
};

export const companyAPI = {
  get: () => api.get('/company'),
  update: (formData) => api.put('/company', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const licenseAPI = {
  activate: (key) => api.post('/company/activate-license', { key }),
};

export const positionsAPI = {
  getAll: () => api.get('/positions'),
  getById: (id) => api.get(`/positions/${id}`),
  create: (data) => api.post('/positions', data),
  update: (id, data) => api.put(`/positions/${id}`, data),
  delete: (id) => api.delete(`/positions/${id}`),
};

const superadminApi = axios.create({
  baseURL: getBaseUrl(),
});

superadminApi.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  const token = localStorage.getItem('superadmin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

superadminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('superadmin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const superadminAPI = {
  login: (username, password) => superadminApi.post('/superadmin/login', { username, password }),
  getCompanies: () => superadminApi.get('/superadmin/companies'),
  getUsers: () => superadminApi.get('/superadmin/users'),
  createCompany: (companyName) => superadminApi.post('/superadmin/companies', { companyName }),
  generateLicense: (companyId, plan, daysValid) => superadminApi.post('/superadmin/generate-license', { companyId, plan, daysValid }),
};

export default api;
