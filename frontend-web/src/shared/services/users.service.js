/**
 * Users Service
 * Handle all user management API calls (CRUD, activate/deactivate, search)
 * For Admin Dashboard - Users Management
 */

import { apiService } from './api.service';

export const usersService = {
  /**
   * Get all users
   * @returns {Promise<User[]>}
   */
  getAll: async () => {
    return await apiService.get('/api/users');
  },

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<User>}
   */
  getById: async (id) => {
    return await apiService.get(`/api/users/${id}`);
  },

  /**
   * Create new user
   * @param {Object} data - { username, password, email, phoneNumber, role }
   * @returns {Promise<User>}
   */
  create: async (data) => {
    return await apiService.post('/api/users', data);
  },

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} data - Update data
   * @returns {Promise<User>}
   */
  update: async (id, data) => {
    return await apiService.put(`/api/users/${id}`, data);
  },

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<{ message: string }>}
   */
  delete: async (id) => {
    return await apiService.delete(`/api/users/${id}`);
  },

  /**
   * Activate user
   * @param {number} id - User ID
   * @returns {Promise<User>}
   */
  activate: async (id) => {
    return await apiService.patch(`/api/users/${id}/activate`);
  },

  /**
   * Deactivate user
   * @param {number} id - User ID
   * @returns {Promise<User>}
   */
  deactivate: async (id) => {
    return await apiService.patch(`/api/users/${id}/deactivate`);
  },

  /**
   * Search users
   * @param {string} query - Search query (username or email)
   * @returns {Promise<User[]>}
   */
  search: async (query) => {
    return await apiService.get('/api/users/search', { params: { query } });
  },

  /**
   * Get online users
   * @returns {Promise<User[]>}
   */
  getOnline: async () => {
    return await apiService.get('/api/users/online');
  },
};
