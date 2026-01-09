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
    const { isAuthenticated } = useAuthStore();

    // If not authenticated, they shouldn't be here (AuthGuard should catch this)
    if (!isAuthenticated) {
        return null; // Let AuthGuard handle redirect
    }

    // User is authenticated -> they have Personal Workspace -> allow access
    return children;
}
