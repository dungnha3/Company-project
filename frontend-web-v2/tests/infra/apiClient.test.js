import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

/**
 * API Client Interceptor Tests
 *
 * Domain context:
 * - accessToken is stored in localStorage ('accessToken')
 * - Workspace context is stored in localStorage ('workspace-storage')
 * - Legacy fallback reads from 'company-storage'
 * - Response interceptor handles: 403 (Feature Disabled), 400 (Quota), 401 (token refresh)
 * - Token refresh uses httpOnly cookie (withCredentials: true), NOT localStorage refreshToken
 * - SYSTEM_ADMIN routes are separate (/admin/*) — this client is shared by all routes
 */

// We need to test the interceptors that are registered on apiClient.
// Since apiClient is created at module load, we test its behavior directly.

// Mock axios.create to capture interceptors
const mockRequestInterceptors = [];
const mockResponseInterceptors = [];

// Create a callable mock (vi.fn) with interceptor capture
const mockAxiosInstance = vi.fn().mockResolvedValue({ data: 'retry-success' });
mockAxiosInstance.interceptors = {
    request: {
        use: vi.fn((onFulfilled, onRejected) => {
            mockRequestInterceptors.push({ onFulfilled, onRejected });
        }),
    },
    response: {
        use: vi.fn((onFulfilled, onRejected) => {
            mockResponseInterceptors.push({ onFulfilled, onRejected });
        }),
    },
};
mockAxiosInstance.defaults = { headers: { common: {} } };
mockAxiosInstance.get = vi.fn();
mockAxiosInstance.post = vi.fn();

vi.mock('axios', () => ({
    default: {
        create: vi.fn(() => mockAxiosInstance),
        post: vi.fn(),
    },
}));

let consoleErrorSpy;
let consoleWarnSpy;

