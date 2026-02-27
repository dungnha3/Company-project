import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // State
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,

            // Actions
            initAuth: async () => {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    set({ isAuthenticated: false, user: null });
                    return;
                }

                try {
                    const response = await apiClient.get(ENDPOINTS.AUTH.ME);
                    // [FIX] API /auth/me returns AuthResponse, user is nested inside .user
                    const authData = response.data;
                    const userData = authData.user || authData; // Fallback if structure changes

                    // Normalize userId -> id
                    if (userData && userData.userId) {
                        userData.id = userData.userId;
                    }

                    set({
                        user: userData,
                        isAuthenticated: true,
                    });
                } catch (error) {
                    console.error('Failed to init auth:', error);
                    get().clearAuth();
                }
            },

            login: async (credentials) => {
                try {
                    const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
                    const { accessToken, refreshToken, user, expiresIn } = response.data;

                    // [FIX] Normalize User ID (BE sends 'userId', FE sometimes expects 'id')
                    if (user && user.userId) {
                        user.id = user.userId;
                    }

                    const expiresAt = Date.now() + (expiresIn || 30 * 60 * 1000);

                    localStorage.setItem('accessToken', accessToken);
                    // refreshToken now stored in httpOnly cookie by backend
                    localStorage.setItem('expiresAt', String(expiresAt));

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                    });

                    return { success: true, user };
                } catch (error) {
                    console.error('Login error:', error);
                    return {
                        success: false,
                        error: error.response?.data?.message || 'Đăng nhập thất bại'
                    };
                }
            },

            loginWithGoogle: async (idToken) => {
                try {
                    const response = await apiClient.post(ENDPOINTS.AUTH.GOOGLE_LOGIN, { token: idToken });
                    const { accessToken, refreshToken, user, expiresIn } = response.data;

                    // [FIX] Normalize User ID
                    if (user && user.userId) {
                        user.id = user.userId;
                    }

                    const expiresAt = Date.now() + (expiresIn || 30 * 60 * 1000);

                    localStorage.setItem('accessToken', accessToken);
                    // refreshToken now stored in httpOnly cookie by backend
                    localStorage.setItem('expiresAt', String(expiresAt));

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                    });

                    return { success: true, user };
                } catch (error) {
                    console.error('Google Login error:', error);
                    return {
                        success: false,
                        error: error.response?.data?.message || 'Đăng nhập Google thất bại'
                    };
                }
            },

            register: async (userData) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, userData);
                    // Register usually returns AuthResponse same as login, or just success message
                    // Let's assume it returns AuthResponse for auto-login
                    const { accessToken, refreshToken, user, expiresIn } = response.data;

                    if (accessToken) {
                        // [FIX] Normalize User ID
                        if (user && user.userId) {
                            user.id = user.userId;
                        }
                        const expiresAt = Date.now() + (expiresIn || 30 * 60 * 1000);

                        localStorage.setItem('accessToken', accessToken);
                        // refreshToken now stored in httpOnly cookie by backend
                        localStorage.setItem('expiresAt', String(expiresAt));

                        set({
                            user,
                            accessToken,
                            refreshToken,
                            isAuthenticated: true,
                        });
                        return { success: true, user };
                    }

                    return { success: true };
                } catch (error) {
                    console.error('Register error:', error);
                    return {
                        success: false,
                        error: error.response?.data?.message || 'Đăng ký thất bại'
                    };
                }
            },

            logout: async () => {
                try {
                    const refreshToken = localStorage.getItem('refreshToken');
                    await apiClient.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    get().clearAuth();
                    // Force reload to clear all memory states and let App Router handle redirect
                    window.location.href = '/login';
                    // Wait, window.location.href = '/login' KEEPS the port if it's a relative path.
                    // Why did user get localhost refused? Maybe their browser or some environment quirk?
                    // Let's try explicit reload.
                    // window.location.reload(); 
                    // Actually, if I just clearAuth, existing components might react.
                    // But to be safe vs the "port loss" issue, let's just use window.location.href but make sure it works.
                    // If the user visited http://localhost/login (port 80) manually, then obviously it fails if server is on 5173.
                    // But if they are on 5173, '/login' stays on 5173.

                    // Let's try:
                    window.location.assign('/login');
                }
            },

            clearAuth: () => {
                localStorage.removeItem('accessToken');
                // refreshToken is cleared by backend via Set-Cookie with maxAge=0
                localStorage.removeItem('expiresAt');
                localStorage.removeItem('workspace-storage'); // Clear stale workspace data
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
            },

            updateUser: (userData) => {
                set((state) => ({
                    user: { ...state.user, ...userData }
                }));
            },

            setUser: (user) => set({ user }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
