import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add auth token and company header
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Multi-tenant: Add company ID header
        const companyStorage = localStorage.getItem('company-storage');
        if (companyStorage) {
            try {
                const { state } = JSON.parse(companyStorage);
                if (state?.currentCompany?.companyId) {
                    config.headers['X-Company-Id'] = state.currentCompany.companyId;
                }
            } catch (e) {
                console.warn('Failed to parse company storage', e);
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and haven't tried refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
                    refreshToken,
                });

                const { accessToken, expiresIn } = response.data;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('expiresAt', String(Date.now() + expiresIn));

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear auth and redirect
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('expiresAt');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
