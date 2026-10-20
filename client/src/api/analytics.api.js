import api from './client';

export const analyticsApi = {
  getSummary: (period) => api.get('/analytics/summary', { params: { period } }),
  
  getBreakdown: (period, accountId) => api.get('/analytics/breakdown', { params: { period, accountId } }),
  
  getTrend: () => api.get('/analytics/trend'),

  getHealthScore: () => api.get('/analytics/health'),

  getInsights: () => api.get('/analytics/insights'),
  
  getPrediction: () => api.get('/analytics/prediction'),
};
