import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getStats = () => api.get('/api/leads');
export const importLeads = (formData) => api.post('/import-leads', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const runCampaign = () => api.post('/api/leads/send');

export default api;
