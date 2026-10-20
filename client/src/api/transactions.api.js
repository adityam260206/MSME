import api from './client';

export const transactionsApi = {
  /**
   * Fetch transactions with pagination and filters
   * @param {Object} params { page, limit, startDate, endDate, categoryId, type }
   */
  getAll: (params = {}) => api.get('/transactions', { params }),
  
  create: (data) => api.post('/transactions', data),
  
  update: (id, data) => api.patch(`/transactions/${id}`, data),
  
  delete: (id) => api.delete(`/transactions/${id}`),
};
