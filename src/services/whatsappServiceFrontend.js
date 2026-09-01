import api from './api';

export const whatsappService = {
  getStatus: () => api.get('/whatsapp/status'),
  initialize: () => api.post('/whatsapp/initialize'),
  disconnect: () => api.post('/whatsapp/disconnect'),
  sendTest: (phone) => api.post('/whatsapp/send-test', { phone }),
};