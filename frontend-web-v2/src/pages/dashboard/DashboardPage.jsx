import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAuthStore } from '@shared/stores/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
    const { user } = useAuthStore();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.DASHBOARD.STATS)).data,
    });

    const { data: monthlyData } = useQuery({
        queryKey: ['dashboard-monthly'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.DASHBOARD.MONTHLY)).data,
    });

    if (isLoading) return <div className="p-8 text-center">Đang tải dữ liệu tổng quan...</div>;

    // Mock data if API fails or empty for visualization
    const chartData = monthlyData || [
        { name: 'Jan', revenue: 4000, expense: 2400 },
        { name: 'Feb', revenue: 3000, expense: 1398 },
        { name: 'Mar', revenue: 2000, expense: 9800 },
        { name: 'Apr', revenue: 2780, expense: 3908 },
        { name: 'May', revenue: 1890, expense: 4800 },
        { name: 'Jun', revenue: 2390, expense: 3800 },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Xin chào, {user?.fullName || 'Admin'}! 👋</h1>
                    <p className="text-blue-100 max-w-2xl">
                        Chào mừng bạn quay trở lại. Hãy cùng xem qua tình hình hoạt động của workspace hôm nay.
                    </p>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
                    <i className="fa-solid fa-chart-line text-[150px] translate-x-12 -translate-y-4" />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Thành viên"
                    value={stats?.totalEmployees || 120}
                    icon="fa-users"
                    color="bg-blue-500"
                    change="+5% tháng này"
                />
                <StatCard
                    title="Dự án Active"
                    value={stats?.activeProjects || 8}
                    icon="fa-diagram-project"
                    color="bg-purple-500"
                    change="2 dự án mới"
                />
                <StatCard
                    title="Đơn nghỉ phép"
                    value={stats?.pendingLeaves || 3}
                    icon="fa-envelope-open-text"
                    color="bg-yellow-500"
                    change="Cần duyệt ngay"
                />
                <StatCard
                    title="Doanh thu"
                    value="2.4B"
                    icon="fa-sack-dollar"
                    color="bg-green-500"
                    change="+12% so với tháng trước"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 text-lg">Thống kê tài chính</h3>
                        <select className="input-sm">
                            <option>Trong năm nay</option>
                            <option>6 tháng qua</option>
                        </select>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 text-lg mb-6">Hoạt động gần đây</h3>
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map((_, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 shrink-0"></div>
                                <div>
                                    <p className="text-sm text-gray-800">
                                        <span className="font-semibold">Nguyen Van A</span> đã hoàn thành task <span className="font-semibold">Implement Login UI</span>
                                    </p>
                                    <span className="text-xs text-gray-400">2 giờ trước</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-6 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors">
                        Xem tất cả hoạt động
                    </button>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color, change }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
                    <div className="text-3xl font-bold text-gray-900 mt-1">{value}</div>
                </div>
                <div className={`w-12 h-12 rounded-lg ${color} bg-opacity-10 flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} text-xl ${color.replace('bg-', 'text-')}`} />
                </div>
            </div>
            <div className="text-xs font-medium text-green-600 flex items-center gap-1">
                <i className="fa-solid fa-arrow-trend-up" /> {change}
            </div>
        </div>
    );
}
