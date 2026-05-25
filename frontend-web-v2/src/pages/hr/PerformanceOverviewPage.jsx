import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

export default function PerformanceOverviewPage() {
    const [period, setPeriod] = useState('all');
    const { data: projects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['projects-for-performance-overview'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.LIST);
            if (Array.isArray(res.data)) return res.data;
            if (Array.isArray(res.data?.content)) return res.data.content;
            return [];
        }
    });

    const filteredProjects = useMemo(() => {
        if (period === 'all') return projects;
        const monthsBack = Number(period);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - monthsBack);
        return projects.filter((p) => {
            const dateRaw = p.updatedAt || p.createdAt || p.startDate || p.endDate;
            if (!dateRaw) return true;
            const d = new Date(dateRaw);
            return !Number.isNaN(d.getTime()) && d >= cutoff;
        });
    }, [projects, period]);

    const {
        data: rankingsByProject = [],
        isLoading: loadingRankings
    } = useQuery({
        queryKey: ['performance-overview-rankings', filteredProjects.map(p => p.projectId || p.id).join(','), period],
        enabled: filteredProjects.length > 0,
        queryFn: async () => {
            const calls = filteredProjects.map(async (p) => {
                const projectId = p.projectId || p.id;
                try {
                    const res = await apiClient.get(`/api/hr/performance-comparison/projects/${projectId}`);
                    return { projectId, projectName: p.name || `Project ${projectId}`, rankings: res.data || [] };
                } catch {
                    return { projectId, projectName: p.name || `Project ${projectId}`, rankings: [] };
                }
            });
            return Promise.all(calls);
        }
    });

    const { leaderboard, chartData, summary } = useMemo(() => {
        const map = new Map();
        let projectCount = 0;

        for (const project of rankingsByProject) {
            if ((project.rankings || []).length > 0) projectCount += 1;
            for (const r of (project.rankings || [])) {
                const key = r.userId || r.employeeId;
                if (!key) continue;
                if (!map.has(key)) {
                    map.set(key, {
                        userId: r.userId,
                        employeeId: r.employeeId,
                        employeeName: r.employeeName,
                        employeeAvatar: r.employeeAvatar,
                        projects: 0,
                        totalPerformanceScore: 0,
                        speedScore: 0,
                        volumeScore: 0,
                        qualityScore: 0,
                        completedTasks: 0,
                        overdueTasks: 0,
                        lateTasks: 0,
                        reworks: 0,
                        points: 0,
                    });
                }
                const current = map.get(key);
                current.projects += 1;
                current.totalPerformanceScore += Number(r.totalPerformanceScore || 0);
                current.speedScore += Number(r.speedScore || 0);
                current.volumeScore += Number(r.volumeScore || 0);
                current.qualityScore += Number(r.qualityScore || 0);
                current.completedTasks += Number(r.completedTasks || 0);
                current.overdueTasks += Number(r.overdueTasks || 0);
                current.lateTasks += Number(r.lateTasks || 0);
                current.reworks += Number(r.reworks || 0);
                current.points += Number(r.totalStoryPoints || 0);
            }
        }

        const leaderboard = Array.from(map.values()).map((item) => {
            const divider = Math.max(item.projects, 1);
            return {
                ...item,
                avgPerformance: Number((item.totalPerformanceScore / divider).toFixed(1)),
                avgSpeed: Number((item.speedScore / divider).toFixed(1)),
                avgVolume: Number((item.volumeScore / divider).toFixed(1)),
                avgQuality: Number((item.qualityScore / divider).toFixed(1)),
            };
        }).sort((a, b) => b.avgPerformance - a.avgPerformance);

        const chartData = leaderboard.slice(0, 8).map((u) => ({
            name: u.employeeName,
            'Hiệu suất TB': u.avgPerformance,
            'Tốc độ TB': u.avgSpeed,
            'Chất lượng TB': u.avgQuality,
        }));

        const summary = {
            employees: leaderboard.length,
            projects: projectCount,
            completedTasks: leaderboard.reduce((s, i) => s + i.completedTasks, 0),
            overdueTasks: leaderboard.reduce((s, i) => s + i.overdueTasks, 0),
            reworks: leaderboard.reduce((s, i) => s + i.reworks, 0),
            avgPerformance: leaderboard.length > 0
                ? (leaderboard.reduce((s, i) => s + i.avgPerformance, 0) / leaderboard.length).toFixed(1)
                : '0.0',
        };

        return { leaderboard, chartData, summary };
    }, [rankingsByProject]);

    if (loadingProjects || loadingRankings) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-chart-line text-gray-400 text-xl" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Hiệu suất tổng thể</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Tổng hợp hiệu suất nhân sự xuyên các dự án</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium">Chu kỳ:</span>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-gray-300"
                        >
                            <option value="all">Toàn thời gian</option>
                            <option value="24">24 tháng gần nhất</option>
                            <option value="12">12 tháng gần nhất</option>
                            <option value="6">6 tháng gần nhất</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                <MiniStat title="Nhân sự" value={summary.employees} />
                <MiniStat title="Dự án" value={summary.projects} />
                <MiniStat title="Hoàn thành" value={summary.completedTasks} success />
                <MiniStat title="Quá hạn" value={summary.overdueTasks} danger />
                <MiniStat title="Rework" value={summary.reworks} warning />
                <MiniStat title="Điểm TB" value={summary.avgPerformance} />
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-1">So sánh hiệu suất nhân sự</h3>
                <p className="text-xs text-gray-500 mb-4">Hiệu suất, tốc độ và chất lượng trung bình</p>
                <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" fontSize={11} tick={{ fill: '#6b7280', fontWeight: 500 }} />
                            <YAxis domain={[0, 10]} fontSize={11} tick={{ fill: '#6b7280', fontWeight: 500 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Hiệu suất TB" fill="#2563EB" radius={0} />
                            <Bar dataKey="Tốc độ TB" fill="#059669" radius={0} />
                            <Bar dataKey="Chất lượng TB" fill="#D97706" radius={0} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Bảng so sánh nhân sự</h3>
                    <p className="text-xs text-gray-500">Thống kê toàn thời gian theo dữ liệu hiệu suất dự án</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-left">Nhân sự</th>
                                <th className="px-4 py-3 text-center">Dự án</th>
                                <th className="px-4 py-3 text-center">Hiệu suất TB</th>
                                <th className="px-4 py-3 text-center">Tốc độ TB</th>
                                <th className="px-4 py-3 text-center">Chất lượng TB</th>
                                <th className="px-4 py-3 text-center">Hoàn thành</th>
                                <th className="px-4 py-3 text-center">Quá hạn</th>
                                <th className="px-4 py-3 text-center">Rework</th>
                                <th className="px-4 py-3 text-center">SLA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leaderboard.map((u) => (
                                <tr key={u.userId || u.employeeId} className="hover:bg-gray-50/70">
                                    <td className="px-4 py-3 font-medium text-gray-900">{u.employeeName}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{u.projects}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{u.avgPerformance}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{u.avgSpeed}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{u.avgQuality}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{u.completedTasks}</td>
                                    <td className="px-4 py-3 text-center text-red-600">{u.overdueTasks}</td>
                                    <td className="px-4 py-3 text-center text-amber-600">{u.reworks}</td>
                                    <td className="px-4 py-3 text-center">
                                        <SlaBadge overdue={u.overdueTasks} late={u.lateTasks} reworks={u.reworks} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SlaBadge({ overdue = 0, late = 0, reworks = 0 }) {
    if (overdue >= 3 || late >= 3 || reworks >= 5) {
        return <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700">Cao</span>;
    }
    if (overdue > 0 || late > 0 || reworks >= 2) {
        return <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">Trung bình</span>;
    }
    return <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">Ổn định</span>;
}

function MiniStat({ title, value, danger, success, warning }) {
    return (
        <div className={`rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow ${danger ? 'bg-red-50' : success ? 'bg-green-50' : warning ? 'bg-amber-50' : 'bg-white'}`}>
            <p className="text-[10px] uppercase tracking-wider font-medium text-gray-500">{title}</p>
            <p className={`text-xl font-semibold leading-tight mt-1 ${danger ? 'text-red-600' : success ? 'text-green-600' : warning ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
        </div>
    );
}
