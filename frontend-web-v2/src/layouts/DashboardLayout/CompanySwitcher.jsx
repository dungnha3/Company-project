import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { getRoleLabel } from '@shared/utils/roleHelper';

/**
 * WorkspaceSwitcher - Cho phép chuyển đổi giữa Personal và Company workspaces
 */
export default function CompanySwitcher({ collapsed }) {
    const [isOpen, setIsOpen] = useState(false);
    const {
        workspaces,
        currentWorkspace,
        workspaceType,
        personalWorkspace,
        selectWorkspace,
        fetchWorkspaces
    } = useWorkspaceStore();

    useEffect(() => {
        if (workspaces.length === 0) {
            fetchWorkspaces();
        }
    }, []);

    const handleSelect = async (workspace) => {
        selectWorkspace(workspace);
        setIsOpen(false);
    };

    const getDisplayName = () => {
        if (!currentWorkspace) {
            return personalWorkspace?.name || 'My Workspace';
        }
        return currentWorkspace.name;
    };

    const getDisplayRole = () => {
        if (!currentWorkspace) return 'Owner';
        return getRoleLabel(currentWorkspace.role);
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
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold ${workspaceType === 'PERSONAL' ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-primary'
                    }`}>
                    {workspaceType === 'PERSONAL' ? (
                        <i className="fa-solid fa-user text-sm" />
                    ) : (
                        getInitial()
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">
                        {getDisplayName()}
                    </div>
                    <div className="text-xs text-gray-500">
                        {workspaceType === 'PERSONAL' ? 'Personal Workspace' : getDisplayRole()}
                    </div>
                </div>
                {workspaces.length > 1 && (
                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400`} />
                )}
            </div>

            {isOpen && workspaces.length > 0 && (
                <div className="company-switcher-dropdown">
                    {/* Personal Workspace Section */}
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Cá nhân
                    </div>
                    {workspaces.filter(w => w.type === 'PERSONAL').map(workspace => (
                        <div
                            key={`personal-${workspace.id}`}
                            className={`company-item ${workspace.id === currentWorkspace?.id ? 'active' : ''}`}
                            onClick={() => handleSelect(workspace)}
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                                <i className="fa-solid fa-user text-xs" />
                            </div>
                            <div className="flex-1">
                                <div className="font-medium">{workspace.name}</div>
                                <div className="text-xs text-gray-500">Personal</div>
                            </div>
                            {workspace.id === currentWorkspace?.id && workspaceType === 'PERSONAL' && (
                                <i className="fa-solid fa-check text-primary" />
                            )}
                        </div>
                    ))}

                    {/* Company Workspaces Section */}
                    {workspaces.filter(w => w.type === 'COMPANY').length > 0 && (
                        <>
                            <div className="border-t my-2" />
                            <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Workspaces
                            </div>
                            {workspaces.filter(w => w.type === 'COMPANY').map(workspace => (
                                <div
                                    key={`company-${workspace.id}`}
                                    className={`company-item ${workspace.id === currentWorkspace?.id && workspaceType === 'COMPANY' ? 'active' : ''}`}
                                    onClick={() => handleSelect(workspace)}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-semibold text-sm">
                                        {workspace.name?.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{workspace.name}</div>
                                        <div className="text-xs text-gray-500">{getRoleLabel(workspace.role)}</div>
                                    </div>
                                    {workspace.id === currentWorkspace?.id && workspaceType === 'COMPANY' && (
                                        <i className="fa-solid fa-check text-primary" />
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
