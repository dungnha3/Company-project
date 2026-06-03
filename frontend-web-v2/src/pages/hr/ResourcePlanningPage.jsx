import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';

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

function UserTaskRow({ task }) {
    const statusColor = task.issueStatus?.name?.toLowerCase() === 'done' ? 'bg-green-50 text-green-700 border-green-200' :
                        task.issueStatus?.name?.toLowerCase() === 'in progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        task.issueStatus?.name?.toLowerCase() === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-600 border-gray-200';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.issueStatus?.name?.toLowerCase() !== 'done';
    
    return (
        <div className="flex flex-col p-2.5 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
            <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded shrink-0">
                    {task.issueKey}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusColor}`}>
                    {task.issueStatus?.name || 'Todo'}
                </span>
            </div>
            <h5 className="text-xs font-semibold text-gray-800 mt-2 line-clamp-1" title={task.summary}>
                {task.summary}
            </h5>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 text-[10px] text-gray-400">
                <span className="truncate max-w-[125px] font-medium text-gray-500" title={task.projectName}>
                    <i className="fa-solid fa-folder mr-1 text-gray-300" />
                    {task.projectName}
                </span>
                {task.dueDate && (
                    <span className={`flex items-center gap-1 font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                        <i className="fa-solid fa-calendar text-[9px]" />
                        {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                    </span>
                )}
            </div>
        </div>
    );
}

