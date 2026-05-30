import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAccessControl } from '@shared/hooks/useAccessControl';

const STATUS_LABELS = {
    ACTIVE: { label: 'Đang làm', color: 'bg-green-100 text-green-700' },
    INACTIVE: { label: 'Tạm ngừng', color: 'bg-gray-100 text-gray-500' },
    PENDING: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700' },
};
const ROLE_LABELS = {
    OWNER: { label: 'Chủ dự án', color: 'bg-purple-100 text-purple-700' },
    MANAGER: { label: 'Quản lý', color: 'bg-blue-100 text-blue-700' },
    MEMBER: { label: 'Thành viên', color: 'bg-gray-100 text-gray-600' },
};

// ─── Shared components (defined BEFORE usage) ───────────────
function AllocationBar({ value }) {
    const pct = Math.min(100, Math.max(0, value || 0));
    const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-500';
    return (
        <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-semibold ${pct > 90 ? 'text-red-600' : 'text-gray-600'}`}>{pct}%</span>
            {pct > 100 && <i className="fa-solid fa-triangle-exclamation text-xs text-red-500" title="Quá tải!" />}
        </div>
    );
}

function StatCard({ label, value, icon, danger, success }) {
    return (
        <div className={`bg-white rounded-xl p-4 border shadow-sm transition-shadow hover:shadow-md ${
            danger ? 'border-red-100' : 'border-gray-100'
        }`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</p>
                    <p className={`text-2xl font-semibold mt-1 ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${danger ? 'bg-red-50' : success ? 'bg-green-50' : 'bg-gray-100'} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} ${danger ? 'text-red-500' : success ? 'text-green-500' : 'text-gray-400'}`} />
                </div>
            </div>
        </div>
    );
}

function ProjectSlotRow({ slot }) {
    const alloc = slot.allocationRate || 0;
    const barColor = alloc > 80 ? 'bg-amber-400' : alloc >= 50 ? 'bg-gray-400' : 'bg-green-400';
    const statusStyles = {
        ACTIVE: 'bg-green-50 text-green-700',
        ON_LEAVE: 'bg-amber-50 text-amber-700',
        PART_TIME: 'bg-gray-100 text-gray-700',
        INACTIVE: 'bg-gray-100 text-gray-500',
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
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(alloc, 100)}%` }} />
                </div>
            </div>
            <div className="text-right min-w-[52px]">
                <div className="text-xs text-gray-400">Giờ</div>
                <div className="text-sm font-medium text-gray-700">{(slot.totalLoggedHours || 0).toFixed(0)}h</div>
            </div>
        </div>
    );
}

