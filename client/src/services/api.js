/**
 * @module api
 * @description Модуль HTTP-клиента для взаимодействия с бэкендом API.
 * Содержит настроенные экземпляры axios с перехватчиками запросов/ответов,
 * а также объекты API для каждого ресурса приложения (оборудование, работы, сотрудники и т.д.).
 */

import axios from 'axios';

/** Получает базовый URL API из localStorage или использует /api по умолчанию */
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

/** API для работы с оборудованием */
export const equipmentAPI = {
  getAll: (params) => api.get('/equipment', { params }),
  getById: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  getQR: (id) => api.get(`/equipment/${id}/qr`),
  uploadInstructionPdf: (id, formData) => api.post(`/equipment/${id}/instruction-pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteInstructionPdf: (id) => api.delete(`/equipment/${id}/instruction-pdf`),
  updateInstructionMd: (id, content) => api.put(`/equipment/${id}/instruction-md`, { content }),
};

/** API для работы с категориями оборудования */
export const equipmentCategoriesAPI = {
  getAll: () => api.get('/equipment-categories'),
  getById: (id) => api.get(`/equipment-categories/${id}`),
  create: (data) => api.post('/equipment-categories', data),
  update: (id, data) => api.put(`/equipment-categories/${id}`, data),
  delete: (id) => api.delete(`/equipment-categories/${id}`),
};

/** API для работы с наряд-заказами (журнал работ) */
export const workOrderAPI = {
  getAll: () => api.get('/work-orders'),
  getById: (id) => api.get(`/work-orders/${id}`),
  getByEquipment: (equipmentId) => api.get(`/work-orders/equipment/${equipmentId}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.put(`/work-orders/${id}`, data),
  delete: (id) => api.delete(`/work-orders/${id}`),
  accept: (id) => api.post(`/work-orders/${id}/accept`),
};

/** API для справочника работ */
export const worksAPI = {
  getAll: (params) => api.get('/works', { params }),
  getById: (id) => api.get(`/works/${id}`),
  create: (data) => api.post('/works', data),
  update: (id, data) => api.put(`/works/${id}`, data),
  delete: (id) => api.delete(`/works/${id}`),
};

/** API для справочника помещений */
export const roomsAPI = {
  getAll: (params) => api.get('/rooms', { params }),
  getById: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
};

/** API для справочника сотрудников */
export const employeesAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

/** API для управления пользователями системы */
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

/** API для работы с QR-сканером */
export const scanAPI = {
  scanQR: (qrCode) => api.get(`/scan/${qrCode}`),
  completeTask: (data) => api.post('/scan/complete', data),
};

/** API для получения событий календаря */
export const calendarAPI = {
  getEvents: (month, year) => api.get('/calendar', { params: { month, year } }),
};

/** API для управления уведомлениями */
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

/** API для работы с инцидентами (поломками) */
export const incidentsAPI = {
  getAll: (params) => api.get('/incidents', { params }),
  getById: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  delete: (id) => api.delete(`/incidents/${id}`),
};

/** API для управления запасными частями (ЗИП) */
export const sparePartsAPI = {
  getAll: (params) => api.get('/spare-parts', { params }),
  getById: (id) => api.get(`/spare-parts/${id}`),
  getByEquipment: (equipmentId) => api.get('/spare-parts', { params: { equipmentId } }),
  create: (data) => api.post('/spare-parts', data),
  update: (id, data) => api.put(`/spare-parts/${id}`, data),
  delete: (id) => api.delete(`/spare-parts/${id}`),
  replenish: (items) => api.post('/spare-parts/replenish', { items }),
};

/** API для документов поступления ЗИП */
export const sparePartsReceiptsAPI = {
  getAll: () => api.get('/spare-parts-receipts'),
  getById: (id) => api.get(`/spare-parts-receipts/${id}`),
  getNextNumber: () => api.get('/spare-parts-receipts/next-number'),
  create: (data) => api.post('/spare-parts-receipts', data),
  delete: (id) => api.delete(`/spare-parts-receipts/${id}`),
};

/** API для аналитических данных */
export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics'),
  getSummary: () => api.get('/analytics/summary'),
};

/** API для план-графика работ */
export const scheduleAPI = {
  getSchedule: (params) => api.get('/schedule', { params }),
};

/** API для типовых неисправностей */
export const commonFaultsAPI = {
  getAll: () => api.get('/common-faults'),
  getByEquipment: (equipmentId) => api.get(`/common-faults/equipment/${equipmentId}`),
  create: (data) => api.post('/common-faults', data),
  update: (id, data) => api.put(`/common-faults/${id}`, data),
  delete: (id) => api.delete(`/common-faults/${id}`),
};

/** API для причин возникновения */
export const causesAPI = {
  getAll: () => api.get('/causes'),
  create: (data) => api.post('/causes', data),
  update: (id, data) => api.put(`/causes/${id}`, data),
  delete: (id) => api.delete(`/causes/${id}`),
};

/** API для причин просрочки выполнения работ */
export const overdueReasonsAPI = {
  getAll: () => api.get('/overdue-reasons'),
  create: (data) => api.post('/overdue-reasons', data),
  update: (id, data) => api.put(`/overdue-reasons/${id}`, data),
  delete: (id) => api.delete(`/overdue-reasons/${id}`),
};

/** API для импорта данных из Excel */
export const importAPI = {
  importExcel: (formData) => api.post('/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  downloadTemplate: () => api.get('/import/template', { responseType: 'blob' }),
};

/** API для управления данными компании */
export const companyAPI = {
  get: () => api.get('/company'),
  update: (formData) => api.put('/company', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

/** API для активации лицензии */
export const licenseAPI = {
  activate: (key) => api.post('/company/activate-license', { key }),
};

/** API для справочника должностей */
export const positionsAPI = {
  getAll: () => api.get('/positions'),
  getById: (id) => api.get(`/positions/${id}`),
  create: (data) => api.post('/positions', data),
  update: (id, data) => api.put(`/positions/${id}`, data),
  delete: (id) => api.delete(`/positions/${id}`),
};

/** API для управления наработкой оборудования */
export const operatingHoursAPI = {
  getByEquipmentId: (equipmentId) => api.get(`/equipment/${equipmentId}/operating-hours`),
  upsert: (equipmentId, data) => api.put(`/equipment/${equipmentId}/operating-hours`, data),
  delete: (equipmentId) => api.delete(`/equipment/${equipmentId}/operating-hours`),
  addInterval: (operatingHoursId, data) => api.post(`/operating-hours/${operatingHoursId}/intervals`, data),
  updateInterval: (intervalId, data) => api.put(`/operating-hours/intervals/${intervalId}`, data),
  deleteInterval: (intervalId) => api.delete(`/operating-hours/intervals/${intervalId}`),
};

/** Экземпляр API для суперадминистратора (отдельная авторизация) */
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

/** API для панели суперадминистратора */
export const superadminAPI = {
  login: (username, password) => superadminApi.post('/superadmin/login', { username, password }),
  getCompanies: () => superadminApi.get('/superadmin/companies'),
  getUsers: () => superadminApi.get('/superadmin/users'),
  createCompany: (companyName) => superadminApi.post('/superadmin/companies', { companyName }),
  generateLicense: (companyId, plan, daysValid) => superadminApi.post('/superadmin/generate-license', { companyId, plan, daysValid }),
};

export default api;
