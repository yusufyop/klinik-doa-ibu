import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth headers
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData) {
          config.headers['X-User-Id'] = userData.id;
          config.headers['X-User-Name'] = userData.name;
          config.headers['X-User-Role'] = userData.role;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear user data and redirect to login
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => 
    api.post('/login', { email, password }),
  
  getUsers: () => 
    api.get('/users'),
  
  createUser: (userData) => 
    api.post('/users', userData),
  
  updateUser: (id, userData) => 
    api.put(`/users/${id}`, userData),
  
  resetPassword: (id, newPassword) => 
    api.put(`/users/${id}/password`, { new_password: newPassword }),
  
  deleteUser: (id) => 
    api.delete(`/users/${id}`)
};

// Dashboard API
export const dashboardAPI = {
  getStats: (tanggal) => 
    api.get('/dashboard/stats', { params: { tanggal } })
};

// Patients API
export const patientsAPI = {
  getAll: (params) => 
    api.get('/patients', { params }),
  
  create: (patientData) => 
    api.post('/patients', patientData),
  
  update: (id, patientData) => 
    api.put(`/patients/${id}`, patientData),
  
  delete: (id) => 
    api.delete(`/patients/${id}`),
  
  getHistory: (id) => 
    api.get(`/patients/${id}/history`)
};

// Finance API
export const financeAPI = {
  getAll: (month) => 
    api.get('/finance', { params: { month } }),
  
  createManual: (transactionData) => 
    api.post('/finance/manual', transactionData),
  
  delete: (id) => 
    api.delete(`/finance/${id}`)
};

// Medicines API
export const medicinesAPI = {
  getAll: (params) => 
    api.get('/medicines', { params }),
  
  create: (medicineData) => 
    api.post('/medicines', medicineData),
  
  update: (id, medicineData) => 
    api.put(`/medicines/${id}`, medicineData),
  
  delete: (id) => 
    api.delete(`/medicines/${id}`)
};

// Audit Logs API
export const auditLogsAPI = {
  getAll: (params) => 
    api.get('/audit-logs', { params })
};

// Health check
export const healthAPI = {
  check: () => 
    api.get('/health')
};

export default api;
