import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';

export function AuthGuard({ children }) {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated || !user) {
        // Redirect to login, save intended destination
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
