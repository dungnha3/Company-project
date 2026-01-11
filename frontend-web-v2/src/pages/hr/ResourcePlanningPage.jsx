import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

// Mock resource allocation data
const MOCK_ALLOCATIONS = [
    { id: 1, employeeId: 1, projectId: 1, projectName: 'Website Redesign', allocation: 80, startDate: '2024-01-01', endDate: '2024-03-31', color: 'bg-blue-500' },
    { id: 2, employeeId: 1, projectId: 2, projectName: 'Mobile App', allocation: 20, startDate: '2024-01-15', endDate: '2024-02-28', color: 'bg-purple-500' },
    { id: 3, employeeId: 2, projectId: 1, projectName: 'Website Redesign', allocation: 50, startDate: '2024-01-01', endDate: '2024-02-15', color: 'bg-blue-500' },
    { id: 4, employeeId: 2, projectId: 3, projectName: 'API Integration', allocation: 50, startDate: '2024-01-10', endDate: '2024-03-15', color: 'bg-green-500' },
    { id: 5, employeeId: 3, projectId: 2, projectName: 'Mobile App', allocation: 100, startDate: '2024-01-01', endDate: '2024-04-30', color: 'bg-purple-500' },
    { id: 6, employeeId: 4, projectId: 3, projectName: 'API Integration', allocation: 60, startDate: '2024-01-01', endDate: '2024-02-28', color: 'bg-green-500' },
    { id: 7, employeeId: 5, projectId: 1, projectName: 'Website Redesign', allocation: 40, startDate: '2024-02-01', endDate: '2024-03-31', color: 'bg-blue-500' },
];

export default function ResourcePlanningPage() {
    const [viewMode, setViewMode] = useState('timeline'); // timeline, heatmap
    const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week

    // Fetch employees
    const { data: employees, isLoading } = useQuery({
        queryKey: ['employees-resources'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST)).data,
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
                date: weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                fullDate: weekStart,
            });
        }
        return result;
    }, []);

    // Calculate workload for an employee in a given week
    const getWorkload = (empId, weekIndex) => {
        const weekDate = weeks[weekIndex]?.fullDate;
        if (!weekDate) return 0;

        return MOCK_ALLOCATIONS
            .filter(a => {
                if (a.employeeId !== empId) return false;
                const start = new Date(a.startDate);
                const end = new Date(a.endDate);
                return weekDate >= start && weekDate <= end;
            })
            .reduce((sum, a) => sum + a.allocation, 0);
    };

    // Calculate stats
    const stats = useMemo(() => {
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
    }, [empList, weeks]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý nguồn lực</h1>
                    <p className="text-gray-500 text-sm">Phân bổ và theo dõi workload team</p>
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
                    <button className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" /> Phân bổ mới
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Tổng nhân sự" value={stats.total} icon="fa-users" color="bg-blue-500" />
                <StatCard label="Tối ưu (70-100%)" value={stats.optimal} icon="fa-check-circle" color="bg-green-500" />
                <StatCard label="Quá tải (>100%)" value={stats.overloaded} icon="fa-exclamation-triangle" color="bg-red-500" />
                <StatCard label="Chưa đủ việc (<50%)" value={stats.underutilized} icon="fa-hourglass-half" color="bg-yellow-500" />
            </div>

            {/* Timeline/Heatmap View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                            {isLoading ? (
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
                <LegendItem color="bg-blue-500" label="100%" />
                <LegendItem color="bg-red-500" label=">100%" />
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
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
        bgColor = 'bg-blue-500';
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
            <span className="text-gray-600">{label}</span>
        </div>
    );
}
