import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import { useToast } from '@app/providers/ToastProvider';
import { useEffect, useRef } from 'react';

const FEATURE_NAMES = {
    'hrModuleEnabled': 'Quản lý Nhân sự',
    'projectModuleEnabled': 'Quản lý Dự án',
    'leaveEnabled': 'Nghỉ phép',
    'reviewEnabled': 'Đánh giá',
    'resourcePlanningEnabled': 'Quản lý Nguồn lực',
    'timeTrackingEnabled': 'Time Tracking',
    'analyticsEnabled': 'Phân tích Dự án',
    'calendarEnabled': 'Lịch làm việc',
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
    const { currentWorkspace, workspaces, loading: workspacesLoading, hasFetched, fetchWorkspaces } = useWorkspaceStore();
    const { hasPermission, isFeatureEnabled: isWorkspaceFeatureEnabled } = useAccessControl();
    const location = useLocation();
    const toast = useToast();
    const hasShownToast = useRef(false);
    const accessToken = localStorage.getItem('accessToken');

    useEffect(() => {
        if (requireCompany && isAuthenticated && !hasFetched) {
            fetchWorkspaces();
        }
    }, [requireCompany, isAuthenticated, hasFetched, fetchWorkspaces]);

    // 1. Authentication Check
    // On F5 reload: zustand may not have rehydrated yet, so also check localStorage
    const hasPersistedAuth = (() => {
        try {
            const stored = localStorage.getItem('auth-storage');
            if (!stored) return false;
            const { state } = JSON.parse(stored);
            return state?.isAuthenticated === true;
        } catch { return false; }
    })();

    // If store says not authenticated but localStorage has auth data, wait for rehydration
    if (requireAuth && !isAuthenticated && hasPersistedAuth) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="loading-spinner" />
            </div>
        );
    }

    // If truly not authenticated (not in store AND not in localStorage), redirect to login
    if (requireAuth && (!isAuthenticated || !user)) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If auth state exists but token is missing/expired, redirect to login
    // Only do this after rehydration so we don't flash login on fresh load
    if (requireAuth && accessToken === null && isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If we only need auth, return early (but not if requireCompany is true)
    if (!requireCompany && allowedRoles.length === 0 && !requiredPermission && !requiredFeature) {
        return children;
    }

    // 3. Workspace Data Check
    if (requireCompany) {
        if (!hasFetched || workspacesLoading) {
            return (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="loading-spinner" />
                </div>
            );
        }

        // If finished loading and user has no workspaces, redirect to onboarding
        // Only do this when auth token still exists (real no-workspace case)
        if (hasFetched && accessToken && (!currentWorkspace || workspaces.length === 0)) {
            console.debug('[AccessControlGuard] No workspace found, redirecting to onboarding', {
                hasFetched,
                workspacesLength: workspaces?.length,
                currentWorkspaceId: currentWorkspace?.companyId || currentWorkspace?.id,
            });
            return <Navigate to="/onboarding" replace state={{ from: location }} />;
        }
    }

    // 5. Permission Check (preferred over role check)
    if (requiredPermission) {
        if (!hasPermission(requiredPermission)) {
            return <Navigate to={fallbackPath} replace />;
        }
    }

    // 6. Role Check (kept for admin-only routes like Settings, Billing, Audit)
    if (allowedRoles.length > 0) {
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

    // 6. Feature Check
    if (requiredFeature) {
        // If settings not loaded yet, default to allowing access (don't block user)
        const enabled = currentWorkspace?.settings ? isWorkspaceFeatureEnabled(requiredFeature) : true;

        if (!enabled) {
            if (!hasShownToast.current) {
                hasShownToast.current = true;
                const featureName = FEATURE_NAMES[requiredFeature] || requiredFeature;
                setTimeout(() => { // prevent react state update warning during render
                    toast.warning(`Tính năng "${featureName}" chưa được bật cho Workspace này`);
                }, 0);
            }
            return <Navigate to={fallbackPath} replace state={{ from: location }} />;
        }
    }

    return children;
}
