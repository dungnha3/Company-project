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
            isHydrated: false,

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
                    const data = response.data;

                    // 2FA required — return partial result
                    if (data.requiresTwoFactor) {
                        return {
                            success: false,
                            requiresTwoFactor: true,
                            tempToken: data.tempToken,
                        };
                    }

                    const { accessToken, refreshToken, user, expiresIn } = data;

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

            verify2fa: async (tempToken, code) => {
                try {
                    const response = await apiClient.post(ENDPOINTS.AUTH.VERIFY_2FA, { tempToken, code });
                    const { accessToken, refreshToken, user, expiresIn } = response.data;

                    if (user && user.userId) {
                        user.id = user.userId;
                    }

                    const expiresAt = Date.now() + (expiresIn || 30 * 60 * 1000);
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('expiresAt', String(expiresAt));

                    set({
                        user,
                        accessToken,
                        refreshToken,
                        isAuthenticated: true,
                    });

                    return { success: true, user };
                } catch (error) {
                    console.error('2FA verify error:', error);
                    return {
                        success: false,
                        error: error.response?.data?.message || 'Mã xác thực không đúng'
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
                    const { accessToken, refreshToken, user, expiresIn } = response.data;

                    if (accessToken) {
                        if (user && user.userId) {
                            user.id = user.userId;
                        }
                        const expiresAt = Date.now() + (expiresIn || 30 * 60 * 1000);

                        localStorage.setItem('accessToken', accessToken);
                        localStorage.setItem('expiresAt', String(expiresAt));

                        set({
                            user,
                            accessToken,
                            refreshToken,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                        return { success: true, user };
                    }

                    set({ isLoading: false });
                    return { success: true };
                } catch (error) {
                    console.error('Register error:', error);
                    set({ isLoading: false, error: error.response?.data?.message || 'Đăng ký thất bại' });
                    return {
                        success: false,
                        error: error.response?.data?.message || 'Đăng ký thất bại'
                    };
                }
            },

            logout: async () => {
                try {
                    // [FIX] refreshToken is in httpOnly cookie — sent automatically via withCredentials
                    await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    get().clearAuth();
                    window.location.assign('/login');
                }
            },

            clearAuth: () => {
                localStorage.removeItem('accessToken');
                // refreshToken is cleared by backend via Set-Cookie with maxAge=0
                localStorage.removeItem('expiresAt');
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
            onRehydrateStorage: () => () => {
                useAuthStore.setState({ isHydrated: true });
            },
        }
    )
);
