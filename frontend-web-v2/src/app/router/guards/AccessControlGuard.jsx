import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { isFeatureEnabled } from '@shared/utils/featureHelper';
import { useToast } from '@app/providers/ToastProvider';
import { useEffect, useRef } from 'react';

const FEATURE_NAMES = {
    'hr': 'Nhân sự',
    'project': 'Dự án',
    'chat': 'Trò chuyện',
    'storage': 'Tài liệu',
    'attendance': 'Chấm công',
    'leave': 'Nghỉ phép',
    'salary': 'Bảng lương',
    'contract': 'Hợp đồng',
    'review': 'Đánh giá',
    'okr': 'OKR/KPI',
    'skillsMatrix': 'Ma trận kỹ năng',
    'onboarding': 'Onboarding',
    'resourcePlanning': 'Quản lý nguồn lực',
    'orgChart': 'Sơ đồ tổ chức',
    'timeTracking': 'Time Tracking',
    'analytics': 'Phân tích',
    'calendar': 'Lịch',
    'automation': 'Tự động hóa',
};

export function AccessControlGuard({
    children,
    requireAuth = true,
    requireCompany = false,
    allowedRoles = [],
    requiredPermission = null,
    requiredFeature = null,
    fallbackPath = '/app'
}) {
    const { isAuthenticated, user } = useAuthStore();
    const { currentWorkspace, workspaceType, hasPermission } = useWorkspaceStore();
    const location = useLocation();
    const toast = useToast();
    const hasShownToast = useRef(false);

    // 1. Authentication Check
    if (requireAuth && (!isAuthenticated || !user)) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If we only need auth, return early
    if (!requireCompany && allowedRoles.length === 0 && !requiredPermission && !requiredFeature) {
        return children;
    }

    // 3. Wait for Workspace Data
    if (!currentWorkspace) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="loading-spinner" />
            </div>
        );
    }

    const isCompanyWorkspace = currentWorkspace?.type === 'COMPANY';

    // 4. Company Workspace Check
    if (requireCompany && !isCompanyWorkspace) {
        return <Navigate to="/app/me/tasks" replace />;
    }

    // 5. Permission Check (preferred over role check)
    if (requiredPermission) {
        if (!hasPermission(requiredPermission)) {
            return <Navigate to={fallbackPath} replace />;
        }
    }

    // 6. Role Check (kept for admin-only routes like Settings, Billing, Audit)
    if (allowedRoles.length > 0) {
        if (workspaceType === 'PERSONAL') {
            if (!allowedRoles.includes('OWNER')) {
                return <Navigate to={fallbackPath} replace />;
            }
        } else {
            const currentRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['MEMBER']);
            const hasRequiredRole = allowedRoles.some(r => currentRoles.includes(r));

            if (!hasRequiredRole) {
                return (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="card text-center max-w-md">
                            <i className="fa-solid fa-lock text-4xl text-red-400 mb-4" />
                            <h2 className="text-xl font-semibold mb-2">Không có quyền truy cập</h2>
                            <p className="text-gray-500">
                                Bạn không có quyền xem trang này. Vui lòng liên hệ quản trị viên nếu cần.
                            </p>
                        </div>
                    </div>
                );
            }
        }
    }

    // 6. Feature Check
    if (requiredFeature) {
        const plan = currentWorkspace?.plan || 'FREE';
        const settings = currentWorkspace?.settings || null;

        // Personal workspace: company features are not available
        if (!isCompanyWorkspace) {
            if (!hasShownToast.current) {
                hasShownToast.current = true;
                const featureName = FEATURE_NAMES[requiredFeature] || requiredFeature;
                setTimeout(() => {
                    toast.warning(`Tính năng "${featureName}" chỉ khả dụng trong workspace công ty`);
                }, 0);
            }
            return <Navigate to="/app/me/tasks" replace />;
        }

        // If settings not loaded yet, default to allowing access (don't block user)
        const enabled = settings ? isFeatureEnabled(plan, settings, requiredFeature) : true;

        if (!enabled) {
            if (!hasShownToast.current) {
                hasShownToast.current = true;
                const featureName = FEATURE_NAMES[requiredFeature] || requiredFeature;
                setTimeout(() => { // prevent react state update warning during render
                    toast.warning(`Tính năng "${featureName}" chưa được kích hoạt cho workspace của bạn`);
                }, 0);
            }
            return <Navigate to={fallbackPath} replace state={{ from: location }} />;
        }
    }

    return children;
}
