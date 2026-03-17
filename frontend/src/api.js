import axios from 'axios';

const base = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: base.endsWith("/api") ? base : (base || "") + "/api",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: Global 401 handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/"; // Redirect to root/login
    }
    return Promise.reject(err);
  }
);

export default api;
