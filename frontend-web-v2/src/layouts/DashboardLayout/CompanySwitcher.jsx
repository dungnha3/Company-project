import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { getRoleLabel } from '@shared/utils/roleHelper';
import CreateCompanyModal from '@features/company/components/CreateCompanyModal';

/**
 * WorkspaceSwitcher - Cho phép chuyển đổi giữa Personal và Company workspaces
 */
export default function CompanySwitcher({ collapsed }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const {
        workspaces,
        currentWorkspace,
        selectWorkspace,
        fetchWorkspaces
    } = useWorkspaceStore();

    useEffect(() => {
        // [HOTFIX] Force clear storage if user ID is missing (Stale data corrupting requests)
        const checkStaleAuth = () => {
            const storage = localStorage.getItem('auth-storage');
            if (storage) {
                try {
                    const { state } = JSON.parse(storage);
                    if (state?.user?.username === 'admin' && !state?.user?.id && !state?.user?.userId) {
                        console.error('🚨 DETECTED STALE AUTH DATA (Missing ID). CLEARING...', state.user);
                        localStorage.clear();
                        window.location.href = '/login';
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };
        checkStaleAuth();



        if (workspaces.length === 0) {
            fetchWorkspaces();
        }
    }, [workspaces]);

    const navigate = useNavigate();

    const handleSelect = async (workspace) => {
        // Fix: Use switchToCompany for company workspaces to properly fetch settings
        if (workspace.type === 'COMPANY') {
            await useWorkspaceStore.getState().switchToCompany(workspace.id);
            navigate('/app', { replace: true });
        } else {
            selectWorkspace(workspace);
            navigate('/app/me/tasks', { replace: true });
        }
        setIsOpen(false);
    };

    const getDisplayName = () => {
        if (!currentWorkspace) {
            return 'My Workspace';
        }
        return currentWorkspace.name;
    };

    const getDisplayRole = () => {
        if (!currentWorkspace) return 'Owner';
        // Fix: Use roles array instead of single role
        const roles = currentWorkspace.roles || (currentWorkspace.role ? [currentWorkspace.role] : []);
        if (roles.length === 0) return 'Member';
        // Show highest priority role
        const priorityOrder = ['OWNER', 'COMPANY_ADMIN', 'EMPLOYEE'];
        const primaryRole = priorityOrder.find(r => roles.includes(r)) || roles[0];
        return getRoleLabel(primaryRole);
    };

    const getInitial = () => {
        const name = getDisplayName();
        return name?.charAt(0) || 'W';
    };

    if (collapsed) {
        return (
            <div
                className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center cursor-pointer"
                title={getDisplayName()}
            >
                <span className="text-primary font-bold">
                    {getInitial()}
                </span>
            </div>
        );
    }

    return (
        <div className="company-switcher">
            <div
                className="company-switcher-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold bg-primary">
                    {getInitial()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">
                        {getDisplayName()}
                    </div>
                    <div className="text-xs text-gray-500">
                        {getDisplayRole()}
                    </div>
                </div>
                {workspaces.length >= 1 && (
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400`} />
                )}
            </div>

            {isOpen && (
                <div className="company-switcher-dropdown z-50">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Workspace
                    </div>

                    {workspaces.map(workspace => (
                        <div
                            key={`company-${workspace.id}`}
                            className={`company-item ${workspace.id === currentWorkspace?.id ? 'active' : ''}`}
                            onClick={() => handleSelect(workspace)}
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-semibold text-sm">
                                {workspace.name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{workspace.name}</span>
                                </div>
                                <div className="text-xs text-gray-500">{getRoleLabel(workspace.roles?.[0] || workspace.role)}</div>
                            </div>
                            {workspace.id === currentWorkspace?.id && (
                                <i className="fa-solid fa-check text-primary" />
                            )}
                        </div>
                    ))}

                    {/* Create New Company Button */}
                    <div className="border-t my-2 pt-2">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowCreateModal(true);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-primary"
                        >
                            <div className="w-8 h-8 rounded-lg border border-dashed border-primary/50 flex items-center justify-center">
                                <i className="fa-solid fa-plus text-sm" />
                            </div>
                            <span className="font-medium text-sm">Tạo Workspace mới</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Create Company Modal */}
            {showCreateModal && (
                <CreateCompanyModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        fetchWorkspaces();
                    }}
                />
            )}
        </div>
    );
}
