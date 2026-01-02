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

export const loginUser = (username, password) => {
    return api.post('/login', { username, password });
};

export const getStats = (range = "live") => api.get(`/stats?range=${range}`);
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

export default api;