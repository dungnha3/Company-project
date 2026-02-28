import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '@shared/stores/authStore';

// --- Mock apiClient ---
vi.mock('@shared/api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('@shared/api/endpoints', () => ({
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/auth/login',
            GOOGLE_LOGIN: '/api/auth/google',
            REGISTER: '/api/auth/register',
            LOGOUT: '/api/auth/logout',
            ME: '/api/auth/me',
        },
    },
}));

import apiClient from '@shared/api/client';

// --- Spy console.error/warn → ZERO unexpected errors ---
let consoleErrorSpy;
let consoleWarnSpy;

// Helper to reset store to initial state between tests
// NOTE: Do NOT use setState({...}, true) — it replaces ALL state including action functions
const resetStore = () => {
    useAuthStore.setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
    });
};

describe('authStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
        localStorage.clear();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        // Assert ZERO unexpected console errors (allow expected ones checked in specific tests)
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    // ---------------------------------------------------------------
    // Scenario 1: Default state
    // ---------------------------------------------------------------
    it('1. Khởi tạo state mặc định (user=null, isAuthenticated=false, tokens=null)', () => {
        const state = useAuthStore.getState();

        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.accessToken).toBeNull();
        expect(state.refreshToken).toBeNull();
    });

    // ---------------------------------------------------------------
    // Scenario 2: login() success
    // ---------------------------------------------------------------
    it('2. login() thành công → set user, tokens, isAuthenticated=true', async () => {
        const mockUser = { userId: 1, email: 'test@example.com', fullName: 'Test User' };
        apiClient.post.mockResolvedValueOnce({
            data: {
                accessToken: 'access-token-123',
                refreshToken: 'refresh-token-123',
                user: mockUser,
                expiresIn: 1800000,
            },
        });

        const result = await useAuthStore.getState().login({
            email: 'test@example.com',
            password: 'password123',
        });

        // Verify correct API call with correct endpoint + body
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
            email: 'test@example.com',
            password: 'password123',
        });

        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        // user.id normalized from userId
        expect(result.user.id).toBe(1);

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.accessToken).toBe('access-token-123');
        expect(state.refreshToken).toBe('refresh-token-123');
        expect(state.user.email).toBe('test@example.com');
        // localStorage side-effect
        expect(localStorage.getItem('accessToken')).toBe('access-token-123');
        expect(localStorage.getItem('expiresAt')).toBeTruthy();

        // ZERO unexpected console errors
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 3: login() failed — sai credentials
    // ---------------------------------------------------------------
    it('3. login() thất bại (sai credentials) → return error, state không đổi', async () => {
        apiClient.post.mockRejectedValueOnce({
            response: { data: { message: 'Sai email hoặc mật khẩu' } },
        });

        const result = await useAuthStore.getState().login({
            email: 'wrong@example.com',
            password: 'wrong',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Sai email hoặc mật khẩu');

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();

        // login() does call console.error — expected
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // ---------------------------------------------------------------
    // Scenario 4: login() failed — network error
    // ---------------------------------------------------------------
    it('4. login() thất bại (network error) → return error, state không đổi', async () => {
        apiClient.post.mockRejectedValueOnce(new Error('Network Error'));

        const result = await useAuthStore.getState().login({
            email: 'test@example.com',
            password: 'password123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Đăng nhập thất bại'); // fallback message

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();

        // Expected console.error for login error
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // ---------------------------------------------------------------
    // Scenario 5: loginWithGoogle() success
    // ---------------------------------------------------------------
    it('5. loginWithGoogle() thành công → set user, tokens như login', async () => {
        const mockUser = { userId: 2, email: 'google@example.com', fullName: 'Google User' };
        apiClient.post.mockResolvedValueOnce({
            data: {
                accessToken: 'google-access-token',
                refreshToken: 'google-refresh-token',
                user: mockUser,
                expiresIn: 1800000,
            },
        });

        const result = await useAuthStore.getState().loginWithGoogle('google-id-token-xyz');

        // Verify correct API call
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/google', {
            token: 'google-id-token-xyz',
        });

        expect(result.success).toBe(true);
        expect(result.user.id).toBe(2); // normalized

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.accessToken).toBe('google-access-token');
        expect(state.user.email).toBe('google@example.com');
        expect(localStorage.getItem('accessToken')).toBe('google-access-token');

        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 6: loginWithGoogle() failed
    // ---------------------------------------------------------------
    it('6. loginWithGoogle() thất bại (invalid token) → return error', async () => {
        apiClient.post.mockRejectedValueOnce({
            response: { data: { message: 'Invalid Google token' } },
        });

        const result = await useAuthStore.getState().loginWithGoogle('invalid-token');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid Google token');

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // ---------------------------------------------------------------
    // Scenario 7: register() success
    // ---------------------------------------------------------------
    it('7. register() thành công → set user, tokens, isAuthenticated=true', async () => {
        const mockUser = { userId: 3, email: 'new@example.com', fullName: 'New User' };
        apiClient.post.mockResolvedValueOnce({
            data: {
                accessToken: 'reg-access-token',
                refreshToken: 'reg-refresh-token',
                user: mockUser,
                expiresIn: 1800000,
            },
        });

        const result = await useAuthStore.getState().register({
            email: 'new@example.com',
            password: 'StrongP@ss1',
            fullName: 'New User',
        });

        // Verify correct API endpoint + body
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
            email: 'new@example.com',
            password: 'StrongP@ss1',
            fullName: 'New User',
        });

        expect(result.success).toBe(true);
        expect(result.user.id).toBe(3); // normalized

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.accessToken).toBe('reg-access-token');
        expect(state.user.fullName).toBe('New User');

        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 8: register() failed — email already exists
    // ---------------------------------------------------------------
    it('8. register() thất bại (email đã tồn tại) → return error', async () => {
        apiClient.post.mockRejectedValueOnce({
            response: { data: { message: 'Email đã được sử dụng' } },
        });

        const result = await useAuthStore.getState().register({
            email: 'existing@example.com',
            password: 'StrongP@ss1',
            fullName: 'Existing User',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Email đã được sử dụng');

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // ---------------------------------------------------------------
    // Scenario 9: logout() → calls API + clears state + redirects
    // ---------------------------------------------------------------
    it('9. logout() → gọi API + clear user, tokens, isAuthenticated=false', async () => {
        // Setup: simulate logged-in state
        useAuthStore.setState({
            user: { id: 1, email: 'test@example.com' },
            accessToken: 'access-123',
            refreshToken: 'refresh-123',
            isAuthenticated: true,
        });
        localStorage.setItem('accessToken', 'access-123');
        localStorage.setItem('expiresAt', '9999999999');

        apiClient.post.mockResolvedValueOnce({}); // logout API

        // Mock window.location
        const originalLocation = window.location;
        delete window.location;
        window.location = { href: '', assign: vi.fn() };

        await useAuthStore.getState().logout();

        // Verify API call
        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout', expect.any(Object));

        // Verify state cleared
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.refreshToken).toBeNull();
        expect(state.isAuthenticated).toBe(false);

        // Verify localStorage cleared
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('expiresAt')).toBeNull();

        // Verify redirect
        expect(window.location.assign).toHaveBeenCalledWith('/login');

        // Restore window.location
        window.location = originalLocation;
    });

    // ---------------------------------------------------------------
    // Scenario 10: clearAuth() → reset về default state
    // ---------------------------------------------------------------
    it('10. clearAuth() → reset về default state', () => {
        // Setup: logged-in state
        useAuthStore.setState({
            user: { id: 1, email: 'test@example.com' },
            accessToken: 'access-123',
            refreshToken: 'refresh-123',
            isAuthenticated: true,
        });
        localStorage.setItem('accessToken', 'token');
        localStorage.setItem('expiresAt', '123');

        useAuthStore.getState().clearAuth();

        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
        expect(state.refreshToken).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('expiresAt')).toBeNull();
    });

    // ---------------------------------------------------------------
    // Scenario 11: updateUser() → merge userData vào user hiện tại
    // ---------------------------------------------------------------
    it('11. updateUser() → merge userData vào user hiện tại', () => {
        useAuthStore.setState({
            user: { id: 1, email: 'old@example.com', fullName: 'Old Name' },
            isAuthenticated: true,
        });

        useAuthStore.getState().updateUser({ fullName: 'New Name', phone: '0123456789' });

        const state = useAuthStore.getState();
        expect(state.user.fullName).toBe('New Name');
        expect(state.user.phone).toBe('0123456789');
        // Original fields preserved
        expect(state.user.email).toBe('old@example.com');
        expect(state.user.id).toBe(1);
    });

    // ---------------------------------------------------------------
    // Scenario 12: partialize only persists user + isAuthenticated
    // ---------------------------------------------------------------
    it('12. partialize chỉ persist user, isAuthenticated (không accessToken, refreshToken)', () => {
        // The persist config's partialize function defines what gets saved. 
        // Verify by checking the store's persist config.
        // From source: partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
        // So accessToken and refreshToken are NOT persisted.

        useAuthStore.setState({
            user: { id: 1, email: 'test@example.com' },
            accessToken: 'some-token',
            refreshToken: 'some-refresh',
            isAuthenticated: true,
        });

        // Access the persist API to check what would be persisted
        const persistAPI = useAuthStore.persist;
        expect(persistAPI).toBeDefined();
        expect(persistAPI.getOptions).toBeDefined();

        const options = persistAPI.getOptions();
        expect(options.name).toBe('auth-storage');

        // Call partialize to check what fields are included
        const fullState = useAuthStore.getState();
        const persisted = options.partialize(fullState);

        expect(persisted).toHaveProperty('user');
        expect(persisted).toHaveProperty('isAuthenticated');
        // accessToken and refreshToken should NOT be in persisted state
        expect(persisted).not.toHaveProperty('accessToken');
        expect(persisted).not.toHaveProperty('refreshToken');
    });

    // ---------------------------------------------------------------
    // Scenario 13: initAuth() — token exists → fetch user
    // ---------------------------------------------------------------
    it('13. initAuth() token tồn tại → fetch /auth/me → set user', async () => {
        localStorage.setItem('accessToken', 'existing-token');
        apiClient.get.mockResolvedValueOnce({
            data: {
                user: { userId: 10, email: 'restored@example.com', fullName: 'Restored' },
            },
        });

        await useAuthStore.getState().initAuth();

        expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me');
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(true);
        expect(state.user.id).toBe(10); // userId normalized
        expect(state.user.email).toBe('restored@example.com');
    });

    // ---------------------------------------------------------------
    // Scenario 14: initAuth() — no token → clear state
    // ---------------------------------------------------------------
    it('14. initAuth() không có token → isAuthenticated=false', async () => {
        // No token in localStorage
        await useAuthStore.getState().initAuth();

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(apiClient.get).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 15: initAuth() — API error → clearAuth
    // ---------------------------------------------------------------
    it('15. initAuth() API lỗi → clearAuth()', async () => {
        localStorage.setItem('accessToken', 'expired-token');
        apiClient.get.mockRejectedValueOnce(new Error('401 Unauthorized'));

        await useAuthStore.getState().initAuth();

        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
});
