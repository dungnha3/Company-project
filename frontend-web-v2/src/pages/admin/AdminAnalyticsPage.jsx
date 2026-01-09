import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export default function AdminAnalyticsPage() {
    // Fetch companies for stats
    const { data: companies = [], isLoading: loadingCompanies } = useQuery({
        queryKey: ['admin-companies'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ADMIN.COMPANIES);
            return res.data;
        },
    });

    // Fetch users for stats
    const { data: users = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const res = await apiClient.get('/api/users');
            return res.data;
        },
    });

    const isLoading = loadingCompanies || loadingUsers;

    // Calculate stats
    const stats = {
        totalCompanies: companies.length,
        activeCompanies: companies.filter(c => c.isActive).length,
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive !== false).length,
        systemAdmins: users.filter(u => u.isSystemAdmin).length,
        planDistribution: {
            FREE: companies.filter(c => c.plan === 'FREE').length,
            STARTER: companies.filter(c => c.plan === 'STARTER').length,
            PROFESSIONAL: companies.filter(c => c.plan === 'PROFESSIONAL').length,
            ENTERPRISE: companies.filter(c => c.plan === 'ENTERPRISE').length,
        },
    };

    // Calculate average users per company
    const avgUsersPerCompany = stats.totalCompanies > 0
        ? Math.round(stats.totalUsers / stats.totalCompanies)
        : 0;

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Đang tải thống kê...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Thống kê Hệ thống</h1>
                <p className="text-gray-500 mt-1">Tổng quan về hoạt động của platform (aggregate data only)</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon="fa-building"
                    iconBg="bg-blue-500"
                    label="Tổng Công ty"
                    value={stats.totalCompanies}
                    subtext={`${stats.activeCompanies} đang hoạt động`}
                />
                <StatCard
                    icon="fa-users"
                    iconBg="bg-green-500"
                    label="Tổng Users"
                    value={stats.totalUsers}
                    subtext={`${stats.activeUsers} active`}
                />
                <StatCard
                    icon="fa-user-group"
                    iconBg="bg-purple-500"
                    label="Trung bình Users/Công ty"
                    value={avgUsersPerCompany}
                    subtext="average"
                />
                <StatCard
                    icon="fa-user-shield"
                    iconBg="bg-amber-500"
                    label="System Admins"
                    value={stats.systemAdmins}
                    subtext="administrators"
                />
            </div>

            {/* Plan Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Phân bổ Plan</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <PlanCard plan="FREE" count={stats.planDistribution.FREE} color="gray" />
                    <PlanCard plan="STARTER" count={stats.planDistribution.STARTER} color="blue" />
                    <PlanCard plan="PROFESSIONAL" count={stats.planDistribution.PROFESSIONAL} color="indigo" />
                    <PlanCard plan="ENTERPRISE" count={stats.planDistribution.ENTERPRISE} color="purple" />
                </div>

                {/* Progress bar */}
                <div className="mt-6">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                        {stats.totalCompanies > 0 && (
                            <>
                                <div
                                    className="bg-gray-400 transition-all duration-500"
                                    style={{ width: `${(stats.planDistribution.FREE / stats.totalCompanies) * 100}%` }}
                                    title={`FREE: ${stats.planDistribution.FREE}`}
                                />
                                <div
                                    className="bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(stats.planDistribution.STARTER / stats.totalCompanies) * 100}%` }}
                                    title={`STARTER: ${stats.planDistribution.STARTER}`}
                                />
                                <div
                                    className="bg-indigo-500 transition-all duration-500"
                                    style={{ width: `${(stats.planDistribution.PROFESSIONAL / stats.totalCompanies) * 100}%` }}
                                    title={`PROFESSIONAL: ${stats.planDistribution.PROFESSIONAL}`}
                                />
                                <div
                                    className="bg-purple-500 transition-all duration-500"
                                    style={{ width: `${(stats.planDistribution.ENTERPRISE / stats.totalCompanies) * 100}%` }}
                                    title={`ENTERPRISE: ${stats.planDistribution.ENTERPRISE}`}
                                />
                            </>
                        )}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Free tier</span>
                        <span>Enterprise</span>
                    </div>
                </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <i className="fa-solid fa-lock text-green-500 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-green-800">Dữ liệu tổng hợp</p>
                    <p className="text-xs text-green-600 mt-1">
                        Trang này chỉ hiển thị dữ liệu tổng hợp (aggregate). System Admin không có quyền truy cập dữ liệu cá nhân của users hoặc nội dung workspace.
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Hành động nhanh</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href="/admin" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                            <i className="fa-solid fa-building" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Quản lý Công ty</p>
                            <p className="text-sm text-gray-500">Xem, đổi plan, suspend</p>
                        </div>
                    </a>
                    <a href="/admin/users" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                            <i className="fa-solid fa-users" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Quản lý Users</p>
                            <p className="text-sm text-gray-500">Disable, reset password</p>
                        </div>
                    </a>
                    <a href="/admin/settings" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                            <i className="fa-solid fa-cog" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Cài đặt hệ thống</p>
                            <p className="text-sm text-gray-500">Feature flags, config</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, iconBg, label, value, subtext }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center text-white shadow-lg`}>
                    <i className={`fa-solid ${icon} text-xl`} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">{label}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                    <p className="text-xs text-gray-400">{subtext}</p>
                </div>
            </div>
        </div>
    );
}

function PlanCard({ plan, count, color }) {
    const colorMap = {
        gray: 'bg-gray-100 text-gray-800 border-gray-200',
        blue: 'bg-blue-100 text-blue-800 border-blue-200',
        indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
    };

    return (
        <div className={`p-4 rounded-xl border ${colorMap[color]} text-center`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm font-medium mt-1">{plan}</p>
        </div>
    );
}
