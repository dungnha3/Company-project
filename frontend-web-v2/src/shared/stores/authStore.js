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
                    set({
                        user: response.data,
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

                    const expiresAt = Date.now() + (expiresIn || 30 * 60 * 1000);

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);
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

            logout: async () => {
                try {
                    const refreshToken = localStorage.getItem('refreshToken');
                    await apiClient.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    get().clearAuth();
                    window.location.href = '/login';
                }
            },

            clearAuth: () => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('expiresAt');
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
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
