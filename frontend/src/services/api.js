import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getStats = () => api.get('/stats');
export const addWafRule = (ip, action) => api.post('/waf/rule', { ip, action });
export const restartNginx = () => api.post('/system/restart');

export default api;