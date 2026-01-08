import { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@shared/stores/authStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [loading, setLoading] = useState(true);
    const { user, isAuthenticated, initAuth, login, logout } = useAuthStore();

    useEffect(() => {
        const init = async () => {
            await initAuth();
            setLoading(false);
        };
        init();
    }, [initAuth]);

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
