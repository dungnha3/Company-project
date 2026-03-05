import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';
import { useToast } from '@app/providers/ToastProvider';

export default function ResourcePlanningPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState('timeline');
    const [showAllocationModal, setShowAllocationModal] = useState(false);

    // Fetch employees
    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees-resources'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST)).data,
    });

    // Fetch Allocations (Real Data)
    const { data: allocations = [] } = useQuery({
        queryKey: ['resource-allocations'],
        queryFn: async () => {
            try {
                return (await apiClient.get(ENDPOINTS.RESOURCE_PLANNING.ALLOCATIONS)).data;
            } catch (e) {
                return [];
            }
        }
    });

    const empList = Array.isArray(employees) ? employees : employees?.content || [];

    // Generate week headers
    const weeks = useMemo(() => {
        const result = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of current week

        for (let i = 0; i < 12; i++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(weekStart.getDate() + (i * 7));
            result.push({
                label: `W${i + 1}`,
                date: formatDate(weekStart, { day: '2-digit', month: '2-digit' }),
                fullDate: weekStart,
            });
        }
        return result;
    }, []);

    // Calculate workload for an employee in a given week
    const getWorkload = (empId, weekIndex) => {
        const weekDate = weeks[weekIndex]?.fullDate;
        if (!weekDate || !allocations.length) return 0;

        return allocations
            .filter(a => {
                if ((a.employeeId || a.employee?.id) !== empId) return false;
                const start = new Date(a.startDate);
                const end = new Date(a.endDate);
                return weekDate >= start && weekDate <= end;
            })
            .reduce((sum, a) => sum + (a.allocation || 0), 0);
    };

    // Calculate stats
    const stats = useMemo(() => {
        if (!empList.length) return { total: 0, overloaded: 0, underutilized: 0, optimal: 0 };

        const overloaded = empList.filter(emp => {
            const id = emp.employeeId || emp.id;
            return weeks.some((_, i) => getWorkload(id, i) > 100);
        }).length;

        const underutilized = empList.filter(emp => {
            const id = emp.employeeId || emp.id;
            const avgLoad = weeks.reduce((sum, _, i) => sum + getWorkload(id, i), 0) / weeks.length;
            return avgLoad < 50;
        }).length;

        return {
            total: empList.length,
            overloaded,
            underutilized,
            optimal: empList.length - overloaded - underutilized,
        };
    }, [empList, weeks, allocations]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý nguồn lực</h1>
                    <p className="text-gray-500 text-sm">Phân bổ và theo dõi khối lượng công việc đội nhóm</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            <i className="fa-solid fa-timeline mr-1" /> Timeline
                        </button>
                        <button
                            onClick={() => setViewMode('heatmap')}
                            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'heatmap' ? 'bg-white shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            <i className="fa-solid fa-fire mr-1" /> Heatmap
                        </button>
                    </div>
                    <button onClick={() => setShowAllocationModal(true)} className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" /> Phân bổ mới
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Tổng nhân sự" value={stats.total} icon="fa-users" color="bg-indigo-500" />
                <StatCard label="Tối ưu (70-100%)" value={stats.optimal} icon="fa-check-circle" color="bg-green-500" />
                <StatCard label="Quá tải (>100%)" value={stats.overloaded} icon="fa-exclamation-triangle" color="bg-red-500" />
                <StatCard label="Chưa đủ việc (<50%)" value={stats.underutilized} icon="fa-hourglass-half" color="bg-yellow-500" />
            </div>

            {/* Timeline/Heatmap View */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">
                                    Nhân viên
                                </th>
                                {weeks.map((week, i) => (
                                    <th key={i} className="px-2 py-3 text-center font-medium text-gray-600 min-w-[60px]">
                                        <div className="text-xs">{week.label}</div>
                                        <div className="text-[10px] text-gray-400">{week.date}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loadingEmployees ? (
                                <tr>
                                    <td colSpan={weeks.length + 1} className="px-4 py-8 text-center">
                                        <div className="loading-spinner mx-auto" />
                                    </td>
                                </tr>
                            ) : empList.length === 0 ? (
                                <tr>
                                    <td colSpan={weeks.length + 1} className="px-4 py-8 text-center text-gray-400">
                                        Không có dữ liệu
                                    </td>
                                </tr>
                            ) : (
                                empList.slice(0, 10).map(emp => (
                                    <tr key={emp.employeeId || emp.id} className="hover:bg-gray-50/50">
                                        <td className="sticky left-0 z-10 bg-white px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                    {(emp.fullName || 'U').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{emp.fullName}</div>
                                                    <div className="text-xs text-gray-500">{emp.position?.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {weeks.map((_, weekIndex) => {
                                            const workload = getWorkload(emp.employeeId || emp.id, weekIndex);
                                            return (
                                                <td key={weekIndex} className="px-1 py-2">
                                                    <WorkloadCell workload={workload} viewMode={viewMode} />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm">
                <LegendItem color="bg-gray-200" label="0%" />
                <LegendItem color="bg-green-400" label="50-99%" />
                <LegendItem color="bg-indigo-500" label="100%" />
                <LegendItem color="bg-red-500" label=">100%" />
            </div>

            {showAllocationModal && (
                <AllocationModal
                    onClose={() => setShowAllocationModal(false)}
                    employees={empList}
                    showToast={showToast}
                    queryClient={queryClient}
                />
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
                    <i className={`fa-solid ${icon} text-lg`} />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

function WorkloadCell({ workload, viewMode }) {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-400';

    if (workload > 100) {
        bgColor = 'bg-red-500';
        textColor = 'text-white';
    } else if (workload >= 80) {
        bgColor = 'bg-indigo-500';
        textColor = 'text-white';
    } else if (workload >= 50) {
        bgColor = 'bg-green-400';
        textColor = 'text-white';
    } else if (workload > 0) {
        bgColor = 'bg-yellow-300';
        textColor = 'text-gray-700';
    }

    if (viewMode === 'heatmap') {
        return (
            <div
                className={`w-full h-8 rounded ${bgColor} flex items-center justify-center`}
                title={`${workload}%`}
            >
                <span className={`text-xs font-medium ${textColor}`}>{workload || '-'}</span>
            </div>
        );
    }

    // Timeline view - show as bar
    return (
        <div className="h-8 bg-gray-100 rounded overflow-hidden">
            {workload > 0 && (
                <div
                    className={`h-full ${bgColor} flex items-center justify-center`}
                    style={{ width: `${Math.min(100, workload)}%` }}
                >
                    <span className={`text-xs font-medium ${textColor}`}>{workload}%</span>
                </div>
            )}
        </div>
    );
}

function LegendItem({ color, label }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${color}`} />
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
        </div>
    );
}

function AllocationModal({ onClose, employees, showToast, queryClient }) {
    const [form, setForm] = useState({
        employeeId: '',
        projectId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        allocation: 50,
        note: '',
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projects-for-allocation'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.LIST);
            return res.data?.content || res.data || [];
        },
    });

    const createMutation = useMutation({
        mutationFn: (data) => apiClient.post(ENDPOINTS.RESOURCE_PLANNING.ALLOCATIONS, data),
        onSuccess: () => {
            showToast('Phân bổ nguồn lực thành công', 'success');
            queryClient.invalidateQueries(['resource-allocations']);
            onClose();
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lỗi phân bổ', 'error'),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.employeeId || !form.startDate || !form.endDate) {
            showToast('Vui lòng điền đầy đủ thông tin', 'error');
            return;
        }
        createMutation.mutate({
            employeeId: Number(form.employeeId),
            projectId: form.projectId ? Number(form.projectId) : null,
            startDate: form.startDate,
            endDate: form.endDate,
            allocation: Number(form.allocation),
            note: form.note,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-indigo-600">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white">Phân bổ nguồn lực mới</h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên *</label>
                        <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" required>
                            <option value="">Chọn nhân viên</option>
                            {(employees || []).map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dự án</label>
                        <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl">
                            <option value="">Không gắn dự án</option>
                            {projects.map(p => <option key={p.projectId || p.id} value={p.projectId || p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
                            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc *</label>
                            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ phân bổ ({form.allocation}%)</label>
                        <input type="range" min="0" max="100" value={form.allocation} onChange={e => setForm({ ...form, allocation: e.target.value })} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                        <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" rows={2} placeholder="Ghi chú tùy chọn..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">Hủy</button>
                        <button type="submit" disabled={createMutation.isPending} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium disabled:opacity-50">
                            {createMutation.isPending ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Đang lưu...</> : 'Tạo phân bổ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
