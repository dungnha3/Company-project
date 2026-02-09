import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { workspaceType, currentWorkspace } = useWorkspaceStore();
    const isPersonal = workspaceType === 'PERSONAL';

    // Get current hour for greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    // ======= Personal Workspace Dashboard =======
    if (isPersonal) {
        return <PersonalDashboard user={user} greeting={greeting} />;
    }

    // ======= Company Workspace Dashboard =======
    return <CompanyDashboard user={user} greeting={greeting} currentWorkspace={currentWorkspace} />;
}

// ==================== PERSONAL DASHBOARD ====================
function PersonalDashboard({ user, greeting }) {
    const queryClient = useQueryClient();

    // Fetch personal tasks stats
    const { data: stats } = useQuery({
        queryKey: ['personal-tasks-stats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PERSONAL_TASKS.STATS)).data,
    });

    // Fetch recent personal tasks
    const { data: tasks = [] } = useQuery({
        queryKey: ['personalTasks'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PERSONAL_TASKS.LIST);
            return (res.data || []).slice(0, 5);
        },
    });

    // Fetch pending invites
    const { data: invites = [] } = useQuery({
        queryKey: ['pending-invites'],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.INVITES.PENDING)).data || [];
            } catch {
                return [];
            }
        },
    });

    const progressPercent = stats ? Math.round((stats.done / Math.max(stats.total, 1)) * 100) : 0;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Welcome Banner - Personal Style */}
            <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white rounded-full" />
                </div>

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            {greeting}, {user?.fullName?.split(' ').pop() || user?.username}! 👋
                        </h1>
                        <p className="text-purple-100 text-lg">
                            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-purple-200 text-sm mt-2">
                            Không gian cá nhân của bạn
                        </p>
                    </div>

                    {/* Quick Actions - Personal */}
                    <div className="flex gap-3">
                        <QuickAction to="/app/me/tasks" icon="fa-list-check" label="Tasks" />
                        <QuickAction to="/app/me/profile" icon="fa-user" label="Hồ sơ" />
                        <QuickAction to="/app/notifications" icon="fa-bell" label="Thông báo" />
                    </div>
                </div>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress Ring Card */}
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
                    <h3 className="text-lg font-semibold mb-4">Tiến độ Tasks</h3>
                    <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="16" fill="none"
                                    stroke="white" strokeWidth="3"
                                    strokeDasharray={`${progressPercent} 100`}
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold">{progressPercent}%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-4xl font-bold">{stats?.done || 0}/{stats?.total || 0}</p>
                            <p className="text-purple-200">tasks hoàn thành</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Tổng quan</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <MiniStat icon="fa-circle" label="Cần làm" value={stats?.todo || 0} color="gray" />
                        <MiniStat icon="fa-play" label="Đang làm" value={stats?.inProgress || 0} color="blue" />
                        <MiniStat icon="fa-check" label="Hoàn thành" value={stats?.done || 0} color="green" />
                        <MiniStat icon="fa-clock" label="Quá hạn" value={stats?.overdue || 0} color="red" />
                    </div>
                </div>

                {/* Plan Status */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Gói của bạn</h3>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stats?.isPro ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gray-100'}`}>
                            <i className={`fa-solid ${stats?.isPro ? 'fa-crown text-white' : 'fa-user text-gray-500'} text-xl`} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{stats?.isPro ? 'PRO' : 'FREE'}</p>
                            <p className="text-sm text-gray-500">
                                {stats?.isPro ? 'Không giới hạn tasks' : `${stats?.total || 0}/${stats?.maxTasks || 10} tasks`}
                            </p>
                        </div>
                    </div>
                    {!stats?.isPro && stats?.atLimit && (
                        <Link
                            to="/app/company/billing"
                            className="mt-4 block w-full text-center py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                        >
                            <i className="fa-solid fa-sparkles mr-2" />
                            Nâng cấp PRO
                        </Link>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tasks */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Tasks gần đây</h3>
                        <Link to="/app/me/tasks" className="text-sm text-violet-600 hover:underline">
                            Xem tất cả →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {tasks.length > 0 ? tasks.map(task => (
                            <PersonalTaskItem key={task.taskId} task={task} />
                        )) : (
                            <div className="text-center py-8 text-gray-500">
                                <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-3" />
                                <p className="font-medium">Chưa có task nào</p>
                                <Link to="/app/me/tasks" className="text-violet-600 text-sm hover:underline">
                                    Tạo task đầu tiên →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Invites */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Lời mời Workspace</h3>
                        {invites.length > 0 && (
                            <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                                {invites.length}
                            </span>
                        )}
                    </div>

                    {invites.length > 0 ? (
                        <div className="space-y-3">
                            {invites.slice(0, 4).map((invite) => (
                                <InviteItem key={invite.id} invite={invite} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <i className="fa-regular fa-envelope-open text-xl" />
                            </div>
                            <p className="text-sm">Không có lời mời nào</p>
                            <p className="text-xs mt-1">Bạn sẽ thấy lời mời tham gia công ty ở đây</p>
                        </div>
                    )}
                </div>
            </div>

            {/* First Steps for Personal */}
            <PersonalFirstSteps stats={stats} />
        </div>
    );
}

// ==================== COMPANY DASHBOARD ====================
function CompanyDashboard({ user, greeting, currentWorkspace }) {
    // Fetch dashboard data
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.DASHBOARD.STATS)).data,
    });

    const { data: myTasks = [] } = useQuery({
        queryKey: ['my-tasks'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MY_ISSUES)).data?.content?.slice(0, 5) || []
    });

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications-preview'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST)).data?.content?.slice(0, 5) || []
    });

    // Fetch attendance history for chart
    const { data: attendanceHistory = [] } = useQuery({
        queryKey: ['my-attendance-history'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ATTENDANCE.MY_HISTORY)).data || []
    });

    // Process attendance data for the current week
    const attendanceData = (() => {
        const today = new Date();
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay() || 7;
        if (day !== 1) startOfWeek.setHours(-24 * (day - 1));

        const weekData = [];
        const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            const dateStr = current.toDateString();
            const record = attendanceHistory.find(r => new Date(r.date).toDateString() === dateStr);
            weekData.push({
                name: days[i],
                workHours: record?.workHours ? Number(record.workHours.toFixed(1)) : 0,
                status: record?.status || 'ABSENT'
            });
        }
        return weekData;
    })();

    const projectStatusData = [
        { name: 'Đang làm', value: stats?.activeProjects ?? 0, color: '#3b82f6' },
        { name: 'Hoàn thành', value: stats?.completedProjects ?? 0, color: '#22c55e' },
        { name: 'Tạm dừng', value: stats?.pausedProjects ?? 0, color: '#f59e0b' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white rounded-full" />
                </div>

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            {greeting}, {user?.fullName?.split(' ').pop() || 'Admin'}! 👋
                        </h1>
                        <p className="text-blue-100 text-lg">
                            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-blue-200 text-sm mt-2">
                            Bạn có <span className="font-bold text-white">{myTasks.length}</span> công việc cần xử lý
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-3">
                        <QuickAction to="/app/chat" icon="fa-comments" label="Chat" />
                        <QuickAction to="/app/projects" icon="fa-folder" label="Dự án" />
                        <QuickAction to="/app/hr/attendance" icon="fa-clock" label="Chấm công" />
                        <QuickAction to="/app/hr/leave-requests" icon="fa-calendar-check" label="Nghỉ phép" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Thành viên"
                    value={stats?.totalEmployees ?? currentWorkspace?.memberCount ?? 0}
                    icon="fa-users"
                    color="blue"
                    trend={stats?.employeeTrend}
                />
                <StatCard
                    title="Dự án Active"
                    value={stats?.activeProjects ?? 0}
                    icon="fa-diagram-project"
                    color="purple"
                    trend={stats?.projectTrend}
                />
                <StatCard
                    title="Đơn chờ duyệt"
                    value={stats?.pendingLeaves ?? 0}
                    icon="fa-envelope"
                    color="orange"
                    badge={stats?.pendingLeaves > 0 ? "Mới" : null}
                />
                <StatCard
                    title="Tasks tuần này"
                    value={stats?.completedTasks ?? 0}
                    icon="fa-check-circle"
                    color="green"
                    trend={stats?.taskTrend}
                />
            </div>

            {/* First Steps Widget (for new users) */}
            <FirstStepsWidget stats={stats} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Attendance Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Chấm công của bạn</h3>
                                <p className="text-sm text-gray-500">Giờ làm việc tuần này</p>
                            </div>
                            <Link to="/app/hr/attendance" className="text-sm text-blue-600 hover:underline">
                                Xem chi tiết →
                            </Link>
                        </div>
                        <div className="h-64 w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f3f4f6' }}
                                        formatter={(value) => [`${value} giờ`, 'Làm việc']}
                                    />
                                    <Bar dataKey="workHours" name="Giờ làm" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* My Tasks */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Công việc của tôi</h3>
                            <Link to="/app/me/issues" className="text-sm text-blue-600 hover:underline">
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {myTasks.length > 0 ? myTasks.map(task => (
                                <TaskItem key={task.id || task.issueId} task={task} />
                            )) : (
                                <div className="text-center py-8 text-gray-500">
                                    <i className="fa-solid fa-check-circle text-4xl text-green-300 mb-2" />
                                    <p>Không có task nào!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Project Status Pie */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Dự án theo trạng thái</h3>
                        <div className="h-48 flex items-center justify-center w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={projectStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {projectStatusData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                            {projectStatusData.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Thông báo</h3>
                            <Link to="/app/notifications" className="text-sm text-blue-600 hover:underline">
                                Xem tất cả →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {notifications.length > 0 ? notifications.map((notif, idx) => (
                                <NotificationItem key={idx} notification={notif} />
                            )) : (
                                <div className="text-center py-6 text-gray-400">
                                    <i className="fa-solid fa-bell-slash text-2xl mb-2" />
                                    <p className="text-sm">Không có thông báo mới</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4">Truy cập nhanh</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <QuickLink to="/app/hr/employees" icon="fa-users" label="Nhân viên" />
                            <QuickLink to="/app/hr/contracts" icon="fa-file-contract" label="Hợp đồng" />
                            <QuickLink to="/app/hr/salaries" icon="fa-money-bill" label="Bảng lương" />
                            <QuickLink to="/app/storage" icon="fa-folder" label="Tài liệu" />
                            <QuickLink to="/app/me/calendar" icon="fa-calendar" label="Lịch" />
                            <QuickLink to="/app/company/settings" icon="fa-cog" label="Cài đặt" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==================== SHARED COMPONENTS ====================

function QuickAction({ to, icon, label }) {
    return (
        <Link
            to={to}
            className="flex flex-col items-center gap-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
        >
            <i className={`fa-solid ${icon} text-xl`} />
            <span className="text-xs font-medium">{label}</span>
        </Link>
    );
}

function MiniStat({ icon, label, value, color }) {
    const colorMap = {
        gray: 'bg-gray-100 text-gray-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        red: 'bg-red-100 text-red-600',
    };
    return (
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
                <i className={`fa-solid ${icon}`} />
            </div>
            <div>
                <div className="text-xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, trend, badge }) {
    const colors = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
        green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    };
    const c = colors[color] || colors.blue;

    return (
        <div className={`bg-white rounded-xl p-5 border ${c.border} hover:shadow-lg transition-shadow`}>
            <div className="flex items-start justify-between">
                <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} ${c.text} text-lg`} />
                </div>
                {badge && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                        {badge}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                    {title}
                    {trend !== undefined && (
                        <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend >= 0 ? '+' : ''}{trend}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function PersonalTaskItem({ task }) {
    const priorityDot = {
        LOW: 'bg-gray-400',
        MEDIUM: 'bg-amber-400',
        HIGH: 'bg-red-500',
    };
    return (
        <Link
            to="/app/me/tasks"
            className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
        >
            <div className={`w-2 h-2 rounded-full ${priorityDot[task.priority] || 'bg-gray-400'}`} />
            <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {task.title}
                </div>
                {task.dueDate && (
                    <div className={`text-xs ${task.overdue ? 'text-red-600' : 'text-gray-400'}`}>
                        <i className="fa-regular fa-calendar mr-1" />
                        {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                    </div>
                )}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'DONE' ? 'bg-green-100 text-green-600' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                }`}>
                {task.status === 'DONE' ? 'Xong' : task.status === 'IN_PROGRESS' ? 'Đang làm' : 'Cần làm'}
            </span>
        </Link>
    );
}

function TaskItem({ task }) {
    const priorityColors = {
        HIGH: 'bg-red-100 text-red-600',
        MEDIUM: 'bg-orange-100 text-orange-600',
        LOW: 'bg-green-100 text-green-600',
    };

    return (
        <Link
            to={`/app/projects/${task.projectId}`}
            className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
        >
            <div className={`w-2 h-2 rounded-full ${task.priority === 'HIGH' ? 'bg-red-500' : task.priority === 'MEDIUM' ? 'bg-orange-500' : 'bg-green-500'}`} />
            <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">{task.title}</div>
                <div className="text-xs text-gray-500">{task.projectName || 'Project'}</div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority] || 'bg-gray-100 text-gray-600'}`}>
                {task.status || 'TODO'}
            </span>
        </Link>
    );
}

function NotificationItem({ notification }) {
    const iconMap = {
        leave: 'fa-calendar-check',
        project: 'fa-folder',
        task: 'fa-list-check',
        mention: 'fa-at',
        default: 'fa-bell',
    };

    return (
        <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <i className={`fa-solid ${iconMap[notification.type] || iconMap.default} text-blue-600 text-sm`} />
            </div>
            <div className="min-w-0">
                <p className="text-sm text-gray-700 line-clamp-2">{notification.message || notification.content}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                    {notification.createdAt ? new Date(notification.createdAt).toLocaleString('vi-VN') : 'Gần đây'}
                </p>
            </div>
        </div>
    );
}

function QuickLink({ to, icon, label }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg hover:shadow-sm transition-shadow text-sm text-gray-700"
        >
            <i className={`fa-solid ${icon} text-gray-400`} />
            {label}
        </Link>
    );
}

function InviteItem({ invite }) {
    const queryClient = useQueryClient();

    const acceptMutation = useMutation({
        mutationFn: async (inviteId) => apiClient.post(ENDPOINTS.INVITES.ACCEPT, { inviteId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['pending-invites']);
            window.location.reload();
        }
    });

    const declineMutation = useMutation({
        mutationFn: async (inviteId) => apiClient.delete(ENDPOINTS.INVITES.CANCEL(inviteId)),
        onSuccess: () => queryClient.invalidateQueries(['pending-invites'])
    });

    return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                {invite.companyName?.[0] || 'W'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{invite.companyName}</p>
                <p className="text-xs text-gray-500">{invite.role || 'Member'}</p>
            </div>
            <div className="flex gap-1">
                <button
                    onClick={() => acceptMutation.mutate(invite.id)}
                    disabled={acceptMutation.isPending}
                    className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                    title="Chấp nhận"
                >
                    <i className="fa-solid fa-check" />
                </button>
                <button
                    onClick={() => declineMutation.mutate(invite.id)}
                    disabled={declineMutation.isPending}
                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title="Từ chối"
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        </div>
    );
}

function PersonalFirstSteps({ stats }) {
    const [dismissed, setDismissed] = useState(false);

    const steps = [
        {
            id: 'task',
            label: 'Tạo task đầu tiên',
            done: (stats?.total ?? 0) > 0,
            link: '/app/me/tasks',
            icon: 'fa-list-check'
        },
        {
            id: 'complete',
            label: 'Hoàn thành 1 task',
            done: (stats?.done ?? 0) > 0,
            link: '/app/me/tasks',
            icon: 'fa-check'
        },
        {
            id: 'profile',
            label: 'Cập nhật hồ sơ',
            done: false, // Can't check from stats
            link: '/app/me/profile',
            icon: 'fa-user'
        },
    ];

    const completedCount = steps.filter(s => s.done).length;
    const allDone = completedCount === steps.length;
    const progress = (completedCount / steps.length) * 100;

    if (dismissed || allDone) return null;

    return (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <i className="fa-solid fa-rocket text-violet-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Bắt đầu</h3>
                        <p className="text-sm text-gray-500">{completedCount}/{steps.length} hoàn thành</p>
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Ẩn"
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>

            <div className="h-2 bg-violet-100 rounded-full mb-4 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="space-y-2">
                {steps.map(step => (
                    <Link
                        key={step.id}
                        to={step.link}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${step.done
                            ? 'bg-violet-100/50 text-violet-700'
                            : 'bg-white hover:bg-violet-50 text-gray-700 hover:text-violet-700'
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step.done ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                            {step.done ? (
                                <i className="fa-solid fa-check" />
                            ) : (
                                <i className={`fa-solid ${step.icon}`} />
                            )}
                        </div>
                        <span className={step.done ? 'line-through' : 'font-medium'}>{step.label}</span>
                        {!step.done && (
                            <i className="fa-solid fa-arrow-right ml-auto text-sm text-gray-400" />
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}

function FirstStepsWidget({ stats }) {
    const [dismissed, setDismissed] = useState(false);

    const steps = [
        {
            id: 'project',
            label: 'Tạo dự án đầu tiên',
            done: (stats?.activeProjects ?? 0) > 0,
            link: '/app/projects',
            icon: 'fa-folder-plus'
        },
        {
            id: 'member',
            label: 'Thêm thành viên',
            done: (stats?.totalEmployees ?? 0) > 1,
            link: '/app/hr/employees',
            icon: 'fa-user-plus'
        },
        {
            id: 'task',
            label: 'Tạo task đầu tiên',
            done: (stats?.completedTasks ?? 0) > 0 || (stats?.totalTasks ?? 0) > 0,
            link: '/app/me/issues',
            icon: 'fa-list-check'
        },
        {
            id: 'department',
            label: 'Thiết lập phòng ban',
            done: (stats?.totalDepartments ?? 0) > 0,
            link: '/app/hr/departments',
            icon: 'fa-building'
        },
    ];

    const completedCount = steps.filter(s => s.done).length;
    const allDone = completedCount === steps.length;
    const progress = (completedCount / steps.length) * 100;

    if (dismissed || allDone) return null;

    return (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <i className="fa-solid fa-rocket text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">Bước đầu tiên</h3>
                        <p className="text-sm text-gray-500">{completedCount}/{steps.length} hoàn thành</p>
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Ẩn"
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>

            <div className="h-2 bg-emerald-100 rounded-full mb-4 overflow-hidden">
                <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="space-y-2">
                {steps.map(step => (
                    <Link
                        key={step.id}
                        to={step.link}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${step.done
                            ? 'bg-emerald-100/50 text-emerald-700'
                            : 'bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-700'
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step.done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                            {step.done ? (
                                <i className="fa-solid fa-check" />
                            ) : (
                                <i className={`fa-solid ${step.icon}`} />
                            )}
                        </div>
                        <span className={step.done ? 'line-through' : 'font-medium'}>{step.label}</span>
                        {!step.done && (
                            <i className="fa-solid fa-arrow-right ml-auto text-sm text-gray-400" />
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
