export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Dashboard Overview</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Tổng nhân viên"
                    value={0}
                    icon="fa-users"
                    color="purple"
                />
                <StatCard
                    title="Đơn chờ duyệt"
                    value={0}
                    icon="fa-clock"
                    color="yellow"
                />
                <StatCard
                    title="Dự án đang chạy"
                    value={0}
                    icon="fa-folder-open"
                    color="blue"
                />
                <StatCard
                    title="Công việc của tôi"
                    value={0}
                    icon="fa-list-check"
                    color="green"
                />
            </div>

            {/* TODO: Add charts and activity feed */}
            <div className="card">
                <div className="empty-state">
                    <i className="fa-solid fa-chart-line" />
                    <div>Dữ liệu dashboard sẽ được hiển thị ở đây</div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    const colorClasses = {
        purple: 'bg-purple-500',
        yellow: 'bg-yellow-500',
        blue: 'bg-blue-500',
        green: 'bg-green-500',
    };

    return (
        <div className="stat-card">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-3xl font-bold text-gray-800">{value}</div>
                    <div className="text-sm text-gray-500 mt-1">{title}</div>
                </div>
                <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} text-white text-xl`} />
                </div>
            </div>
        </div>
    );
}
