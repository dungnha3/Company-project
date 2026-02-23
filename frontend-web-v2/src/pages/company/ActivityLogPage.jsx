import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatRelativeTime, formatDateTime } from '@shared/utils/formatters';

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

    const [page, setPage] = useState(0);

    // Fetch activity data
    const { data: dataPage, isLoading } = useQuery({
        queryKey: ['company-activity', currentWorkspace?.id, filter, dateRange, searchQuery, page],
        queryFn: async () => {
            const params = { page, size: 20 };

            // Map filters to API params
            if (filter !== 'all') params.type = filter.toUpperCase();
            if (searchQuery) params.search = searchQuery;

            // Date range calculation
            const now = new Date();
            if (dateRange === '7d') params.after = new Date(now - 7 * 86400000).toISOString();
            if (dateRange === '30d') params.after = new Date(now - 30 * 86400000).toISOString();
            if (dateRange === '90d') params.after = new Date(now - 90 * 86400000).toISOString();

            return (await apiClient.get(ENDPOINTS.AUDIT.LIST, { params })).data;
        },
        enabled: !!currentWorkspace?.id,
        keepPreviousData: true,
    });

    const activities = (Array.isArray(dataPage) ? dataPage : dataPage?.content || []).map(log => {
        const typeKey = log.type?.toLowerCase() || 'system';
        const config = ACTIVITY_TYPES[typeKey] || { icon: 'fa-info-circle', label: 'Info' };

        return {
            id: log.id,
            type: typeKey,
            user: log.actorName || 'System',
            email: log.actorEmail,
            action: log.action,
            target: log.target,
            ip: log.ipAddress,
            time: new Date(log.createdAt),
            icon: config.icon,
            color: typeKey === 'security' ? 'red' : typeKey === 'billing' ? 'green' : 'blue'
        };
    });

    const totalElements = dataPage?.totalElements || 0;
    const totalPages = dataPage?.totalPages || 0;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Nhật ký hoạt động</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Theo dõi tất cả hoạt động trong Workspace
                </p>
            </div>

            {/* Filters */}
            <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm hoạt động..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border-none outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    {/* Type Filter */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {Object.entries(ACTIVITY_TYPES).map(([key, { label, icon }]) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === key
                                    ? 'bg-white text-indigo-600 shadow-sm'
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
                        className="px-4 py-2.5 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-100 text-sm"
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
            <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-300" />
                    </div>
                ) : activities.length === 0 ? (
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
                            {activities.map(activity => (
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
                                                {formatDateTime(activity.time)}
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
            {totalElements > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Hiển thị {activities.length} / {totalElements} hoạt động
                    </p>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ← Trước
                        </button>
                        <span className="text-sm text-gray-600 mx-2">
                            Trang {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= totalPages - 1}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sau →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


