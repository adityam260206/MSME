import api from './client';

export const recurringApi = {
  getAll: () => api.get('/recurring'),
  
  getById: (id) => api.get(`/recurring/${id}`),
  
  create: (data) => api.post('/recurring', data),
  
  update: (id, data) => api.put(`/recurring/${id}`, data),
  
  delete: (id) => api.delete(`/recurring/${id}`),
  
  toggleStatus: (id) => api.patch(`/recurring/${id}/toggle`),
};
