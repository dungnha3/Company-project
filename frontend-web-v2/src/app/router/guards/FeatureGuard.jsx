/**
 * FeatureGuard - Route Guard cho Feature Gating
 * Block user khi cố gắng truy cập URL của feature bị tắt
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { isFeatureEnabled } from '@shared/utils/featureHelper';
import { useToast } from '@app/providers/ToastProvider';
import { useEffect, useRef } from 'react';

/**
 * Feature display names for user-friendly messages
 */
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

/**
 * Props:
 * - feature: Feature key cần check (attendance, leave, salary, hr, project, etc.)
 * - children: Component con sẽ render nếu được phép
 * - fallbackPath: Redirect path nếu không được phép (default: /app)
 */
export default function FeatureGuard({ feature, children, fallbackPath = '/app' }) {
    const { currentWorkspace } = useWorkspaceStore();
    const toast = useToast();
    const location = useLocation();
    const lastFeatureRef = useRef(feature);
    const hasShownToast = useRef(false);

    const plan = currentWorkspace?.plan || 'FREE';
    const settings = currentWorkspace?.settings || null;
    const isCompanyWorkspace = currentWorkspace?.type === 'COMPANY';

    // [FIX] Wait for settings to load for company workspaces before checking features
    const settingsLoading = isCompanyWorkspace && !settings;

    const enabled = settingsLoading ? true : isFeatureEnabled(plan, settings, feature);

    // Reset toast flag when feature changes
    useEffect(() => {
        if (lastFeatureRef.current !== feature) {
            lastFeatureRef.current = feature;
            hasShownToast.current = false;
        }
    }, [feature]);

    useEffect(() => {
        // Only show toast after settings have loaded (not during loading)
        if (!enabled && !hasShownToast.current && !settingsLoading) {
            hasShownToast.current = true;
            const featureName = FEATURE_NAMES[feature] || feature;
            toast.warning(`Tính năng "${featureName}" chưa được kích hoạt cho workspace của bạn`);
        }
    }, [enabled, feature, toast, settingsLoading]);

    // Show loading while workspace is loading OR settings are loading for company workspace
    if (!currentWorkspace || settingsLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!enabled) {
        return <Navigate to={fallbackPath} replace state={{ from: location }} />;
    }

    return children;
}

/**
 * Higher-order component version
 */
export function withFeatureGuard(WrappedComponent, feature) {
    return function FeatureGuardedComponent(props) {
        return (
            <FeatureGuard feature={feature}>
                <WrappedComponent {...props} />
            </FeatureGuard>
        );
    };
}
