import axios from 'axios';

function getBaseUrl() {
  const stored = localStorage.getItem('inventorysmart_api_url');
  if (stored && stored.trim()) {
    return `${stored.replace(/\/+$/, '')}/api`;
  }
  return '/api';
}

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
      localStorage.removeItem('superadmin_user');
      window.location.href = '/';
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
  createUser: (data) => superadminApi.post('/superadmin/users', data),
};
