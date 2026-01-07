import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Setiap request keluar, tempelkan Token dari localStorage
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor: Setiap response masuk, cek jika 401 Unauthorized
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const loginUser = (username, password) => {
    return api.post('/login', { username, password });
};

export const getStats = (range = "live") => api.get(`/stats?range=${range}`);
export const exportReport = (format = "html") => api.get(`/reports/export?format=${format}`, { responseType: 'blob' });
export const addWafRule = (ip, action, note = "", duration = "Permanent") => api.post('/waf/rule', { ip, action, note, duration });
export const getActiveIps = () => api.get('/waf/active-ips');
export const getIpRules = () => api.get('/waf/ip-rules');
export const deleteIpRule = (ip) => api.delete(`/waf/rule?ip=${ip}`);
export const getRules = () => api.get('/waf/rules');
export const toggleRule = (rule_id, enable) => api.post('/waf/rules/toggle', { rule_id, enable });
export const getCustomRules = () => api.get('/waf/custom');
export const saveCustomRules = (content) => api.post('/waf/custom', { content });
export const restartNginx = () => api.post('/system/restart');
export const getSystemStatus = () => api.get('/system/status');
export const clearWafCache = () => api.post('/system/clear-cache');
export const manageService = (serviceName, action) => api.post(`/system/services/${serviceName}/${action}`);
export const factoryReset = () => api.post('/system/factory-reset');
export const getLogs = (params) => api.get('/logs', { params });

// User Management
export const getUserProfile = () => api.get('/user');
export const updateUserProfile = (full_name) => api.put('/user/profile', { full_name });
export const changePassword = (current_password, new_password) => api.put('/user/password', { current_password, new_password });

export const getHotlinkConfig = async () => {
    const response = await api.get('/waf/hotlink');
    return response.data;
};

export const saveHotlinkConfig = async (config) => {
    const response = await api.post('/waf/hotlink', config);
    return response.data;
};

export default api;