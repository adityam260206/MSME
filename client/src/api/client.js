import axios from 'axios';

/**
 * Axios instance configured for MSME360 API.
 * Uses Vite proxy to forward `/api` to FastAPI server.
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data) {
      const data = error.response.data;
      const message = data.message || (typeof data.detail === 'string' ? data.detail : 'An unexpected error occurred');
      const standardError = new Error(message);
      standardError.status = error.response.status;
      standardError.errorCode = data.error_code || 'UNKNOWN_ERROR';
      standardError.details = data.details || [];
      return Promise.reject(standardError);
    }
    return Promise.reject(new Error(error.message || 'Network error connecting to MSME360 server'));
  }
);

export default api;
