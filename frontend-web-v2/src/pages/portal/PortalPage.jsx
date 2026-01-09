import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { getRoleLabel } from '@shared/utils/roleHelper';
import { getPlanConfig } from '@shared/utils/planHelper';
import PortalLayout from '@layouts/PortalLayout';

export default function PortalPage() {
    const { user } = useAuthStore();
    const {
        workspaces,
        personalWorkspace,
        fetchWorkspaces,
        selectWorkspace,
        switchToPersonal
    } = useWorkspaceStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            await fetchWorkspaces();
            setLoading(false);
        };
        load();
    }, [fetchWorkspaces]);

    const handleEnterWorkspace = (workspace) => {
        selectWorkspace(workspace);
        navigate('/app');
    };

    const handleEnterPersonal = () => {
        switchToPersonal();
        navigate('/app');
    };

    const handleAppClick = (path) => {
        // If has personal workspace or company workspaces, enter first one
        if (personalWorkspace) {
            switchToPersonal();
            navigate(`/app/${path}`);
        } else if (workspaces.length > 0) {
            selectWorkspace(workspaces[0]);
            navigate(`/app/${path}`);
        } else {
            navigate('/onboarding');
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    const apps = [
        { name: 'HRM', icon: 'fa-users', color: 'text-purple-600 bg-purple-50', path: 'employees' },
        { name: 'Projects', icon: 'fa-list-check', color: 'text-indigo-600 bg-indigo-50', path: 'projects' },
        { name: 'Chat', icon: 'fa-comments', color: 'text-pink-600 bg-pink-50', path: 'chat' },
        { name: 'Storage', icon: 'fa-folder-open', color: 'text-orange-600 bg-orange-50', path: 'storage' },
    ];

    if (loading) {
        return (
            <PortalLayout>
                <div className="flex h-[calc(100vh-200px)] items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout>
            {/* Bento Grid Layout - Light Theme */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(180px,auto)] gap-6 pb-12">

                {/* 1. Welcome Card (2x1) */}
                <div className="md:col-span-2 md:row-span-1 relative overflow-hidden rounded-3xl p-8 flex flex-col justify-between bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg hover:shadow-xl transition-all duration-500 group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-700">
                        <i className="fa-solid fa-cloud-sun text-9xl text-indigo-900" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold mb-4 border border-green-200">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            System Online
                        </div>
                        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
                            {getGreeting()}, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                                {user?.fullName || user?.username}
                            </span>
                        </h1>
                    </div>
                    <p className="text-gray-500 mt-4 max-w-md italic border-l-4 border-indigo-500 pl-4 py-1">
                        "Your best work starts here."
                    </p>
                </div>

                {/* 2. Create Workspace (1x1) - Highlight */}
                <div
                    onClick={() => navigate('/onboarding')}
                    className="md:col-span-1 md:row-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white cursor-pointer hover:shadow-[0_10px_30px_rgba(99,102,241,0.4)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center text-center group border border-white/20 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                    <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 mx-auto group-hover:rotate-90 transition-transform duration-500 border border-white/30 shadow-inner">
                            <i className="fa-solid fa-plus text-3xl" />
                        </div>
                        <h3 className="text-xl font-bold">New Workspace</h3>
                        <p className="text-indigo-100 text-sm mt-2 opacity-90">Start Free Trial</p>
                    </div>
                </div>

                {/* 3. Stats / Invites (1x1) */}
                <div className="md:col-span-1 md:row-span-1 bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700">Pending Invites</h3>
                        <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm border border-red-200">
                            0
                        </span>
                    </div>
                    <div className="text-center py-4 flex-1 flex flex-col items-center justify-center">
                        <div className="w-14 h-14 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-3 border border-gray-100">
                            <i className="fa-regular fa-envelope-open text-2xl" />
                        </div>
                        <p className="text-sm text-gray-500">No pending invites</p>
                    </div>
                </div>

                {/* 4. Workspaces List (3x1) */}
                <div id="workspaces-section" className="md:col-span-3 bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-lg">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <i className="fa-solid fa-layer-group text-indigo-500" />
                            Workspaces
                        </h2>
                        <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                            {workspaces.length + (personalWorkspace ? 1 : 0)} Active
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Personal Workspace Card */}
                        {personalWorkspace && (
                            <div
                                onClick={handleEnterPersonal}
                                className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 shadow-sm hover:shadow-lg hover:border-indigo-400 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="relative z-10 flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                        <i className="fa-solid fa-user text-xl" />
                                    </div>
                                    <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border bg-indigo-100 text-indigo-600 border-indigo-200">
                                        Personal
                                    </span>
                                </div>
                                <h4 className="relative z-10 font-bold text-gray-800 text-lg truncate mb-1 group-hover:text-indigo-600 transition-colors">
                                    {personalWorkspace.name || 'Personal Workspace'}
                                </h4>
                                <p className="relative z-10 text-xs text-gray-500 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Owner
                                </p>
                                <div className="relative z-10 mt-5 pt-4 border-t border-indigo-100 flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Không gian cá nhân</span>
                                    <i className="fa-solid fa-arrow-right text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        )}

                        {/* Company Workspaces */}
                        {workspaces.map(workspace => (
                            <div
                                key={workspace.id || workspace.companyId}
                                onClick={() => handleEnterWorkspace(workspace)}
                                className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="relative z-10 flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-110 transition-transform">
                                        {workspace.name?.[0] || 'W'}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${['PROFESSIONAL', 'ENTERPRISE'].includes(workspace.plan)
                                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                            : workspace.plan === 'STARTER'
                                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                : 'bg-gray-100 text-gray-500 border-gray-200'
                                        }`}>
                                        {workspace.plan || 'FREE'}
                                    </span>
                                </div>
                                <h4 className="relative z-10 font-bold text-gray-800 text-lg truncate mb-1 group-hover:text-indigo-600 transition-colors">
                                    {workspace.name}
                                </h4>
                                <p className="relative z-10 text-xs text-gray-500 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    {getRoleLabel(workspace.role)}
                                </p>
                                <div className="relative z-10 mt-5 pt-4 border-t border-gray-50 flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Team Workspace</span>
                                    <i className="fa-solid fa-arrow-right text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))}

                        {/* Empty state - only if no workspaces at all */}
                        {!personalWorkspace && workspaces.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-500 mb-4 text-lg">Bạn chưa có không gian làm việc nào.</p>
                                <button onClick={() => navigate('/onboarding')} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg">
                                    <i className="fa-solid fa-rocket mr-2" /> Khởi tạo ngay
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Quick Apps (1x2) - Vertical */}
                <div className="md:col-span-1 md:row-span-1 bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-lg">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-grid-2 text-indigo-500" /> Modules
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {apps.map((app, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAppClick(app.path)}
                                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 hover:bg-white transition-all border border-transparent hover:border-gray-200 hover:shadow-md group"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${app.color} group-hover:scale-110 transition-transform`}>
                                    <i className={`fa-solid ${app.icon}`} />
                                </div>
                                <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-600 transition-colors">{app.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </PortalLayout>
    );
}
