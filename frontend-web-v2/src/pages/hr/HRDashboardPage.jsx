import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export default function HRDashboardPage() {
    const navigate = useNavigate();
    const { hasRole } = useWorkspaceStore();

    // Fetch employees for charts and lists
    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees-dashboard'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST)).data,
    });

    // Fetch Dashboard Stats (Server-side aggregation for accurate counts)
    const { data: dashboardStats } = useQuery({
        queryKey: ['hr-dashboard-stats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.HR_DASHBOARD.STATS)).data,
    });

    // Fetch pending leave requests
    const { data: leaveRequests } = useQuery({
        queryKey: ['pending-leaves-dashboard'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.LEAVE_REQUESTS.LIST, { params: { status: 'PENDING' } })).data,
        enabled: hasRole('MANAGER_HR', 'OWNER', 'ADMIN'),
    });

    // Fetch pending reviews
    const { data: pendingReviews } = useQuery({
        queryKey: ['pending-reviews-dashboard'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.REVIEWS.PENDING)).data,
        enabled: hasRole('OWNER', 'ADMIN'),
    });

    // Fetch today's attendance (retained for detailed report if needed)
    const { data: attendance } = useQuery({
        queryKey: ['attendance-today'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ATTENDANCE.REPORT)).data,
    });

    // Calculate stats
    const employeeList = Array.isArray(employees) ? employees : employees?.content || [];
    const leaveList = Array.isArray(leaveRequests) ? leaveRequests : leaveRequests?.content || [];
    const reviewList = Array.isArray(pendingReviews) ? pendingReviews : pendingReviews?.content || [];

    const stats = {
        // Use server-side stats if available, otherwise fallback (likely inaccurate for large sets)
        totalEmployees: dashboardStats?.totalEmployees ?? (employees?.totalElements || employeeList.length),
        activeEmployees: dashboardStats?.activeEmployees ?? employeeList.filter(e => e.status === 'ACTIVE').length,
        onLeave: dashboardStats?.onLeave ?? employeeList.filter(e => e.status === 'ON_LEAVE').length,
        pendingLeaves: dashboardStats?.pendingLeaves ?? (leaveRequests?.totalElements || leaveList.length),
        pendingReviews: dashboardStats?.pendingReviews ?? (pendingReviews?.totalElements || reviewList.length),
        checkedIn: dashboardStats?.checkedIn ?? attendance?.checkedIn ?? 0,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
                <p className="text-gray-500 text-sm">Tổng quan quản lý nhân sự</p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    label="Tổng nhân viên"
                    value={stats.totalEmployees}
                    icon="fa-users"
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    loading={loadingEmployees}
                />
                <StatCard
                    label="Đang làm việc"
                    value={stats.activeEmployees}
                    icon="fa-user-check"
                    color="bg-gradient-to-br from-green-500 to-green-600"
                    loading={loadingEmployees}
                />
                <StatCard
                    label="Đang nghỉ phép"
                    value={stats.onLeave}
                    icon="fa-user-clock"
                    color="bg-gradient-to-br from-yellow-500 to-orange-500"
                    loading={loadingEmployees}
                />
                <StatCard
                    label="Đơn nghỉ chờ duyệt"
                    value={stats.pendingLeaves}
                    icon="fa-file-lines"
                    color="bg-gradient-to-br from-orange-500 to-red-500"
                    badge={stats.pendingLeaves > 0}
                />
                <StatCard
                    label="Đánh giá chờ duyệt"
                    value={stats.pendingReviews}
                    icon="fa-clipboard-check"
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    badge={stats.pendingReviews > 0}
                />
                <StatCard
                    label="Check-in hôm nay"
                    value={stats.checkedIn}
                    icon="fa-fingerprint"
                    color="bg-gradient-to-br from-teal-500 to-cyan-600"
                />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                    <i className="fa-solid fa-bolt text-yellow-500 mr-2" />
                    Thao tác nhanh
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionCard
                        icon="fa-user-plus"
                        label="Thêm nhân viên"
                        description="Tạo hồ sơ nhân viên mới"
                        color="bg-blue-500"
                        onClick={() => navigate('/app/employees')}
                    />
                    <QuickActionCard
                        icon="fa-file-signature"
                        label="Duyệt đơn nghỉ"
                        description={`${stats.pendingLeaves} đơn đang chờ`}
                        color="bg-orange-500"
                        onClick={() => navigate('/app/leave-requests')}
                        badge={stats.pendingLeaves > 0}
                    />
                    <QuickActionCard
                        icon="fa-chart-line"
                        label="Đánh giá nhân viên"
                        description="Tạo và quản lý đánh giá"
                        color="bg-purple-500"
                        onClick={() => navigate('/app/reviews')}
                    />
                    <QuickActionCard
                        icon="fa-money-bill-wave"
                        label="Bảng lương"
                        description="Xem và tính lương"
                        color="bg-green-500"
                        onClick={() => navigate('/app/salaries')}
                    />
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Pending Leave Requests */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">
                            <i className="fa-solid fa-clock text-orange-500 mr-2" />
                            Đơn nghỉ phép mới nhất
                        </h2>
                        <button
                            onClick={() => navigate('/app/leave-requests')}
                            className="text-sm text-primary hover:underline"
                        >
                            Xem tất cả →
                        </button>
                    </div>
                    <div className="space-y-3">
                        {leaveList.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <i className="fa-solid fa-inbox text-3xl mb-2" />
                                <p>Không có đơn nào đang chờ duyệt</p>
                            </div>
                        ) : (
                            leaveList.slice(0, 5).map((leave, i) => (
                                <div key={leave.leaveRequestId || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-semibold">
                                            {(leave.employee?.fullName || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{leave.employee?.fullName || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(leave.startDate).toLocaleDateString('vi-VN')} - {new Date(leave.endDate).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                                        {leave.leaveType}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Department Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">
                        <i className="fa-solid fa-building text-blue-500 mr-2" />
                        Phân bố nhân sự theo phòng ban
                    </h2>
                    <DepartmentChart employees={employeeList} />
                </div>
            </div>

            {/* Employee Status Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                    <i className="fa-solid fa-chart-pie text-purple-500 mr-2" />
                    Trạng thái nhân viên
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatusCard
                        label="Đang làm việc"
                        count={employeeList.filter(e => e.status === 'ACTIVE').length}
                        total={employeeList.length}
                        color="bg-green-500"
                    />
                    <StatusCard
                        label="Thử việc"
                        count={employeeList.filter(e => e.status === 'PROBATION').length}
                        total={employeeList.length}
                        color="bg-blue-500"
                    />
                    <StatusCard
                        label="Đang nghỉ"
                        count={employeeList.filter(e => e.status === 'ON_LEAVE').length}
                        total={employeeList.length}
                        color="bg-yellow-500"
                    />
                    <StatusCard
                        label="Đã nghỉ việc"
                        count={employeeList.filter(e => e.status === 'RESIGNED').length}
                        total={employeeList.length}
                        color="bg-gray-500"
                    />
                    <StatusCard
                        label="Tạm nghỉ"
                        count={employeeList.filter(e => e.status === 'INACTIVE').length}
                        total={employeeList.length}
                        color="bg-red-500"
                    />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color, loading, badge }) {
    return (
        <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            {badge && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white mb-3`}>
                <i className={`fa-solid ${icon} text-lg`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">
                {loading ? <span className="animate-pulse">...</span> : value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
    );
}

function QuickActionCard({ icon, label, description, color, onClick, badge }) {
    return (
        <button
            onClick={onClick}
            className="relative text-left p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group"
        >
            {badge && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
                <i className={`fa-solid ${icon}`} />
            </div>
            <h3 className="font-semibold text-gray-800">{label}</h3>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
        </button>
    );
}

function DepartmentChart({ employees }) {
    // Group by department
    const deptCounts = {};
    employees.forEach(emp => {
        const deptName = emp.department?.name || 'Chưa phân phòng';
        deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
    });

    const entries = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
    const total = employees.length || 1;
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];

    if (entries.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                <i className="fa-solid fa-building text-3xl mb-2" />
                <p>Chưa có dữ liệu phòng ban</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {entries.slice(0, 6).map(([name, count], i) => {
                const percent = Math.round((count / total) * 100);
                return (
                    <div key={name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">{name}</span>
                            <span className="text-gray-500">{count} ({percent}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function StatusCard({ label, count, total, color }) {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    return (
        <div className="text-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="relative w-16 h-16 mx-auto mb-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="2" />
                    <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${percent} 100`}
                        className={color.replace('bg-', 'text-')}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-700">{count}</span>
                </div>
            </div>
            <p className="text-xs text-gray-600">{label}</p>
        </div>
    );
}
