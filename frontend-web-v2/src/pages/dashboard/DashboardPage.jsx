import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { formatDate, formatDateTime } from '@shared/utils/formatters';

// ==================== DASHBOARD PAGE ====================
export default function DashboardPage() {
    const { user } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    return <MyWorkDashboard user={user} greeting={greeting} currentWorkspace={currentWorkspace} />;
}

// ==================== MY WORK DASHBOARD ====================
function MyWorkDashboard({ user, greeting, currentWorkspace }) {

    const { data: myProjects = [] } = useQuery({
        queryKey: ['my-projects'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS)).data || []
    });

    const { data: myTasks = [] } = useQuery({
        queryKey: ['my-tasks'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ISSUES.MY_ISSUES)).data?.content?.slice(0, 8) || []
    });

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications-preview'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST)).data?.content?.slice(0, 5) || []
    });

    // Count tasks by status
    const todoTasks = myTasks.filter(t => t.status === 'TODO' || t.status === 'BACKLOG').length;
    const inProgressTasks = myTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completedTasks = myTasks.filter(t => t.status === 'DONE' || t.status === 'COMPLETED').length;

    return (
        <div className="max-w-full mx-auto p-6 space-y-5">
            {/* Header Banner */}
            <div className="flex items-center justify-between px-6 py-5 border border-gray-200 bg-white rounded-lg shadow-sm">
                <div>
                    <h2 className="text-2xl font-black color-main tracking-tight">
                        {greeting}, {user?.fullName?.split(' ').pop() || user?.username}
                    </h2>
                    <p className="text-xs color-slate font-semibold mt-1">
                        {formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <QuickAction to="/app/chat" icon="fa-comments" label="Chat" />
                    <QuickAction to="/app/projects" icon="fa-folder" label="Dự án" />
                    <QuickAction to="/app/hr/leave-requests" icon="fa-calendar-check" label="Nghỉ phép" />
                </div>
            </div>

            {/* Key Metrics - 4 cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBox title="Công việc" value={myTasks.length} subtitle="tasks" color="blue" icon="fa-list-check" />
                <MetricBox title="Cần làm" value={todoTasks} subtitle="tasks" color="orange" icon="fa-clock" />
                <MetricBox title="Đang thực hiện" value={inProgressTasks} subtitle="tasks" color="amber" icon="fa-spinner" />
                <MetricBox title="Hoàn thành" value={completedTasks} subtitle="tasks" color="green" icon="fa-check-circle" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column - Tasks */}
                <div className="lg:col-span-2">
                    <div className="border border-gray-200 rounded-lg bg-white p-6 h-full">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                            <h3 className="font-bold color-main text-lg">Công việc của tôi</h3>
                            <Link to="/app/me/issues" className="text-xs color-blue font-semibold hover:underline">
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {myTasks.length > 0 ? myTasks.map(task => (
                                <TaskItem key={task.id || task.issueId} task={task} />
                            )) : (
                                <div className="text-center py-12">
                                    <i className="fa-solid fa-check-circle text-4xl text-green-300 mb-3" />
                                    <p className="font-semibold color-main">Không có task nào!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                    {/* Projects */}
                    <div className="border border-gray-200 rounded-lg bg-white p-6">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                            <h3 className="font-bold color-main text-lg">Dự án đang tham gia</h3>
                            <Link to="/app/projects" className="text-xs color-blue font-semibold hover:underline">
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {myProjects.length > 0 ? myProjects.slice(0, 4).map((project, idx) => (
                                <Link key={idx} to={`/app/projects/${project.projectId}`} className="block p-3 border border-gray-100 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold color-main text-sm">{project.projectName}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {project.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] color-slate line-clamp-1">{project.description || 'Không có mô tả'}</p>
                                </Link>
                            )) : (
                                <div className="text-center py-6">
                                    <i className="fa-solid fa-folder-open text-2xl color-slate mb-2" />
                                    <p className="text-xs color-slate font-semibold">Bạn chưa tham gia dự án nào</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="border border-gray-200 rounded-lg bg-white p-6">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                            <h3 className="font-bold color-main text-lg">Thông báo</h3>
                            <Link to="/app/notifications" className="text-xs color-blue font-semibold hover:underline">
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {notifications.length > 0 ? notifications.map((notif, idx) => (
                                <NotificationItem key={idx} notification={notif} />
                            )) : (
                                <div className="text-center py-6">
                                    <i className="fa-solid fa-bell-slash text-2xl color-slate mb-2" />
                                    <p className="text-xs color-slate font-semibold">Không có thông báo mới</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickLink to="/app/me/issues" icon="fa-list-check" label="Công việc" color="blue" />
                <QuickLink to="/app/projects" icon="fa-folder" label="Dự án" color="orange" />
                <QuickLink to="/app/hr/leave-requests" icon="fa-umbrella-beach" label="Nghỉ phép" color="amber" />
                <QuickLink to="/app/notifications" icon="fa-bell" label="Thông báo" color="purple" />
            </div>
        </div>
    );
}

// ==================== SHARED COMPONENTS ====================

const QuickAction = memo(function QuickAction({ to, icon, label }) {
    return (
        <Link
            to={to}
            className="flex flex-col items-center gap-1 px-4 py-3 border border-gray-200 bg-gray-50 hover:bg-white rounded-lg transition-all hover:shadow-sm"
        >
            <i className={`fa-solid ${icon} text-lg color-main`} />
            <span className="text-[10px] font-semibold color-slate">{label}</span>
        </Link>
    );
});

const QuickLink = memo(function QuickLink({ to, icon, label, color }) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-200', label: 'text-blue-600' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200', label: 'text-orange-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200', label: 'text-amber-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-200', label: 'text-purple-600' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <Link
            to={to}
            className={`flex items-center gap-3 p-4 border ${c.border} rounded-lg hover:shadow-md transition-all ${c.bg}`}
        >
            <i className={`fa-solid ${icon} text-xl ${c.text}`} />
            <span className={`font-bold text-sm ${c.label}`}>{label}</span>
        </Link>
    );
});

function MetricBox({ title, value, subtitle, color, icon }) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-200' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200' },
        green: { bg: 'bg-green-50', text: 'text-green-500', border: 'border-green-200' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-200' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className={`border ${c.border} rounded-lg bg-white p-5 hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} ${c.text} text-lg`} />
                </div>
                <div>
                    <p className="text-[10px] font-bold color-slate uppercase tracking-wider">{title}</p>
                    <p className="text-[10px] color-slate mt-0.5">{subtitle}</p>
                </div>
            </div>
            <p className="text-3xl font-black color-main">{value}</p>
        </div>
    );
}

const TaskItem = memo(function TaskItem({ task }) {
    const priorityColors = {
        HIGH: 'bg-red-100 text-red-600',
        MEDIUM: 'bg-orange-100 text-orange-600',
        LOW: 'bg-green-100 text-green-600',
    };

    return (
        <Link
            to={`/app/projects/${task.projectId}`}
            className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all"
        >
            <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === 'HIGH' ? 'bg-red-500' : task.priority === 'MEDIUM' ? 'bg-orange-500' : 'bg-green-500'}`} />
            <div className="flex-1 min-w-0">
                <span className="font-medium color-main text-sm block truncate">{task.title}</span>
                <span className="text-[10px] color-slate block">{task.projectName || 'Project'}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ${priorityColors[task.priority] || 'bg-gray-100 text-gray-600'}`}>
                {task.status || 'TODO'}
            </span>
        </Link>
    );
});

const NotificationItem = memo(function NotificationItem({ notification }) {
    const iconMap = {
        leave: 'fa-calendar-check',
        project: 'fa-folder',
        task: 'fa-list-check',
        mention: 'fa-at',
        default: 'fa-bell',
    };

    return (
        <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <i className={`fa-solid ${iconMap[notification.type] || iconMap.default} text-blue-500 text-sm`} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-medium color-main text-sm line-clamp-2">{notification.message || notification.content}</p>
                <p className="text-[10px] color-slate mt-0.5">
                    {notification.createdAt ? formatDateTime(notification.createdAt) : 'Gần đây'}
                </p>
            </div>
        </div>
    );
});
