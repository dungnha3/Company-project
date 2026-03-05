import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true, // Enable httpOnly cookie support
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add auth token and workspace/company headers
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // NEW: Workspace context headers (Dual Workspace Model)
        const workspaceStorage = localStorage.getItem('workspace-storage');
        if (workspaceStorage) {
            try {
                const { state } = JSON.parse(workspaceStorage);
                if (state?.workspaceType) {
                    config.headers['X-Workspace-Type'] = state.workspaceType;
                }
                // If in company context, also add company ID
                if (state?.workspaceType === 'COMPANY' && state?.currentWorkspace?.id) {
                    config.headers['X-Company-Id'] = state.currentWorkspace.id;
                }
            } catch (e) {
                console.warn('Failed to parse workspace storage', e);
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh and feature/quota errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle Feature Disabled (403 with specific message)
        if (error.response?.status === 403) {
            const message = error.response?.data?.message || '';
            if (message.includes('disabled') || message.includes('Feature')) {
                // Feature is disabled for this company
                console.warn('[Feature Disabled]', message);
                // Dispatch custom event for UI to show toast
                window.dispatchEvent(new CustomEvent('feature-disabled', {
                    detail: { message }
                }));
                return Promise.reject(error);
            }
        }

        // Handle Quota Exceeded (400 with quota info)
        if (error.response?.status === 400) {
            const message = error.response?.data?.message || '';
            if (message.includes('quota') || message.includes('limit') || message.includes('exceeded')) {
                console.warn('[Quota Exceeded]', message);
                // Dispatch custom event for UI to show toast
                window.dispatchEvent(new CustomEvent('quota-exceeded', {
                    detail: { message }
                }));
                return Promise.reject(error);
            }
        }

        // If 401 and haven't tried refresh yet
        // SKIP if the request is for login (let the component handle the error)
        if (error.response?.status === 401 && !originalRequest._retry
            && !originalRequest.url.includes('/auth/login')
            && !originalRequest.url.includes('/auth/me')) {
            originalRequest._retry = true;

            try {
                // RefreshToken is now in httpOnly cookie - just make the request
                // The cookie will be sent automatically with withCredentials: true
                const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
                    withCredentials: true, // Send the httpOnly cookie
                });

                const { accessToken, expiresIn } = response.data;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('expiresAt', String(Date.now() + expiresIn));

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear tokens, let AccessControlGuard handle redirect
                localStorage.removeItem('accessToken');
                localStorage.removeItem('expiresAt');
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
