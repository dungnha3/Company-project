/**
 * Authentication Service
 * Handle all auth-related API calls (login, logout, refresh, validate, session management)
 * Replicate from BE AuthController.java
 */

import { apiService } from '@/shared/services/api.service';
import { API_ENDPOINTS } from '@/config/api.config';
import { getRefreshToken } from '@/shared/utils/storage.utils';

export const authService = {
  /**
   * Login user
   * @param {Object} credentials - { username, password }
   * @returns {Promise<AuthResponse>} - { accessToken, refreshToken, user: { userId, username, email, role, isActive }, expiresIn }
   * @throws {UnauthorizedException} - Invalid credentials or account disabled
   */
  login: async (credentials) => {
    const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response;
  },

  /**
   * Logout current session
   * @param {Object} options - { refreshToken?, sessionId? }
   * @returns {Promise<{ message: string }>}
   */
  logout: async (options = {}) => {
    try {
      const refreshToken = options.refreshToken || getRefreshToken();
      const payload = {
        refreshToken,
        sessionId: options.sessionId,
      };
      
      const response = await apiService.post(API_ENDPOINTS.AUTH.LOGOUT, payload);
      return response;
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw - logout should always succeed on client side
      return { message: 'Logged out locally' };
    }
  },

  /**
   * Logout from all devices
   * @param {number} userId - User ID to logout all devices
   * @returns {Promise<{ message: string }>}
   */
  logoutAllDevices: async (userId) => {
    const response = await apiService.post(
      `${API_ENDPOINTS.AUTH.LOGOUT_ALL}?userId=${userId}`
    );
    return response;
  },

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<AuthResponse>} - New tokens
   * @throws {UnauthorizedException} - Invalid or expired refresh token
   */
  refreshToken: async (refreshToken) => {
    const response = await apiService.post(API_ENDPOINTS.AUTH.REFRESH, {
      refreshToken,
    });
    return response;
  },

  /**
   * Validate token
   * @param {string} token - JWT token to validate
   * @returns {Promise<{ valid: boolean, message: string }>}
   */
  validateToken: async (token) => {
    try {
      const response = await apiService.get(
        `${API_ENDPOINTS.AUTH.VALIDATE}?token=${token}`
      );
      return response;
    } catch (error) {
      // Token invalid
      return {
        valid: false,
        message: error.response?.data?.message || 'Token không hợp lệ',
      };
    }
  },

  /**
   * Get current user profile
   * @returns {Promise<User>} - User object
   */
  getProfile: async () => {
    const response = await apiService.get(API_ENDPOINTS.AUTH.PROFILE);
    return response;
  },

  /**
   * Check if user is authenticated (client-side check)
   * @returns {boolean}
   */
  isAuthenticated: () => {
    const token = localStorage.getItem('accessToken');
    const expiresAt = localStorage.getItem('expiresAt');
    
    if (!token || !expiresAt) return false;
    
    return Number(expiresAt) > Date.now();
  },

  /**
   * Get current session info from localStorage
   * @returns {Object|null} - { userId, username, role, email }
   */
  getCurrentSession: () => {
    if (!authService.isAuthenticated()) return null;
    
    return {
      userId: localStorage.getItem('userId'),
      username: localStorage.getItem('username'),
      role: localStorage.getItem('userRole'),
      email: localStorage.getItem('email'),
    };
  },
};
