import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@shared/stores/authStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [loading, setLoading] = useState(true);
    const { user, isAuthenticated, initAuth, login, logout } = useAuthStore();

    useEffect(() => {
        const init = async () => {
            const hasToken = Boolean(localStorage.getItem('accessToken'));
            if (!isAuthenticated && hasToken) {
                await initAuth();
            }
            setLoading(false);
        };
        init();
    }, [initAuth, isAuthenticated]);

    const value = useMemo(() => ({
        user,
        loading,
        isAuthenticated,
        login,
        logout,
    }), [user, loading, isAuthenticated, login, logout]);

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
