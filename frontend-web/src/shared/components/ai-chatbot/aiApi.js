import { apiService } from '@/shared/services/api.service';

/**
 * AI ChatBot API Service
 */
export const aiApi = {
  // Kiểm tra trạng thái AI service
  getStatus: () => apiService.get('/api/ai/status'),
  
  // Lấy danh sách dự án của user
  getMyProjects: () => apiService.get('/api/projects/my-projects'),
  
  // Chat với AI
  chat: (data) => apiService.post('/api/ai/chat', data),
  
  // Quick actions
  summarizeProject: (projectId) => apiService.post(`/api/ai/projects/${projectId}/summarize`),
  summarizeSprint: (projectId) => apiService.post(`/api/ai/projects/${projectId}/summarize-sprint`),
  suggestTasks: (projectId) => apiService.post(`/api/ai/projects/${projectId}/suggest-tasks`),
  analyzeProgress: (projectId) => apiService.post(`/api/ai/projects/${projectId}/analyze`),
  generateReport: (projectId) => apiService.post(`/api/ai/projects/${projectId}/report`),
  
  // Conversations
  getConversations: (page = 0, size = 20) => 
    apiService.get(`/api/ai/conversations?page=${page}&size=${size}`),
  getConversation: (conversationId) => 
    apiService.get(`/api/ai/conversations/${conversationId}`),
  deleteConversation: (conversationId) => 
    apiService.delete(`/api/ai/conversations/${conversationId}`),
  
  // Actions - Thực thi hành động từ AI (tạo project, task, sprint...)
  executeAction: (action) => apiService.post('/api/ai/actions/execute', action),
  executeBatchActions: (actions) => apiService.post('/api/ai/actions/execute-batch', actions),
  
  // Help
  getHelp: () => apiService.get('/api/ai/help'),
};

export default aiApi;
