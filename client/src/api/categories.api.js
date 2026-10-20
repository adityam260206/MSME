import api from './client';

export const categoriesApi = {
  getAll: () => api.get('/categories'),
  
  create: (data) => api.post('/categories', data),
  
  update: (id, data) => api.patch(`/categories/${id}`, data),
  
  delete: (id) => api.delete(`/categories/${id}`),
};
