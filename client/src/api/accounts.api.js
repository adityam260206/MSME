import api from './client';

export const accountsApi = {
  getAll: () => api.get('/accounts'),
  
  getById: (id) => api.get(`/accounts/${id}`),
  
  create: (data) => api.post('/accounts', data),
  
  update: (id, data) => api.put(`/accounts/${id}`, data),
  
  delete: (id) => api.delete(`/accounts/${id}`),

  transfer: (data) => api.post('/accounts/transfer', data),
};
