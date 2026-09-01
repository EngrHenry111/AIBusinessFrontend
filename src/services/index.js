import api from './api';

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
};

// ─── Documents ────────────────────────────────────────────────────────────────
export const documentService = {
  getAll: (params) => api.get('/documents', { params }),
  getOne: (id) => api.get(`/documents/${id}`),
  getStatus: (id) => api.get(`/documents/${id}/status`),
  upload: (formData, onUploadProgress) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  }),
  delete: (id) => api.delete(`/documents/${id}`),
};

// ─── Knowledge Bases ──────────────────────────────────────────────────────────
export const knowledgeBaseService = {
  getAll: () => api.get('/knowledge-bases'),
  create: (data) => api.post('/knowledge-bases', data),
  getOne: (id) => api.get(`/knowledge-bases/${id}`),
  update: (id, data) => api.put(`/knowledge-bases/${id}`, data),
  delete: (id) => api.delete(`/knowledge-bases/${id}`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatService = {
  getAll: (params) => api.get('/chat', { params }),
  create: (data) => api.post('/chat', data),
  getOne: (id) => api.get(`/chat/${id}`),
  update: (id, data) => api.patch(`/chat/${id}`, data),
  delete: (id) => api.delete(`/chat/${id}`),
  ask: (data) => api.post('/chat/ask', data),
  feedback: (id, messageIndex, feedback) => api.patch(`/chat/${id}/feedback`, { messageIndex, feedback }),
};

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leadService = {
  getAll: (params) => api.get('/leads', { params }),
  create: (data) => api.post('/leads', data),
  getOne: (id) => api.get(`/leads/${id}`),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  analyze: (id) => api.post(`/leads/${id}/analyze`),
};

// ─── Meetings ─────────────────────────────────────────────────────────────────
export const meetingService = {
  getAll: (params) => api.get('/meetings', { params }),
  create: (data) => api.post('/meetings', data),
  getOne: (id) => api.get(`/meetings/${id}`),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`),
  summarize: (id, transcript) => api.post(`/meetings/${id}/summarize`, { transcript }),
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoiceService = {
  getAll: (params) => api.get('/invoices', { params }),
  create: (data) => api.post('/invoices', data),
  getOne: (id) => api.get(`/invoices/${id}`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  getOverdue: () => api.get('/invoices/overdue'),
  draftReminder: (id) => api.post(`/invoices/${id}/draft-reminder`),
  getPDF: (id) => `${api.defaults.baseURL}/invoices/${id}/pdf`,
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orderService = {
  getAll: (params) => api.get('/orders', { params }),
  create: (data) => api.post('/orders', data),
  getOne: (id) => api.get(`/orders/${id}`),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  track: (orderNumber) => api.get(`/orders/track/${orderNumber}`),
};

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointmentService = {
  getAll: (params) => api.get('/appointments', { params }),
  create: (data) => api.post('/appointments', data),
  getOne: (id) => api.get(`/appointments/${id}`),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
  getUpcoming: () => api.get('/appointments/upcoming'),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportService = {
  getTypes: () => api.get('/reports/types'),
  generate: (data) => api.post('/reports/generate', data),
};

// ─── Social Media ─────────────────────────────────────────────────────────────
export const socialService = {
  generateContentPlan: (data) => api.post('/social/content-plan', data),
  generateCaption: (data) => api.post('/social/caption', data),
  generateHashtags: (data) => api.post('/social/hashtags', data),
  generateCampaign: (data) => api.post('/social/campaign-ideas', data),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getInsights: () => api.get('/analytics/insights'),
};

// ─── Agents ───────────────────────────────────────────────────────────────────
export const agentService = {
  getAll: () => api.get('/agents'),
  run: (agentId, input, options) => api.post('/agents/run', { agentId, input, options }),
};

// ─── Company ──────────────────────────────────────────────────────────────────
export const companyService = {
  get: () => api.get('/companies'),
  update: (data) => api.patch('/companies', data),
  getUsage: () => api.get('/companies/usage'),
  updateAISettings: (data) => api.patch('/companies/ai-settings', data),
};

// ─── Users / Team ─────────────────────────────────────────────────────────────
export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  changePassword: (data) => api.patch('/users/change-password', data),
  getTeam: () => api.get('/users/team'),
  inviteMember: (data) => api.post('/users/team/invite', data),
  updateMemberRole: (id, role) => api.patch(`/users/team/${id}/role`, { role }),
  removeMember: (id) => api.delete(`/users/team/${id}`),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentService = {
  getPlans: () => api.get('/payments/plans'),
  initialize: (plan, billingCycle) => api.post('/payments/initialize', { plan, billingCycle }),
  verify: (reference) => api.get(`/payments/verify/${reference}`),
  getHistory: () => api.get('/payments/history'),
  cancel: () => api.post('/payments/cancel'),
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
export const whatsappService = {
  getStatus: () => api.get('/whatsapp/status'),
  initialize: () => api.post('/whatsapp/initialize'),
  disconnect: () => api.post('/whatsapp/disconnect'),
  sendTest: (phone) => api.post('/whatsapp/send-test', { phone }),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messageService = {
  getConversations: () => api.get('/messages/conversations'),
  getConversation: (userId) => api.get(`/messages/${userId}`),
  sendMessage: (userId, content) => api.post(`/messages/${userId}`, { content }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  getUnreadCount: () => api.get('/messages/unread-count'),
};

// ─── Search ───────────────────────────────────────────────────────────────────
export const searchService = {
  search: (q) => api.get('/search', { params: { q } }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationService = {
  getAll: () => api.get('/notifications'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getCompanies: (params) => api.get('/admin/companies', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendCompany: (id) => api.patch(`/admin/companies/${id}/suspend`),
  activateCompany: (id) => api.patch(`/admin/companies/${id}/activate`),
  updatePlan: (id, plan) => api.patch(`/admin/companies/${id}/plan`, { plan }),
};
