import api from './client';

export const aiApi = {
  chat: (messages) => api.post('/ai/chat', { messages })
};
