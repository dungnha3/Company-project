import { Navigate } from 'react-router-dom';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export function RoleGuard({ roles, children }) {
    const { currentWorkspace, workspaceType } = useWorkspaceStore();

    // In Personal Workspace, user is always the OWNER
    if (workspaceType === 'PERSONAL') {
        // Personal workspace users have full access if OWNER is in allowed roles
        if (roles.includes('OWNER')) {
            return children;
        }
    }

    // Get roles from current workspace context (array)
    const currentRoles = currentWorkspace?.roles || (currentWorkspace?.role ? [currentWorkspace.role] : ['MEMBER']);

    // Check if user has ANY of the required roles
    const hasRequiredRole = roles.some(r => currentRoles.includes(r));
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

    return children;
}
