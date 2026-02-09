import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from '@shared/components/LazyCharts';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatCurrency, formatBytes, formatNumber } from '@shared/utils/formatters';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminAnalyticsPage() {
    const { data: stats = {}, isLoading: loadingStats } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SYSADMIN.ANALYTICS.STATS);
            return res.data;
        }
    });

    const { data: growth = [], isLoading: loadingGrowth } = useQuery({
        queryKey: ['admin-growth'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SYSADMIN.ANALYTICS.GROWTH);
            return res.data;
        }
    });

    if (loadingStats || loadingGrowth) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner" />
            </div>
        );
    }

    // Plan distribution data
    const planData = [
        { name: 'FREE', value: stats.freeCount || 0 },
        { name: 'STARTER', value: stats.starterCount || 0 },
        { name: 'PROFESSIONAL', value: stats.professionalCount || 0 },
        { name: 'ENTERPRISE', value: stats.enterpriseCount || 0 },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thống kê hệ thống</h1>
                    <p className="text-gray-500 text-sm">Tổng quan về hoạt động của hệ thống</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Dữ liệu realtime
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    label="Doanh thu tháng này"
                    value={formatCurrency(stats.monthlyRevenue || 0)}
                    icon="fa-dollar-sign"
                    color="indigo"
                />
                <KPICard
                    label="Tổng workspace"
                    value={stats.totalCompanies || 0}
                    icon="fa-building"
                    color="blue"
                />
                <KPICard
                    label="Tổng người dùng"
                    value={stats.totalUsers || 0}
                    icon="fa-users"
                    color="green"
                />
                <KPICard
                    label="Workspace mới tháng này"
                    value={stats.newCompaniesThisMonth || 0}
                    icon="fa-plus-circle"
                    color="purple"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Growth Chart */}
                <div className="lg:col-span-2 card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        <i className="fa-solid fa-chart-line text-indigo-500 mr-2" />
                        Tăng trưởng người dùng
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growth}>
                                <defs>
                                    <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} fill="url(#userGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Plan Distribution */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        <i className="fa-solid fa-chart-pie text-purple-500 mr-2" />
                        Phân bố gói dịch vụ
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={planData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${formatNumber(percent * 100, { maximumFractionDigits: 0 })}% `}
                                >
                                    {planData.map((_, index) => (
                                        <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                        {planData.map((item, index) => (
                            <div key={item.name} className="flex items-center gap-1 text-xs">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                {item.name}: {item.value}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Company Growth Bar Chart */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <i className="fa-solid fa-chart-bar text-green-500 mr-2" />
                    Workspace mới theo tháng
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={growth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="companies" name="Workspace mới" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickStat label="Active Users Today" value={stats.activeUsersToday || 0} icon="fa-user-check" color="green" />
                <QuickStat label="Projects Created" value={stats.totalProjects || 0} icon="fa-diagram-project" color="blue" />
                <QuickStat label="Messages Sent" value={stats.totalMessages || 0} icon="fa-message" color="purple" />
                <QuickStat label="Storage Used" value={formatBytes(stats.totalStorageUsed || 0)} icon="fa-database" color="amber" />
            </div>
        </div>
    );
}

function KPICard({ label, value, icon, color }) {
    const colorClasses = {
        indigo: 'bg-indigo-100 text-indigo-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        amber: 'bg-amber-100 text-amber-600',
    };

    return (
        <div className="stat-card">
            <div className="flex items-center gap-4">
                <div className={`w - 12 h - 12 rounded - xl flex items - center justify - center ${colorClasses[color]} `}>
                    <i className={`fa - solid ${icon} text - xl`} />
                </div>
                <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

function QuickStat({ label, value, icon, color }) {
    const colorClasses = {
        green: 'text-green-500',
        blue: 'text-blue-500',
        purple: 'text-purple-500',
        amber: 'text-amber-500',
    };

    return (
        <div className="card p-4 flex items-center gap-3">
            <i className={`fa - solid ${icon} ${colorClasses[color]} `} />
            <div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
            </div>
        </div>
    );
}




