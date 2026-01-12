import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { workspaceType, currentWorkspace } = useWorkspaceStore();

    // Fetch dashboard data
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.DASHBOARD.STATS)).data,
        enabled: workspaceType === 'COMPANY'
    });

    const { data: myTasks = [] } = useQuery({
        queryKey: ['my-tasks'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MY_ISSUES)).data?.content?.slice(0, 5) || []
    });

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications-preview'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST)).data?.content?.slice(0, 5) || []
    });

    // Get current hour for greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    // Fetch attendance history for chart
    const { data: attendanceHistory = [] } = useQuery({
        queryKey: ['my-attendance-history'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ATTENDANCE.MY_HISTORY)).data || []
    });

    // Process attendance data for the current week
    const attendanceData = (() => {
        const today = new Date();
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay() || 7; // Get current day number, convert Sun (0) to 7
        if (day !== 1) startOfWeek.setHours(-24 * (day - 1)); // Set to Monday

        const weekData = [];
        const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

        for (let i = 0; i < 7; i++) {
            const current = new Date(startOfWeek);
            current.setDate(startOfWeek.getDate() + i);
            const dateStr = current.toDateString();

            // Find record for this day
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
                        <QuickAction to="/app/attendance" icon="fa-clock" label="Chấm công" />
                        <QuickAction to="/app/leave-requests" icon="fa-calendar-check" label="Nghỉ phép" />
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
                            <Link to="/app/attendance" className="text-sm text-blue-600 hover:underline">
                                Xem chi tiết →
                            </Link>
                        </div>
                        <div className="h-64">
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
                            <Link to="/app/my-issues" className="text-sm text-blue-600 hover:underline">
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
                        <div className="h-48 flex items-center justify-center">
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

                    {/* Pending Invites */}
                    <PendingInvitesCard />

                    {/* Quick Links */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4">Truy cập nhanh</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <QuickLink to="/app/employees" icon="fa-users" label="Nhân viên" />
                            <QuickLink to="/app/contracts" icon="fa-file-contract" label="Hợp đồng" />
                            <QuickLink to="/app/salaries" icon="fa-money-bill" label="Bảng lương" />
                            <QuickLink to="/app/storage" icon="fa-folder" label="Tài liệu" />
                            <QuickLink to="/app/calendar" icon="fa-calendar" label="Lịch" />
                            <QuickLink to="/app/company/settings" icon="fa-cog" label="Cài đặt" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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

function PendingInvitesCard() {
    const { data: invites = [], isLoading, refetch } = useQuery({
        queryKey: ['pending-invites'],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.INVITES.PENDING)).data || [];
            } catch {
                return [];
            }
        },
    });

    const acceptMutation = useMutation({
        mutationFn: async (inviteId) => apiClient.post(ENDPOINTS.INVITES.ACCEPT, { inviteId }),
        onSuccess: () => {
            refetch();
            window.location.reload(); // Refresh to update workspaces
        }
    });

    const declineMutation = useMutation({
        mutationFn: async (inviteId) => apiClient.delete(ENDPOINTS.INVITES.CANCEL(inviteId)),
        onSuccess: () => refetch()
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Lời mời Workspace</h3>
                {invites.length > 0 && (
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                        {invites.length}
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="text-center py-4">
                    <i className="fa-solid fa-spinner fa-spin text-gray-400" />
                </div>
            ) : invites.length > 0 ? (
                <div className="space-y-3">
                    {invites.slice(0, 3).map((invite) => (
                        <div key={invite.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
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
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 text-gray-400">
                    <div className="w-12 h-12 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <i className="fa-regular fa-envelope-open text-xl" />
                    </div>
                    <p className="text-sm">Không có lời mời</p>
                </div>
            )}
        </div>
    );
}

function FirstStepsWidget({ stats }) {
    const [dismissed, setDismissed] = useState(false);

    // Check completion based on stats
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
            link: '/app/employees',
            icon: 'fa-user-plus'
        },
        {
            id: 'task',
            label: 'Tạo task đầu tiên',
            done: (stats?.completedTasks ?? 0) > 0 || (stats?.totalTasks ?? 0) > 0,
            link: '/app/my-issues',
            icon: 'fa-list-check'
        },
        {
            id: 'department',
            label: 'Thiết lập phòng ban',
            done: (stats?.totalDepartments ?? 0) > 0,
            link: '/app/departments',
            icon: 'fa-building'
        },
    ];

    const completedCount = steps.filter(s => s.done).length;
    const allDone = completedCount === steps.length;
    const progress = (completedCount / steps.length) * 100;

    // Don't show if dismissed or all done
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

            {/* Progress bar */}
            <div className="h-2 bg-emerald-100 rounded-full mb-4 overflow-hidden">
                <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Steps */}
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

