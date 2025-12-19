/**
 * Auth Context
 * Global authentication state management
 * Handle login, logout, session management with error handling
 */

import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { useErrorHandler } from '@/shared/hooks';
import { 
  getToken, 
  setAuthData, 
  removeToken, 
  getUserRole,
  getUsername,
  isTokenValid 
} from '@/shared/utils/storage.utils';
import { ROLE_ROUTES } from '@/shared/constants/roles.constants';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { handleError } = useErrorHandler();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      const valid = isTokenValid();

      if (token && valid) {
        // Token exists and valid, fetch user profile
        try {
          const userData = await authService.getProfile();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          removeToken();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // No valid token
        removeToken();
        setUser(null);
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login handler
   */
  const login = useCallback(async (credentials) => {
    try {
      const response = await authService.login(credentials);
      
      console.log('Login response:', response); // Debug log
      
      // Response có thể có format: { accessToken, refreshToken, user: { role, username }, expiresIn }
      const userRole = response.user?.role || response.role;
      const userName = response.user?.username || response.username;
      
      // Calculate expiresAt from expiresIn (backend returns ms)
      let expiresAt = response.expiresAt;
      if (!expiresAt && response.expiresIn) {
        expiresAt = Date.now() + response.expiresIn;
      }
      
      // Extract user info
      const userData = {
        userId: response.user?.userId || response.userId,
        username: userName,
        email: response.user?.email || response.email,
        role: userRole,
        isActive: response.user?.isActive !== false,
      };
      
      // Save auth data to localStorage (include userId and email)
      const authData = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType || 'Bearer',
        role: userRole,
        username: userName,
        userId: String(userData.userId),
        email: userData.email,
        expiresAt: String(expiresAt),
      };
      
      setAuthData(authData);
      
      setUser(userData);
      setIsAuthenticated(true);

      console.log('✅ User logged in:', userData);

      return { 
        success: true, 
        user: userData,
        role: userRole,
        redirectTo: ROLE_ROUTES[userRole] || '/'
      };
    } catch (error) {
      const errorMessage = handleError(error, { context: 'login' });
      console.error('❌ Login error:', errorMessage);
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }, [handleError]);

  /**
   * Logout handler - Current session only
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('⚠️ Logout API error (continuing):', error.message);
    } finally {
      // Always clear local state
      removeToken();
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
    }
  }, []);

  /**
   * Logout from all devices
   */
  const logoutAllDevices = useCallback(async () => {
    try {
      if (!user?.userId) {
        throw new Error('No user logged in');
      }
      
      await authService.logoutAllDevices(user.userId);
      console.log('✅ Logged out from all devices');
      
      // Clear local state
      removeToken();
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
      
      return { success: true };
    } catch (error) {
      const errorMessage = handleError(error, { context: 'logout_all_devices' });
      console.error('❌ Logout all devices error:', errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }, [user, handleError]);

  /**
   * Get current user from localStorage (for quick access)
   */
  const getCurrentUserFromStorage = useCallback(() => {
    return {
      username: getUsername(),
      role: getUserRole(),
    };
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    logoutAllDevices,
    getCurrentUserFromStorage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
