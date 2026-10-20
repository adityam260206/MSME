import api from './client';

export const reportsApi = {
  /**
   * Download a CSV of transactions for a given period.
   * Note: We must specify responseType: 'blob' so Axios doesn't
   * try to parse the CSV string as JSON.
   */
  downloadCSV: (period) => api.get('/reports/csv', { 
    params: { period },
    responseType: 'blob' 
  }),
};
