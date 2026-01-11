import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

const ACTIVITY_TYPES = {
    all: { label: 'Tất cả', icon: 'fa-list' },
    member: { label: 'Thành viên', icon: 'fa-users' },
    project: { label: 'Dự án', icon: 'fa-folder' },
    settings: { label: 'Cài đặt', icon: 'fa-cog' },
    billing: { label: 'Thanh toán', icon: 'fa-credit-card' },
    security: { label: 'Bảo mật', icon: 'fa-shield-alt' },
};

export default function ActivityLogPage() {
    const { currentWorkspace } = useWorkspaceStore();
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d, all

    // Mock activity data - replace with actual API
    const { data: activities = [], isLoading } = useQuery({
        queryKey: ['company-activity', currentWorkspace?.id, filter, dateRange],
        queryFn: async () => {
            // Mock data
            return [
                { id: 1, type: 'member', user: 'Nguyễn Văn A', email: 'a@company.com', action: 'đã tham gia công ty', target: null, ip: '192.168.1.1', time: new Date(Date.now() - 300000), icon: 'fa-user-plus', color: 'green' },
                { id: 2, type: 'project', user: 'Trần Thị B', email: 'b@company.com', action: 'đã tạo dự án', target: 'Mobile App', ip: '192.168.1.2', time: new Date(Date.now() - 1800000), icon: 'fa-folder-plus', color: 'blue' },
                { id: 3, type: 'settings', user: 'Admin', email: 'admin@company.com', action: 'đã cập nhật cài đặt', target: 'Bảo mật', ip: '192.168.1.3', time: new Date(Date.now() - 7200000), icon: 'fa-cog', color: 'purple' },
                { id: 4, type: 'member', user: 'Lê Văn C', email: 'c@company.com', action: 'được thăng cấp', target: 'Manager', ip: '192.168.1.4', time: new Date(Date.now() - 86400000), icon: 'fa-user-shield', color: 'orange' },
                { id: 5, type: 'billing', user: 'System', email: 'system', action: 'Thanh toán thành công', target: '$99/tháng', ip: null, time: new Date(Date.now() - 259200000), icon: 'fa-credit-card', color: 'emerald' },
                { id: 6, type: 'security', user: 'Phạm Văn D', email: 'd@company.com', action: 'đã bật 2FA', target: null, ip: '192.168.1.5', time: new Date(Date.now() - 345600000), icon: 'fa-shield-alt', color: 'red' },
                { id: 7, type: 'member', user: 'Hoàng Thị E', email: 'e@company.com', action: 'đã rời công ty', target: null, ip: '192.168.1.6', time: new Date(Date.now() - 432000000), icon: 'fa-user-minus', color: 'gray' },
                { id: 8, type: 'project', user: 'Nguyễn Văn F', email: 'f@company.com', action: 'đã xóa dự án', target: 'Old Project', ip: '192.168.1.7', time: new Date(Date.now() - 518400000), icon: 'fa-trash', color: 'red' },
            ];
        },
        enabled: !!currentWorkspace?.id,
    });

    const filteredActivities = activities.filter(a => {
        if (filter !== 'all' && a.type !== filter) return false;
        if (searchQuery && !a.user.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !a.action.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Nhật ký hoạt động</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Theo dõi tất cả hoạt động trong công ty
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm hoạt động..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {Object.entries(ACTIVITY_TYPES).map(([key, { label, icon }]) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === key
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <i className={`fa-solid ${icon} mr-1.5`} />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Date Range */}
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-4 py-2.5 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                    >
                        <option value="7d">7 ngày qua</option>
                        <option value="30d">30 ngày qua</option>
                        <option value="90d">90 ngày qua</option>
                        <option value="all">Tất cả</option>
                    </select>

                    {/* Export */}
                    <button className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-600 transition-colors">
                        <i className="fa-solid fa-download mr-2" />
                        Xuất CSV
                    </button>
                </div>
            </div>

            {/* Activity List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-300" />
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                            <i className="fa-solid fa-history text-2xl text-gray-300" />
                        </div>
                        <p className="text-gray-400">Không có hoạt động nào</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Hoạt động
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Người dùng
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    IP
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Thời gian
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredActivities.map(activity => (
                                <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg bg-${activity.color}-100 flex items-center justify-center`}>
                                                <i className={`fa-solid ${activity.icon} text-${activity.color}-600 text-sm`} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    {activity.action}
                                                    {activity.target && (
                                                        <span className="font-medium text-gray-900"> "{activity.target}"</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                                            <p className="text-xs text-gray-400">{activity.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500 font-mono">
                                            {activity.ip || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm text-gray-600">
                                                {formatRelativeTime(activity.time)}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {activity.time.toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {filteredActivities.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Hiển thị {filteredActivities.length} hoạt động
                    </p>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>
                            ← Trước
                        </button>
                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                            Sau →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}
