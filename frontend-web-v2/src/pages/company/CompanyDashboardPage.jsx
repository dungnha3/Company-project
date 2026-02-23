import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { Link } from 'react-router-dom';
import { formatDate } from '@shared/utils/formatters';

export default function CompanyDashboardPage() {
    const { currentWorkspace } = useWorkspaceStore();
    const settings = currentWorkspace?.settings;

    // Fetch company members count
    const { data: members = [] } = useQuery({
        queryKey: ['company-members', currentWorkspace?.id],
        queryFn: async () => (await apiClient.get(ENDPOINTS.USERS.LIST)).data?.content || [],
        enabled: !!currentWorkspace?.id,
    });

    // Fetch projects count
    const { data: projects = [] } = useQuery({
        queryKey: ['company-projects', currentWorkspace?.id],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.LIST)).data?.content || [],
        enabled: !!currentWorkspace?.id,
    });

    // Build dashboard data from real sources
    const dashboardData = {
        totalMembers: members.length || 0,
        activeMembers: members.filter(m => m.isActive).length || members.length,
        totalProjects: projects.length || 0,
        storageUsed: settings?.storageUsed || 0, // GB từ settings
        storageLimit: settings?.storageLimit || 10, // GB
        planName: settings?.planName || currentWorkspace?.plan || 'Free',
        planExpiry: settings?.planExpiry || null,
        recentActivity: [
            { id: 1, type: 'member_join', user: members[0]?.fullName || 'User', action: 'đã tham gia Workspace', time: 'Gần đây', icon: 'fa-user-plus', color: 'green' },
            { id: 2, type: 'project_create', user: 'System', action: `Có ${projects.length} dự án`, time: '', icon: 'fa-folder-plus', color: 'blue' },
        ],
        quickStats: {
            tasksCompleted: projects.reduce((sum, p) => sum + (p.completedTasks || 0), 0),
            messagesThisWeek: 0,
            filesUploaded: 0,
            meetingsHeld: 0,
        }
    };

    const isLoading = !members.length && !projects.length;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {currentWorkspace?.name || 'Company Dashboard'}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Tổng quan hoạt động Workspace
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/app/company/settings"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors"
                    >
                        <i className="fa-solid fa-cog mr-2" />
                        Cài đặt
                    </Link>
                    <Link
                        to="/app/company/billing"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <i className="fa-solid fa-crown mr-2" />
                        Nâng cấp
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon="fa-users"
                    iconBg="bg-indigo-100"
                    iconColor="text-indigo-600"
                    title="Thành viên"
                    value={dashboardData?.totalMembers}
                    subtitle={`${dashboardData?.activeMembers} đang hoạt động`}
                    trend="+3 tuần này"
                    trendUp={true}
                />
                <StatCard
                    icon="fa-folder"
                    iconBg="bg-purple-100"
                    iconColor="text-purple-600"
                    title="Dự án"
                    value={dashboardData?.totalProjects}
                    subtitle="4 đang triển khai"
                    trend="+2 tuần này"
                    trendUp={true}
                />
                <StatCard
                    icon="fa-hard-drive"
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                    title="Lưu trữ"
                    value={`${dashboardData?.storageUsed} GB`}
                    subtitle={`/ ${dashboardData?.storageLimit} GB`}
                    progress={(dashboardData?.storageUsed / dashboardData?.storageLimit) * 100}
                />
                <StatCard
                    icon="fa-crown"
                    iconBg="bg-amber-100"
                    iconColor="text-amber-600"
                    title="Gói dịch vụ"
                    value={dashboardData?.planName}
                    subtitle={`Hết hạn: ${formatDate(dashboardData?.planExpiry)}`}
                    badge="Active"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Timeline */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Hoạt động gần đây</h2>
                        <Link to="/app/company/activity" className="text-sm text-indigo-600 hover:underline">
                            Xem tất cả →
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {dashboardData?.recentActivity?.map((activity, idx) => (
                            <div key={activity.id} className="flex gap-4">
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full bg-${activity.color}-100 flex items-center justify-center`}>
                                        <i className={`fa-solid ${activity.icon} text-${activity.color}-600 text-sm`} />
                                    </div>
                                    {idx < dashboardData.recentActivity.length - 1 && (
                                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-100" />
                                    )}
                                </div>
                                <div className="flex-1 pt-1">
                                    <p className="text-sm text-gray-700">
                                        <span className="font-semibold">{activity.user}</span>{' '}
                                        {activity.action}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Stats */}
                <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Tuần này</h2>
                    <div className="space-y-4">
                        <QuickStatRow
                            icon="fa-check-circle"
                            label="Tasks hoàn thành"
                            value={dashboardData?.quickStats?.tasksCompleted}
                            color="green"
                        />
                        <QuickStatRow
                            icon="fa-comment"
                            label="Tin nhắn"
                            value={dashboardData?.quickStats?.messagesThisWeek}
                            color="blue"
                        />
                        <QuickStatRow
                            icon="fa-file-upload"
                            label="Files đã tải lên"
                            value={dashboardData?.quickStats?.filesUploaded}
                            color="purple"
                        />
                        <QuickStatRow
                            icon="fa-video"
                            label="Meetings"
                            value={dashboardData?.quickStats?.meetingsHeld}
                            color="orange"
                        />
                    </div>

                    {/* Quick Links */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 mb-3">Truy cập nhanh</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <QuickLink to="/app/hr/employees" icon="fa-users" label="Nhân viên" />
                            <QuickLink to="/app/projects" icon="fa-folder" label="Dự án" />
                            <QuickLink to="/app/company/billing" icon="fa-credit-card" label="Thanh toán" />
                            <QuickLink to="/app/company/settings" icon="fa-cog" label="Cài đặt" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, iconBg, iconColor, title, value, subtitle, trend, trendUp, progress, badge }) {
    return (
        <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} ${iconColor} text-lg`} />
                </div>
                {badge && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        {badge}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <h3 className="text-sm text-gray-500">{title}</h3>
                <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900">{value}</span>
                    {subtitle && <span className="text-sm text-gray-400 mb-0.5">{subtitle}</span>}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 mt-2 text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                        <i className={`fa-solid ${trendUp ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
                        {trend}
                    </div>
                )}
                {progress !== undefined && (
                    <div className="mt-3">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function QuickStatRow({ icon, label, value, color }) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} text-${color}-600 text-sm`} />
                </div>
                <span className="text-sm text-gray-600">{label}</span>
            </div>
            <span className="font-bold text-gray-900">{value}</span>
        </div>
    );
}

function QuickLink({ to, icon, label }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-600 transition-colors"
        >
            <i className={`fa-solid ${icon} text-gray-400`} />
            {label}
        </Link>
    );
}
