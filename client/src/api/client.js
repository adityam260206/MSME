import axios from 'axios';

/**
 * Axios instance configured for the SpendSense API.
 * 
 * Uses the Vite proxy (configured in vite.config.js) to route `/api` 
 * to the Express backend (localhost:5000), completely bypassing CORS 
 * issues during development.
 */
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Response Interceptor
 * Standardizes error handling. If the backend returns our AppError
 * format { status: 'error', message: '...' }, we extract that message
 * so UI components don't have to dig through `err.response.data.message`.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server sent a formatted error, extract it
    if (error.response && error.response.data) {
      const data = error.response.data;
      
      // Standardize the error object we throw back to the component
      const standardError = new Error(data.message || 'An unexpected error occurred');
      standardError.status = error.response.status;
      standardError.errors = data.errors || []; // Field-level validation errors
      
      return Promise.reject(standardError);
    }
    
    // Network error (server down, CORS block, etc)
    return Promise.reject(new Error(error.message || 'Network error'));
  }
);

export default api;
