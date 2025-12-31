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
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    return api.post('/login', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
};

export const getStats = () => api.get('/stats');
export const addWafRule = (ip, action) => api.post('/waf/rule', { ip, action });
export const getRules = () => api.get('/waf/rules');
export const toggleRule = (rule_id, enable) => api.post('/waf/rules/toggle', { rule_id, enable });
export const restartNginx = () => api.post('/system/restart');

export default api;