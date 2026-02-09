import { Navigate } from 'react-router-dom';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export function WorkspaceTypeGuard({ types = [], children }) {
    const { currentWorkspace, workspaceType } = useWorkspaceStore();

    if (!types.includes(workspaceType)) {
        // If strict mode, maybe redirect to a safe place like /app/me
        // or show a specific "Not available in this workspace" error
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className={`fa-solid ${workspaceType === 'PERSONAL' ? 'fa-building' : 'fa-user'} text-2xl`} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Tính năng không khả dụng
                    </h2>
                    <p className="text-gray-500 mb-6">
                        Trang này chỉ dành cho {types.includes('COMPANY') ? 'Company Workspace' : 'Personal Workspace'}.
                        <br />
                        Bạn đang ở <strong>{workspaceType === 'PERSONAL' ? 'Personal Workspace' : 'Company Workspace'}</strong>.
                    </p>
                    {/* Only show "Switch" button if not in the target type */}
                    <p className="text-sm text-gray-400">
                        Vui lòng chuyển đổi workspace từ thanh bên (Sidebar).
                    </p>
                </div>
            </div>
        );
    }

    return children;
}
