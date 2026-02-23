import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';

export default function SystemAdminGuard({ children }) {
    const { user, isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!user?.isSystemAdmin) {
        // Not a system admin -> Redirect to default app dashboard
        return <Navigate to="/app" replace />;
    }

    return children;
}

