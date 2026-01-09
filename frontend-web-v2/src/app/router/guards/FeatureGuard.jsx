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
 * Props:
 * - feature: Feature key cần check (attendance, leave, salary, hr, project, etc.)
 * - children: Component con sẽ render nếu được phép
 * - fallbackPath: Redirect path nếu không được phép (default: /app)
 */
export default function FeatureGuard({ feature, children, fallbackPath = '/app' }) {
    const { currentWorkspace } = useWorkspaceStore();
    const toast = useToast();
    const location = useLocation();
    const hasShownToast = useRef(false);

    const plan = currentWorkspace?.plan || 'FREE';
    const settings = currentWorkspace?.settings || null;

    const enabled = isFeatureEnabled(plan, settings, feature);

    useEffect(() => {
        if (!enabled && !hasShownToast.current) {
            hasShownToast.current = true;
            toast.warning('Tính năng này đã bị vô hiệu hóa cho workspace của bạn');
        }
    }, [enabled, toast]);

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