function ResourceCard({ resource }) {
    const [expanded, setExpanded] = useState(false);
    const allocation = resource.totalAllocation || 0;
    const allocationBarColor =
        allocation > 100 ? 'bg-red-500' :
        allocation >= 80  ? 'bg-amber-500' :
        allocation >= 50  ? 'bg-gray-400' : 'bg-green-500';
    const allocationTextColor =
        allocation > 100 ? 'text-red-600' :
        allocation >= 80  ? 'text-amber-600' :
        allocation >= 50  ? 'text-gray-700' : 'text-green-600';
    const totalHours = (resource.projects || []).reduce((s, p) => s + (p.totalLoggedHours || 0), 0);

    return (
        <div className={`bg-white rounded-xl border shadow-sm transition-all ${resource.overloaded ? 'border-red-100' : 'border-gray-100'}`}>
            <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 rounded-xl" onClick={() => setExpanded(v => !v)}>
                <div className="relative flex-shrink-0">
                    {resource.avatarUrl ? (
                        <img src={resource.avatarUrl} alt={resource.fullName} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
                            {resource.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                    {resource.overloaded && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <i className="fa-solid fa-exclamation text-white" style={{ fontSize: 8 }} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{resource.fullName || resource.email}</span>
                        {resource.overloaded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10 }} /> Quá tải
                            </span>
                        )}
                        {!resource.overloaded && allocation < 50 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                <i className="fa-solid fa-circle-check" style={{ fontSize: 10 }} /> Khả dụng
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{resource.email}</div>
                </div>
                <div className="w-44 hidden sm:block">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Phân bổ tổng</span>
                        <span className={`text-sm font-semibold ${allocationTextColor}`}>{allocation}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${allocationBarColor}`} style={{ width: `${Math.min(allocation, 100)}%` }} />
                    </div>
                </div>
                <div className="hidden md:flex gap-5 text-center">
                    <div>
                        <div className="text-xs text-gray-400">Dự án</div>
                        <div className="font-medium text-gray-800">{resource.projects?.length || 0}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400">Giờ log</div>
                        <div className="font-medium text-gray-800">{totalHours.toFixed(0)}h</div>
                    </div>
                </div>
                <i className={`fa-solid fa-chevron-down text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {expanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="pt-3 space-y-2">
                        {(resource.projects || []).length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">Không có dự án nào</p>
                        ) : (
                            resource.projects.map(proj => <ProjectSlotRow key={proj.projectId} slot={proj} />)
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function MemberCard({ member, canManage }) {
    const status = STATUS_LABELS[member.memberStatus] || STATUS_LABELS.ACTIVE;
    const role = ROLE_LABELS[member.role] || ROLE_LABELS.MEMBER;
    const completionRate = member.totalIssues > 0 ? Math.round((member.completedIssues / member.totalIssues) * 100) : 0;

    return (
        <div className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.username} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow" />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                            {(member.fullName || member.username || '?')[0].toUpperCase()}
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-gray-900 leading-tight">{member.fullName || member.username}</p>
                        <p className="text-xs text-gray-500">{member.position || member.email}</p>
                    </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.color}`}>{role.label}</span>
            </div>
            <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                    {member.yearsOfExperience != null && <span className="text-gray-400">{member.yearsOfExperience} năm KN</span>}
                </div>
                {member.allocationRate != null && (
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Allocation</p>
                        <AllocationBar value={member.allocationRate} />
                    </div>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl">
                <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{member.completedIssues ?? 0}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">Hoàn thành</p>
                </div>
                <div className="text-center border-x border-gray-200">
                    <p className="text-lg font-bold text-gray-900">{member.totalIssues ?? 0}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">Tổng task</p>
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{member.totalLoggedHours != null ? Number(member.totalLoggedHours).toFixed(1) : '—'}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">Giờ làm</p>
                </div>
            </div>
            {(member.totalIssues ?? 0) > 0 && (
                <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Tiến độ task</span><span>{completionRate}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                    </div>
                </div>
            )}
            {member.skillNotes && (
                <p className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-2 line-clamp-2">
                    <i className="fa-solid fa-tag mr-1 text-indigo-400" />{member.skillNotes}
                </p>
            )}
            {member.projectName && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-indigo-600 font-medium">
                        <i className="fa-solid fa-folder mr-1" />{member.projectName}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── VIEW: Resource List (all projects) ───────────────────
function ResourceListView() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

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
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Tổng nhân sự" value={totalUsers} icon="fa-users" />
                <StatCard label="Quá tải (>100%)" value={overloadedCount} icon="fa-triangle-exclamation" danger={overloadedCount > 0} />
                <StatCard label="Còn khả dụng" value={availableCount} icon="fa-circle-check" success />
                <StatCard label="Phân bổ TB" value={`${avgAllocation}%`} icon="fa-chart-pie" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm kiếm nhân sự..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 bg-white" />
                    </div>
                    <div className="flex gap-2">
                        {[{ key: 'all', label: 'Tất cả' }, { key: 'overloaded', label: 'Quá tải' }, { key: 'available', label: 'Khả dụng' }].map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${filter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <i className="fa-solid fa-users-slash text-4xl text-gray-300 mb-4" />
                    <p className="font-medium text-gray-500">
                        {search ? `Không tìm thấy nhân sự phù hợp với "${search}"` : filter === 'overloaded' ? 'Không có nhân sự nào đang quá tải' : filter === 'available' ? 'Tất cả nhân sự đang được phân bổ đầy đủ' : 'Chưa có dữ liệu phân bổ nguồn lực'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(resource => <ResourceCard key={resource.userId} resource={resource} />)}
                </div>
            )}
        </div>
    );
}

// ─── VIEW: Team (per project) ──────────────────────────────
function TeamView() {
    const { hasPermission } = useAccessControl();
    const canManage = hasPermission('PROJECT.MANAGE_ALL');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const { data: myProjects = [] } = useQuery({
        queryKey: ['resource-team-projects'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
    });

    const { data: membersData = [], isLoading } = useQuery({
        queryKey: ['resource-team-members', myProjects],
        queryFn: async () => {
            const projId = myProjects[0]?.projectId || myProjects[0]?.id;
            if (!projId) return [];
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(projId));
            return (res.data || []).map(m => ({ ...m, projectId: projId, projectName: myProjects.find(p => (p.projectId || p.id) === projId)?.name }));
        },
        enabled: myProjects.length > 0,
    });

    const filtered = useMemo(() => {
        return (membersData || []).filter(m => {
            const matchSearch = !search ||
                (m.fullName || m.username || '').toLowerCase().includes(search.toLowerCase()) ||
                (m.email || '').toLowerCase().includes(search.toLowerCase());
            const matchRole = roleFilter === 'all' || m.role === roleFilter;
            return matchSearch && matchRole;
        });
    }, [membersData, search, roleFilter]);

    const stats = useMemo(() => {
        const members = membersData || [];
        return {
            total: members.length,
            overloaded: members.filter(m => (m.allocationRate || 0) > 100).length,
            active: members.filter(m => m.memberStatus === 'ACTIVE').length,
        };
    }, [membersData]);

    const displayProjectId = myProjects[0]?.projectId || myProjects[0]?.id;

    return (
        <div className="space-y-4">
            {/* Stats */}
            {displayProjectId && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        <p className="text-xs text-gray-500 mt-1">Thành viên</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                        <p className="text-xs text-gray-500 mt-1">Đang hoạt động</p>
                    </div>
                    <div className={`rounded-xl border p-4 shadow-sm text-center ${stats.overloaded > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                        <p className={`text-2xl font-bold ${stats.overloaded > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.overloaded}</p>
                        <p className="text-xs text-gray-500 mt-1">Quá tải (&gt;100%)</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-purple-600">{stats.total > 0 ? Math.round(stats.active / stats.total * 100) : 0}%</p>
                        <p className="text-xs text-gray-500 mt-1">Tỷ lệ hoạt động</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            {displayProjectId && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Tìm kiếm thành viên..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 bg-white" />
                        </div>
                        <div className="flex gap-2">
                            {[{ key: 'all', label: 'Tất cả' }, { key: 'OWNER', label: 'Chủ dự án' }, { key: 'MANAGER', label: 'Quản lý' }, { key: 'MEMBER', label: 'Thành viên' }].map(f => (
                                <button key={f.key} onClick={() => setRoleFilter(f.key)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${roleFilter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Grid */}
            {!displayProjectId ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <i className="fa-solid fa-users text-4xl text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Chưa chọn dự án</h3>
                    <p className="text-gray-500 text-sm">Vui lòng chọn một dự án để xem thành viên.</p>
                </div>
            ) : isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <i className="fa-solid fa-users-slash text-4xl text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Không tìm thấy thành viên</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(m => <MemberCard key={m.id || m.userId} member={m} canManage={canManage} />)}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────
export default function ResourcePlanningPage() {
    const [view, setView] = useState('resource'); // 'resource' | 'team'

    return (
        <div className="max-w-full mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-users-gear text-gray-400 text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Nguồn lực</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {view === 'resource' ? 'Tổng quan phân bổ nhân sự trên tất cả dự án' : 'Quản lý thành viên theo dự án'}
                        </p>
                    </div>
                </div>
                <div className="inline-flex rounded-xl bg-gray-100 p-1">
                    <button
                        onClick={() => setView('resource')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === 'resource' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fa-solid fa-list text-xs" />Tổng quan
                    </button>
                    <button
                        onClick={() => setView('team')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === 'team' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <i className="fa-solid fa-users text-xs" />Theo dự án
                    </button>
                </div>
            </div>

            {view === 'resource' ? <ResourceListView /> : <TeamView />}
        </div>
    );
}
