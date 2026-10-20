import api from './client';

/**
 * Auth API methods.
 * Abstracts the Axios calls so components just call authApi.login(data).
 */
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  verifyPassword: (data) => api.post('/auth/verify-password', data),
};
