import { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@shared/stores/authStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [loading, setLoading] = useState(true);
    const { user, isAuthenticated, initAuth, login, logout } = useAuthStore();

    useEffect(() => {
        const init = async () => {
            // Skip initAuth if already authenticated (e.g., just logged in)
            // Only re-validate when there's a token but no user data (page reload)
            const hasToken = Boolean(localStorage.getItem('accessToken'));
            if (!isAuthenticated && hasToken) {
                await initAuth();
            }
            setLoading(false);
        };
        init();
    }, []);

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
