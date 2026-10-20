import api from './client';

export const budgetsApi = {
  /**
   * Fetch budgets for a specific period
   * @param {string} period YYYY-MM
   */
  getAll: (period) => api.get('/budgets', { params: { period } }),
  
  create: (data) => api.post('/budgets', data),
  
  update: (id, data) => api.patch(`/budgets/${id}`, data),
  
  delete: (id) => api.delete(`/budgets/${id}`),
};
