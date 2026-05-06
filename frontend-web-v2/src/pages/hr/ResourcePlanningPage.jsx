import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export default function ResourcePlanningPage() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all | overloaded | available

    const { data: resources = [], isLoading } = useQuery({
        queryKey: ['resource-overview'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.RESOURCE_OVERVIEW);
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 30_000,
    });

    const filtered = resources.filter(r => {
        const matchSearch = !search ||
            r.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            r.email?.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === 'all' ||
            (filter === 'overloaded' && r.overloaded) ||
            (filter === 'available' && !r.overloaded && (r.totalAllocation || 0) < 80);
        return matchSearch && matchFilter;
    });

    const totalUsers = resources.length;
    const overloadedCount = resources.filter(r => r.overloaded).length;
    const availableCount = resources.filter(r => !r.overloaded && (r.totalAllocation || 0) < 80).length;
    const avgAllocation = totalUsers > 0
        ? Math.round(resources.reduce((s, r) => s + (r.totalAllocation || 0), 0) / totalUsers)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Nguồn lực dự án</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Tổng quan phân bổ nhân sự — phát hiện quá tải và tối ưu nguồn lực
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Tổng nhân sự" value={totalUsers} icon="fa-users" color="bg-indigo-100 text-indigo-600" />
                <StatCard
                    label="Quá tải (>100%)"
                    value={overloadedCount}
                    icon="fa-triangle-exclamation"
                    color="bg-red-100 text-red-600"
                    highlight={overloadedCount > 0}
                />
                <StatCard label="Còn khả dụng" value={availableCount} icon="fa-circle-check" color="bg-green-100 text-green-600" />
                <StatCard label="Phân bổ TB" value={`${avgAllocation}%`} icon="fa-chart-pie" color="bg-purple-100 text-purple-600" />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm kiếm nhân sự..."
                        className="input w-full pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    {[
                        { key: 'all', label: 'Tất cả' },
                        { key: 'overloaded', label: '⚠ Quá tải' },
                        { key: 'available', label: '✓ Khả dụng' },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filter === f.key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Resource List */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-400" />
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState search={search} filter={filter} />
            ) : (
                <div className="space-y-3">
                    {filtered.map(resource => (
                        <ResourceCard key={resource.userId} resource={resource} />
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color, highlight }) {
    return (
        <div className={`bg-white rounded-xl p-4 shadow-sm border transition-shadow hover:shadow-md ${
            highlight ? 'border-red-200 ring-1 ring-red-200' : 'border-gray-100'
        }`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon}`} />
                </div>
            </div>
        </div>
    );
}

function ResourceCard({ resource }) {
    const [expanded, setExpanded] = useState(false);
    const allocation = resource.totalAllocation || 0;

    const allocationBarColor =
        allocation > 100 ? 'bg-red-500' :
        allocation >= 80  ? 'bg-orange-400' :
        allocation >= 50  ? 'bg-indigo-500' : 'bg-green-500';

    const allocationTextColor =
        allocation > 100 ? 'text-red-600' :
        allocation >= 80  ? 'text-orange-600' :
        allocation >= 50  ? 'text-indigo-600' : 'text-green-600';

    const totalHours = (resource.projects || []).reduce((s, p) => s + (p.totalLoggedHours || 0), 0);

    return (
        <div className={`bg-white rounded-xl border shadow-sm transition-all ${
            resource.overloaded ? 'border-red-200 ring-1 ring-red-200' : 'border-gray-100'
        }`}>
            <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 rounded-xl"
                onClick={() => setExpanded(v => !v)}
            >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    {resource.avatarUrl ? (
                        <img src={resource.avatarUrl} alt={resource.fullName} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {resource.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                    {resource.overloaded && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <i className="fa-solid fa-exclamation text-white" style={{ fontSize: 8 }} />
                        </div>
                    )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{resource.fullName || resource.email}</span>
                        {resource.overloaded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10 }} /> Quá tải
                            </span>
                        )}
                        {!resource.overloaded && allocation < 50 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                <i className="fa-solid fa-circle-check" style={{ fontSize: 10 }} /> Khả dụng
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{resource.email}</div>
                </div>

                {/* Allocation Bar */}
                <div className="w-44 hidden sm:block">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Phân bổ tổng</span>
                        <span className={`text-sm font-bold ${allocationTextColor}`}>{allocation}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${allocationBarColor}`}
                            style={{ width: `${Math.min(allocation, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Summary */}
                <div className="hidden md:flex gap-5 text-center">
                    <div>
                        <div className="text-xs text-gray-400">Dự án</div>
                        <div className="font-bold text-gray-800">{resource.projects?.length || 0}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400">Giờ log</div>
                        <div className="font-bold text-gray-800">{totalHours.toFixed(0)}h</div>
                    </div>
                </div>

                <i className={`fa-solid fa-chevron-down text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Project details */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="pt-3 space-y-2">
                        {(resource.projects || []).length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">Không có dự án nào</p>
                        ) : (
                            resource.projects.map(proj => (
                                <ProjectSlotRow key={proj.projectId} slot={proj} />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ProjectSlotRow({ slot }) {
    const alloc = slot.allocationRate || 0;
    const barColor = alloc > 80 ? 'bg-orange-400' : alloc >= 50 ? 'bg-indigo-400' : 'bg-green-400';

    const statusStyles = {
        ACTIVE:    'bg-green-100 text-green-700',
        ON_LEAVE:  'bg-yellow-100 text-yellow-700',
        PART_TIME: 'bg-blue-100 text-blue-700',
        INACTIVE:  'bg-gray-100 text-gray-500',
    };
    const statusLabel = {
        ACTIVE: 'Đang làm', ON_LEAVE: 'Nghỉ phép',
        PART_TIME: 'Bán thời gian', INACTIVE: 'Không hoạt động',
    };
    const roleLabel = { OWNER: 'Chủ dự án', MANAGER: 'Quản lý', MEMBER: 'Thành viên' };

    return (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-800 truncate">{slot.projectName}</span>
                    {slot.position && <span className="text-xs text-gray-400">· {slot.position}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{roleLabel[slot.role] || slot.role}</span>
                    {slot.memberStatus && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusStyles[slot.memberStatus] || statusStyles.ACTIVE}`}>
                            {statusLabel[slot.memberStatus] || slot.memberStatus}
                        </span>
                    )}
                </div>
            </div>

            <div className="w-24 hidden sm:block">
                <div className="flex justify-between mb-0.5">
                    <span className="text-[10px] text-gray-400">Phân bổ</span>
                    <span className="text-[10px] font-semibold text-gray-600">{alloc}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(alloc, 100)}%` }} />
                </div>
            </div>

            <div className="text-right min-w-[52px]">
                <div className="text-xs text-gray-400">Giờ</div>
                <div className="text-sm font-semibold text-gray-700">{(slot.totalLoggedHours || 0).toFixed(0)}h</div>
            </div>
        </div>
    );
}

function EmptyState({ search, filter }) {
    return (
        <div className="text-center py-16 text-gray-400">
            <i className="fa-solid fa-users-slash text-4xl mb-3 block opacity-40" />
            <p className="font-medium text-gray-500">
                {search
                    ? `Không tìm thấy nhân sự phù hợp với "${search}"`
                    : filter === 'overloaded' ? 'Không có nhân sự nào đang quá tải 🎉'
                    : filter === 'available'  ? 'Tất cả nhân sự đang được phân bổ đầy đủ'
                    : 'Chưa có dữ liệu phân bổ nguồn lực'}
            </p>
            <p className="text-sm mt-1">
                Hãy thêm thành viên vào dự án và cập nhật tỉ lệ phân bổ trong tab Nhóm của dự án
            </p>
        </div>
    );
}
