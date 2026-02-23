import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';

/**
 * CompanyGuard - Cho phép truy cập /app nếu user đã đăng nhập
 * 
 * [NEW FLOW] Dual Workspace Model:
 * - User luôn có Personal Workspace (auto-created by Backend)
 * - Không cần phải thuộc Company để sử dụng hệ thống
 * - Guard này chỉ kiểm tra authentication, không check company membership
 */
export function CompanyGuard({ children }) {
    const { isAuthenticated, user } = useAuthStore();

    // If not authenticated, let AuthGuard handle it
    if (!isAuthenticated) return null;

    // [SYSADMIN FIX] If user is System Admin, redirect to Admin Dashboard
    // They shouldn't be in the regular User App flow
    if (user?.isSystemAdmin) {
        return <Navigate to="/admin" replace />;
    }

    // User is authenticated -> they have Personal Workspace -> allow access
    return children;
}