describe('apiClient (interceptors)', () => {
    let requestInterceptor;
    let responseInterceptor;

    beforeEach(async () => {
        vi.clearAllMocks();
        localStorage.clear();
        mockRequestInterceptors.length = 0;
        mockResponseInterceptors.length = 0;
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        // Re-import to trigger module execution and interceptor registration
        vi.resetModules();
        await import('@shared/api/client');

        requestInterceptor = mockRequestInterceptors[0]?.onFulfilled;
        responseInterceptor = mockResponseInterceptors[0]?.onRejected;
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    // =================================================================
    // Request Interceptor — Auth Token
    // =================================================================
    describe('Request Interceptor: Auth Token', () => {
        it('1. Có accessToken → thêm Authorization: Bearer header', () => {
            localStorage.setItem('accessToken', 'my-token-123');

            const config = { headers: {} };
            const result = requestInterceptor(config);

            expect(result.headers.Authorization).toBe('Bearer my-token-123');
        });

        it('2. Không có accessToken → không thêm Authorization header', () => {
            const config = { headers: {} };
            const result = requestInterceptor(config);

            expect(result.headers.Authorization).toBeUndefined();
        });
    });

    // =================================================================
    // Request Interceptor — Workspace Headers
    // =================================================================
    describe('Request Interceptor: Workspace Headers', () => {
        it('3. workspace-storage PERSONAL → thêm X-Workspace-Type=PERSONAL', () => {
            localStorage.setItem('workspace-storage', JSON.stringify({
                state: { workspaceType: 'PERSONAL' },
            }));

            const config = { headers: {} };
            const result = requestInterceptor(config);

            expect(result.headers['X-Workspace-Type']).toBe('PERSONAL');
            expect(result.headers['X-Company-Id']).toBeUndefined();
        });

        it('4. workspace-storage COMPANY → thêm X-Workspace-Type + X-Company-Id', () => {
            localStorage.setItem('workspace-storage', JSON.stringify({
                state: {
                    workspaceType: 'COMPANY',
                    currentWorkspace: { id: 42 },
                },
            }));

            const config = { headers: {} };
            const result = requestInterceptor(config);

            expect(result.headers['X-Workspace-Type']).toBe('COMPANY');
            expect(result.headers['X-Company-Id']).toBe(42);
        });

        it('5. workspace-storage corrupt JSON → warn, không crash', () => {
            localStorage.setItem('workspace-storage', 'INVALID_JSON{{{');

            const config = { headers: {} };
            const result = requestInterceptor(config);

            expect(result).toBeDefined(); // Should not throw
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to parse workspace storage',
                expect.any(SyntaxError)
            );
        });

        it('6. Fallback: legacy company-storage → thêm X-Company-Id', () => {
            // No workspace-storage → falls back to company-storage
            localStorage.setItem('company-storage', JSON.stringify({
                state: {
                    currentCompany: { companyId: 99 },
                },
            }));

            const config = { headers: {} };
            const result = requestInterceptor(config);

            expect(result.headers['X-Company-Id']).toBe(99);
            expect(result.headers['X-Workspace-Type']).toBe('COMPANY');
        });

        it('7. Không có workspace-storage lẫn company-storage → không thêm header', () => {
            const config = { headers: {} };
            const result = requestInterceptor(config);

            expect(result.headers['X-Workspace-Type']).toBeUndefined();
            expect(result.headers['X-Company-Id']).toBeUndefined();
        });
    });

    // =================================================================
    // Response Interceptor — Feature Disabled (403)
    // =================================================================
    describe('Response Interceptor: Feature Disabled (403)', () => {
        it('8. 403 + "Feature disabled" → dispatch feature-disabled event', async () => {
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
            const error = {
                response: { status: 403, data: { message: 'Feature HR is disabled' } },
                config: {},
            };

            await expect(responseInterceptor(error)).rejects.toBe(error);

            expect(consoleWarnSpy).toHaveBeenCalledWith('[Feature Disabled]', 'Feature HR is disabled');
            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'feature-disabled',
                    detail: { message: 'Feature HR is disabled' },
                })
            );

            dispatchSpy.mockRestore();
        });

        it('9. 403 nhưng message không chứa "disabled"/"Feature" → không dispatch, pass through', async () => {
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
            const error = {
                response: { status: 403, data: { message: 'Access denied' } },
                config: { url: '/api/something' },
            };

            await expect(responseInterceptor(error)).rejects.toBe(error);
            expect(dispatchSpy).not.toHaveBeenCalled();

            dispatchSpy.mockRestore();
        });
    });

    // =================================================================
    // Response Interceptor — Quota Exceeded (400)
    // =================================================================
    describe('Response Interceptor: Quota Exceeded (400)', () => {
        it('10. 400 + "quota exceeded" → dispatch quota-exceeded event', async () => {
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
            const error = {
                response: { status: 400, data: { message: 'Storage quota exceeded' } },
                config: {},
            };

            await expect(responseInterceptor(error)).rejects.toBe(error);

            expect(consoleWarnSpy).toHaveBeenCalledWith('[Quota Exceeded]', 'Storage quota exceeded');
            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'quota-exceeded',
                    detail: { message: 'Storage quota exceeded' },
                })
            );

            dispatchSpy.mockRestore();
        });

        it('11. 400 + "limit" → also triggers quota-exceeded', async () => {
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
            const error = {
                response: { status: 400, data: { message: 'User limit reached' } },
                config: {},
            };

            await expect(responseInterceptor(error)).rejects.toBe(error);
            expect(dispatchSpy).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'quota-exceeded' })
            );

            dispatchSpy.mockRestore();
        });
    });

    // =================================================================
    // Response Interceptor — Token Refresh (401)
    // =================================================================
    describe('Response Interceptor: Token Refresh (401)', () => {
        it('12. 401 + first attempt → calls refresh endpoint, stores new token', async () => {
            localStorage.setItem('accessToken', 'old-token');

            // Mock successful refresh
            axios.post.mockResolvedValueOnce({
                data: { accessToken: 'new-token-xyz', expiresIn: 3600000 },
            });

            const error = {
                response: { status: 401 },
                config: { url: '/api/employees', headers: {}, _retry: false },
            };

            // The interceptor will: refresh → save token → try apiClient(original)
            // apiClient(original) throws because mockAxiosInstance isn't callable,
            // but we can still verify the refresh/token steps happened.
            try {
                await responseInterceptor(error);
            } catch (e) {
                // Expected: mockAxiosInstance is not a function (retry fails)
            }

            // 1. Refresh endpoint was called with httpOnly cookie support
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/refresh'),
                {},
                { withCredentials: true }
            );

            // 2. New token stored in localStorage
            expect(localStorage.getItem('accessToken')).toBe('new-token-xyz');
            expect(localStorage.getItem('expiresAt')).toBeTruthy();

            // 3. Original request headers updated with new token
            expect(error.config.headers.Authorization).toBe('Bearer new-token-xyz');

            // 4. _retry flag set to prevent infinite loops
            expect(error.config._retry).toBe(true);
        });

        it('13. 401 nhưng là login request → KHÔNG refresh, reject trực tiếp', async () => {
            const error = {
                response: { status: 401 },
                config: { url: '/api/auth/login', headers: {} },
            };

            await expect(responseInterceptor(error)).rejects.toBe(error);

            // Should NOT call refresh
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('14. 401 + already retried (_retry=true) → KHÔNG refresh lại', async () => {
            const error = {
                response: { status: 401 },
                config: { url: '/api/employees', headers: {}, _retry: true },
            };

            await expect(responseInterceptor(error)).rejects.toBe(error);

            expect(axios.post).not.toHaveBeenCalled();
        });

        it('15. 401 + refresh fails → clear auth + redirect to /login', async () => {
            localStorage.setItem('accessToken', 'old-token');
            localStorage.setItem('expiresAt', '999999999');

            axios.post.mockRejectedValueOnce(new Error('Refresh failed'));

            // Mock window.location
            const originalHref = window.location.href;
            delete window.location;
            window.location = { href: '' };

            const error = {
                response: { status: 401 },
                config: { url: '/api/employees', headers: {}, _retry: false },
            };

            await expect(responseInterceptor(error)).rejects.toThrow('Refresh failed');

            // Auth cleared
            expect(localStorage.getItem('accessToken')).toBeNull();
            expect(localStorage.getItem('expiresAt')).toBeNull();

            // Redirected to login
            expect(window.location.href).toBe('/login');

            // Restore
            window.location = { href: originalHref };
        });
    });

    // =================================================================
    // Axios Instance Config
    // =================================================================
    describe('Axios Instance Config', () => {
        it('16. axios.create called with correct config', () => {
            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 30000,
                    withCredentials: true,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });
    });

    // ZERO unexpected errors
    it('17. ZERO unexpected console.error', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
