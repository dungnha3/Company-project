/**
 * Role Change Requests Service
 * Handle role change request workflow (HR create → Admin approve/reject)
 * Match BE endpoints: RoleChangeRequestController.java
 */

import { apiService } from './api.service';

export const roleRequestsService = {
  /**
   * HR Manager creates role change request
   * @param {Object} data - { userId, currentRole, requestedRole, reason }
   * @returns {Promise<RoleChangeRequest>}
   */
  create: async (data) => {
    return await apiService.post('/api/hr/role-change-request', data);
  },

  /**
   * HR Manager views their own requests
   * @returns {Promise<RoleChangeRequest[]>}
   */
  getMyRequests: async () => {
    return await apiService.get('/api/hr/role-change-request/my');
  },

  /**
   * Admin views all pending requests
   * @returns {Promise<RoleChangeRequest[]>}
   */
  getPending: async () => {
    return await apiService.get('/api/admin/role-requests');
  },

  /**
   * Admin approves request
   * @param {number} id - Request ID
   * @param {string} note - Optional approval note
   * @returns {Promise<RoleChangeRequest>}
   */
  approve: async (id, note = '') => {
    return await apiService.post(`/api/admin/role-requests/${id}/approve`, { note });
  },

  /**
   * Admin rejects request
   * @param {number} id - Request ID
   * @param {string} note - Required rejection reason
   * @returns {Promise<RoleChangeRequest>}
   */
  reject: async (id, note) => {
    if (!note || note.trim() === '') {
      throw new Error('Rejection reason is required');
    }
    return await apiService.post(`/api/admin/role-requests/${id}/reject`, { note });
  },
};
