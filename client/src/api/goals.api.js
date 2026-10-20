import api from './client';

export const goalsApi = {
  getAll: () => api.get('/goals'),
  
  getById: (id) => api.get(`/goals/${id}`),
  
  create: (data) => api.post('/goals', data),
  
  update: (id, data) => api.put(`/goals/${id}`, data),
  
  delete: (id) => api.delete(`/goals/${id}`),
};