function UserTasksTab({ userId }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        apiClient.get(`/api/issues/user/${userId}`)
            .then(res => {
                if (isMounted) {
                    setTasks(Array.isArray(res.data) ? res.data : []);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err);
                    setLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [userId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12 bg-white rounded-xl border border-gray-100">
                <i className="fa-solid fa-spinner fa-spin text-gray-400 mr-2 animate-spin" />
                <span className="text-xs text-gray-400 font-medium">Đang tải danh sách công việc...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-white rounded-xl border border-gray-100 text-center">
                <p className="text-xs text-red-500 font-medium">Lỗi khi tải danh sách công việc. Vui lòng thử lại sau.</p>
            </div>
        );
    }

    const activeTasks = tasks.filter(t => t.issueStatus?.name?.toLowerCase() !== 'done');
    const completedTasks = tasks.filter(t => t.issueStatus?.name?.toLowerCase() === 'done');

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Công việc đang thực hiện ({activeTasks.length})
                </h4>
                {activeTasks.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-center">
                        <p className="text-xs text-gray-400 italic">Không có công việc nào đang xử lý</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeTasks.map(t => <UserTaskRow key={t.issueId} task={t} />)}
                    </div>
                )}
            </div>

            {completedTasks.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                    <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Công việc đã hoàn thành ({completedTasks.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-75">
                        {completedTasks.slice(0, 4).map(t => <UserTaskRow key={t.issueId} task={t} />)}
                        {completedTasks.length > 4 && (
                            <p className="text-[11px] text-gray-400 italic col-span-1 sm:col-span-2 pt-1">
                                ...và {completedTasks.length - 4} công việc khác đã hoàn thành.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ResourceCard({ resource }) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('projects');
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

    const allSkills = useMemo(() => {
        const skills = new Set();
        (resource.projects || []).forEach(p => {
            if (p.skillNotes) {
                p.skillNotes.split(',').forEach(s => {
                    const cleaned = s.trim();
                    if (cleaned) skills.add(cleaned);
                });
            }
        });
        return Array.from(skills);
    }, [resource.projects]);

    const taskStats = useMemo(() => {
        const projects = resource.projects || [];
        const total = projects.reduce((s, p) => s + (p.totalIssues || 0), 0);
        const completed = projects.reduce((s, p) => s + (p.completedIssues || 0), 0);
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, rate };
    }, [resource.projects]);

    return (
        <div className={`bg-white rounded-xl border shadow-sm transition-all ${resource.overloaded ? 'border-red-100 shadow-red-50/10' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 rounded-xl" onClick={() => setExpanded(v => !v)}>
                <div className="relative flex-shrink-0">
                    {resource.avatarUrl ? (
                        <img src={resource.avatarUrl} alt={resource.fullName} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm border border-gray-200">
                            {resource.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                    {resource.overloaded && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                            <i className="fa-solid fa-exclamation text-white" style={{ fontSize: 8 }} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">{resource.fullName || resource.email}</span>
                        {resource.overloaded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-100">
                                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10 }} /> Quá tải
                            </span>
                        )}
                        {!resource.overloaded && allocation >= 80 && allocation <= 100 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-100">
                                <i className="fa-solid fa-bolt" style={{ fontSize: 10 }} /> Tối ưu
                            </span>
                        )}
                        {!resource.overloaded && allocation < 80 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100">
                                <i className="fa-solid fa-circle-check" style={{ fontSize: 10 }} /> Còn trống
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{resource.email}</div>
                </div>
                <div className="w-44 hidden sm:block">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-gray-500 font-medium">Phân bổ tổng</span>
                        <span className={`text-xs font-bold ${allocationTextColor}`}>{allocation}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${allocationBarColor}`} style={{ width: `${Math.min(allocation, 100)}%` }} />
                    </div>
                </div>
                <div className="hidden md:flex gap-6 text-center">
                    <div>
                        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Dự án</div>
                        <div className="font-bold text-gray-800 mt-0.5 text-sm">{resource.projects?.length || 0}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Giờ log</div>
                        <div className="font-bold text-gray-800 mt-0.5 text-sm">{totalHours.toFixed(0)}h</div>
                    </div>
                </div>
                <i className={`fa-solid fa-chevron-down text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180 text-indigo-600' : ''}`} />
            </div>

            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/30 rounded-b-xl">
                    {/* Sub-tab navigation */}
                    <div className="flex border-b border-gray-100 px-4 bg-white">
                        {[
                            { id: 'projects', label: 'Phân bổ dự án', icon: 'fa-project-diagram' },
                            { id: 'performance', label: 'Hiệu suất & Tiến độ', icon: 'fa-chart-line' },
                            { id: 'skills', label: 'Kỹ năng & Hồ sơ', icon: 'fa-id-card' },
                            { id: 'tasks', label: 'Công việc hiện tại', icon: 'fa-tasks' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all -mb-[2px] ${
                                    activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                                }`}
                            >
                                <i className={`fa-solid ${tab.icon}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab contents */}
                    <div className="p-4">
                        {activeTab === 'projects' && (
                            <div className="space-y-3">
                                {(resource.projects || []).length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-6">Chưa tham gia dự án nào</p>
                                ) : (
                                    <div className="overflow-x-auto bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <table className="w-full text-left text-xs text-gray-500 min-w-[500px]">
                                            <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3">Dự án</th>
                                                    <th className="px-4 py-3">Vai trò / Vị trí</th>
                                                    <th className="px-4 py-3">Trạng thái</th>
                                                    <th className="px-4 py-3 text-right">Phân bổ</th>
                                                    <th className="px-4 py-3 text-right">Giờ logged</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {resource.projects.map(p => {
                                                    const statusStyles = {
                                                        ACTIVE: 'bg-green-50 text-green-700 border-green-100',
                                                        ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-100',
                                                        PART_TIME: 'bg-blue-50 text-blue-700 border-blue-100',
                                                        INACTIVE: 'bg-gray-50 text-gray-400 border-gray-100',
                                                    };
                                                    const statusLabel = {
                                                        ACTIVE: 'Đang làm', ON_LEAVE: 'Nghỉ phép',
                                                        PART_TIME: 'Bán thời gian', INACTIVE: 'Tạm ngừng',
                                                    };
                                                    const roleLabel = { OWNER: 'Chủ dự án', MANAGER: 'Quản lý', MEMBER: 'Thành viên' };
                                                    const alloc = p.allocationRate || 0;
                                                    
                                                    return (
                                                        <tr key={p.projectId} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-4 py-3 font-semibold text-gray-900">{p.projectName}</td>
                                                            <td className="px-4 py-3">
                                                                <span className="text-gray-700 font-medium">{roleLabel[p.role] || p.role}</span>
                                                                {p.position && <span className="text-gray-400 block mt-0.5">{p.position}</span>}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusStyles[p.memberStatus] || statusStyles.ACTIVE}`}>
                                                                    {statusLabel[p.memberStatus] || p.memberStatus}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <div className="w-16 bg-gray-100 h-1 rounded-full overflow-hidden hidden sm:block">
                                                                        <div className={`h-full rounded-full ${alloc > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(alloc, 100)}%` }} />
                                                                    </div>
                                                                    <span className="font-bold text-gray-900">{alloc}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{(p.totalLoggedHours || 0).toFixed(0)}h</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'performance' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Stats Card */}
                                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between col-span-1">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Tỷ lệ hoàn thành task</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">{taskStats.rate}%</p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                Đã xong {taskStats.completed} / {taskStats.total} task được giao
                                            </p>
                                        </div>
                                        {/* Simple SVG progress ring */}
                                        <div className="relative w-14 h-14">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <path
                                                    className="text-gray-100"
                                                    strokeWidth="3.5"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                                <path
                                                    className="text-indigo-600 transition-all duration-500"
                                                    strokeWidth="3.5"
                                                    strokeDasharray={`${taskStats.rate}, 100`}
                                                    strokeLinecap="round"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                                                {taskStats.rate}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Project-wise breakdown chart */}
                                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm col-span-1 md:col-span-2">
                                        <h4 className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Thống kê Task theo dự án</h4>
                                        {(resource.projects || []).length === 0 ? (
                                            <p className="text-xs text-gray-400 italic text-center py-4">Không có dự án nào</p>
                                        ) : (
                                            <div className="h-[120px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={(resource.projects || []).map(p => ({
                                                            name: p.projectName.length > 15 ? p.projectName.substring(0, 15) + '...' : p.projectName,
                                                            'Xong': p.completedIssues || 0,
                                                            'Tổng': p.totalIssues || 0,
                                                        }))}
                                                        margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                                                    >
                                                        <XAxis dataKey="name" tick={{ fontSize: 8 }} stroke="#9ca3af" />
                                                        <YAxis tick={{ fontSize: 8 }} stroke="#9ca3af" allowDecimals={false} />
                                                        <ChartTooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #f3f4f6' }} />
                                                        <Bar dataKey="Xong" fill="#10b981" radius={[2, 2, 0, 0]} />
                                                        <Bar dataKey="Tổng" fill="#6366f1" radius={[2, 2, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'skills' && (
                            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Hồ sơ cá nhân */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
                                            <i className="fa-solid fa-user text-indigo-500" />
                                            Hồ sơ cá nhân
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Giới tính:</span>
                                                <span className="font-medium text-gray-800">
                                                    {resource.gender === 'MALE' ? 'Nam' : resource.gender === 'FEMALE' ? 'Nữ' : resource.gender === 'OTHER' ? 'Khác' : '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Ngày vào công ty:</span>
                                                <span className="font-medium text-gray-800">
                                                    {resource.hireDate ? new Date(resource.hireDate).toLocaleDateString('vi-VN') : '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between flex-wrap gap-1">
                                                <span className="text-gray-400">Số dư phép năm:</span>
                                                <span className="font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-[10px]">
                                                    {resource.leaveBalance ?? 0} ngày
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start gap-4">
                                                <span className="text-gray-400 shrink-0">Địa chỉ:</span>
                                                <span className="font-medium text-gray-800 text-right break-words max-w-[200px]" title={resource.address}>
                                                    {resource.address || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hồ sơ năng lực */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
                                            <i className="fa-solid fa-graduation-cap text-indigo-500" />
                                            Năng lực & Chi phí
                                        </h4>
                                        <div className="space-y-3.5">
                                            <div>
                                                <span className="text-xs text-gray-400 block mb-1.5">Kỹ năng chuyên môn:</span>
                                                {allSkills.length === 0 ? (
                                                    <span className="text-xs text-gray-400 italic">Chưa ghi nhận kỹ năng</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {allSkills.map(skill => (
                                                            <span key={skill} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-semibold border border-indigo-100">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 text-xs">
                                                <div>
                                                    <span className="text-gray-400 block mb-0.5">Kinh nghiệm dự án:</span>
                                                    <span className="font-bold text-gray-800">
                                                        {Math.max(0, ...(resource.projects || []).map(p => p.yearsOfExperience || 0))} năm
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 block mb-0.5">Chi phí TB/Giờ:</span>
                                                    <span className="font-bold text-gray-800">
                                                        {(() => {
                                                            const rates = (resource.projects || []).map(p => p.billingRate).filter(Boolean);
                                                            if (rates.length === 0) return '—';
                                                            const avg = Math.round(rates.reduce((s, r) => s + Number(r), 0) / rates.length);
                                                            return avg.toLocaleString('vi-VN') + ' VNĐ';
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <UserTasksTab userId={resource.userId} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function EditMemberModal({ member, projectId, onClose, canManage }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        position: member.position || '',
        allocationRate: member.allocationRate ?? 100,
        memberStatus: member.memberStatus || 'ACTIVE',
        yearsOfExperience: member.yearsOfExperience ?? '',
        billingRate: member.billingRate ?? '',
        skillNotes: member.skillNotes || '',
        joinDate: member.joinDate || '',
        leaveDate: member.leaveDate || '',
    });

    const updateMutation = useMutation({
        mutationFn: (data) =>
            apiClient.patch(ENDPOINTS.PROJECTS.UPDATE_MEMBER_INFO(projectId, member.userId), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resource-team-members', projectId] });
            onClose();
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            allocationRate: form.allocationRate ? Number(form.allocationRate) : null,
            yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
            billingRate: form.billingRate ? Number(form.billingRate) : null,
            joinDate: form.joinDate || null,
            leaveDate: form.leaveDate || null,
        };
        updateMutation.mutate(payload);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.username} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                {(member.fullName || member.username || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-gray-900">{member.fullName || member.username}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-xmark text-lg" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                placeholder="Frontend Dev, BA, QC..."
                                value={form.position}
                                onChange={(e) => setForm({ ...form, position: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                value={form.memberStatus}
                                onChange={(e) => setForm({ ...form, memberStatus: e.target.value })}
                            >
                                <option value="ACTIVE">Đang làm</option>
                                <option value="INACTIVE">Tạm ngừng</option>
                                <option value="PENDING">Chờ xác nhận</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Allocation (%)
                            </label>
                            <input
                                type="number" min="0" max="100"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                value={form.allocationRate}
                                onChange={(e) => setForm({ ...form, allocationRate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Năm KN</label>
                            <input
                                type="number" min="0"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                value={form.yearsOfExperience}
                                onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày vào dự án</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                value={form.joinDate}
                                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Billing rate (VNĐ/h)</label>
                            <input
                                type="number" min="0"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                placeholder="0"
                                value={form.billingRate}
                                onChange={(e) => setForm({ ...form, billingRate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú kỹ năng</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white resize-none"
                            rows={3}
                            placeholder="React, TypeScript, CI/CD..."
                            value={form.skillNotes}
                            onChange={(e) => setForm({ ...form, skillNotes: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors flex-1">
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={!canManage || updateMutation.isPending}
                            className={`btn-primary flex-1 ${!canManage ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {updateMutation.isPending ? (
                                <><i className="fa-solid fa-spinner fa-spin mr-2" />Đang lưu...</>
                            ) : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function MemberCard({ member, projectId, canManage }) {
    const [editing, setEditing] = useState(false);
    const status = STATUS_LABELS[member.memberStatus] || STATUS_LABELS.ACTIVE;
    const role = ROLE_LABELS[member.role] || ROLE_LABELS.MEMBER;
    const completionRate = member.totalIssues > 0 ? Math.round((member.completedIssues / member.totalIssues) * 100) : 0;

    return (
        <>
            <div className="card p-5 hover:shadow-md transition-shadow group">
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
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.color}`}>{role.label}</span>
                        {canManage && (
                            <button
                                onClick={() => setEditing(true)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600"
                                title="Chỉnh sửa thông tin"
                            >
                                <i className="fa-solid fa-pen-to-square text-sm" />
                            </button>
                        )}
                    </div>
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
            {editing && (
                <EditMemberModal
                    member={member}
                    projectId={projectId}
                    onClose={() => setEditing(false)}
                    canManage={canManage}
                />
            )}
        </>
    );
}

// ─── VIEW: Resource List (all projects) ───────────────────
function ResourceListView() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('allocation_desc');

    const { data: resources = [], isLoading } = useQuery({
        queryKey: ['resource-overview'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.RESOURCE_OVERVIEW);
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 30_000,
    });

    const filtered = useMemo(() => {
        return resources.filter(r => {
            const matchSearch = !search ||
                r.fullName?.toLowerCase().includes(search.toLowerCase()) ||
                r.email?.toLowerCase().includes(search.toLowerCase()) ||
                r.projects?.some(p => p.skillNotes?.toLowerCase().includes(search.toLowerCase()));
            const matchFilter =
                filter === 'all' ||
                (filter === 'overloaded' && r.overloaded) ||
                (filter === 'optimal' && !r.overloaded && r.totalAllocation >= 80 && r.totalAllocation <= 100) ||
                (filter === 'available' && !r.overloaded && (r.totalAllocation || 0) < 80);
            return matchSearch && matchFilter;
        });
    }, [resources, search, filter]);

    const sorted = useMemo(() => {
        const list = [...filtered];
        list.sort((a, b) => {
            if (sortBy === 'allocation_desc') {
                return (b.totalAllocation || 0) - (a.totalAllocation || 0);
            }
            if (sortBy === 'allocation_asc') {
                return (a.totalAllocation || 0) - (b.totalAllocation || 0);
            }
            if (sortBy === 'hours_desc') {
                const aHours = (a.projects || []).reduce((sum, p) => sum + (p.totalLoggedHours || 0), 0);
                const bHours = (b.projects || []).reduce((sum, p) => sum + (p.totalLoggedHours || 0), 0);
                return bHours - aHours;
            }
            if (sortBy === 'hours_asc') {
                const aHours = (a.projects || []).reduce((sum, p) => sum + (p.totalLoggedHours || 0), 0);
                const bHours = (b.projects || []).reduce((sum, p) => sum + (p.totalLoggedHours || 0), 0);
                return aHours - bHours;
            }
            if (sortBy === 'name_asc') {
                return (a.fullName || '').localeCompare(b.fullName || '');
            }
            return 0;
        });
        return list;
    }, [filtered, sortBy]);

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
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm theo tên, email hoặc kỹ năng (React, Java...)..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-300 bg-white" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { key: 'all', label: 'Tất cả' },
                                { key: 'overloaded', label: 'Quá tải (>100%)' },
                                { key: 'optimal', label: 'Tối ưu (80-100%)' },
                                { key: 'available', label: 'Còn trống (<80%)' }
                            ].map(f => (
                                <button key={f.key} onClick={() => setFilter(f.key)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f.key ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 min-w-[180px] ml-auto">
                            <span className="text-[11px] text-gray-400 font-bold uppercase shrink-0">Sắp xếp:</span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                                <option value="allocation_desc">Phân bổ (Cao → Thấp)</option>
                                <option value="allocation_asc">Phân bổ (Thấp → Cao)</option>
                                <option value="hours_desc">Giờ làm (Cao → Thấp)</option>
                                <option value="hours_asc">Giờ làm (Thấp → Cao)</option>
                                <option value="name_asc">Tên nhân sự (A-Z)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400" />
                </div>
            ) : sorted.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <i className="fa-solid fa-users-slash text-4xl text-gray-300 mb-4" />
                    <p className="font-medium text-gray-500 text-sm">
                        {search ? `Không tìm thấy nhân sự phù hợp với "${search}"` : filter === 'overloaded' ? 'Không có nhân sự nào đang quá tải' : filter === 'available' ? 'Không có nhân sự nào trống việc' : filter === 'optimal' ? 'Không có nhân sự nào đạt tỉ lệ tối ưu' : 'Chưa có dữ liệu phân bổ nguồn lực'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map(resource => <ResourceCard key={resource.userId} resource={resource} />)}
                </div>
            )}
        </div>
    );
}

function TeamView() {
    const { hasPermission } = useAccessControl();
    const canManage = hasPermission('PROJECT.MANAGE_ALL');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const { data: myProjects = [] } = useQuery({
        queryKey: ['resource-team-projects'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
    });

    useEffect(() => {
        if (!selectedProjectId && myProjects.length > 0) {
            setSelectedProjectId(myProjects[0].projectId || myProjects[0].id);
        }
    }, [myProjects, selectedProjectId]);

    const displayProjectId = selectedProjectId || (myProjects[0]?.projectId || myProjects[0]?.id);

    const { data: membersData = [], isLoading } = useQuery({
        queryKey: ['resource-team-members', displayProjectId],
        queryFn: async () => {
            if (!displayProjectId) return [];
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(displayProjectId));
            return (res.data || []).map(m => ({ ...m, projectId: displayProjectId, projectName: myProjects.find(p => (p.projectId || p.id) === displayProjectId)?.name }));
        },
        enabled: !!displayProjectId,
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

            {/* Selector & Filters */}
            {displayProjectId && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700">Dự án:</span>
                            <select
                                value={displayProjectId || ''}
                                onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full sm:w-64 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                            >
                                {myProjects.map(p => (
                                    <option key={p.projectId || p.id} value={p.projectId || p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

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
                    {filtered.map(m => <MemberCard key={m.id || m.userId} member={m} projectId={displayProjectId} canManage={canManage} />)}
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
