import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import {
    PieChart, Pie, BarChart, Bar, LineChart, Line, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Treemap, Rectangle
} from '@shared/components/LazyCharts';
import { formatDate } from '@shared/utils/formatters';

// ─── Color Palette ───
const PRIORITY_COLORS = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
};
const STATUS_COLORS_MAP = {
    'To Do': '#94a3b8',
    'In Progress': '#6366f1',
    'Review': '#a855f7',
    'Done': '#22c55e',
};
const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const DISCIPLINE_COLORS = { early: '#22c55e', onTime: '#6366f1', late: '#ef4444' };

// ─── Priority weight ───
const PRIORITY_WEIGHT = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

// ─── Custom Treemap Cell ───
const TreemapCell = (props) => {
    const { x, y, width, height, name, value, depth } = props;
    if (width < 4 || height < 4) return null;
    const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff'];
    const idx = Math.min(Math.floor(value * 1.2), colors.length - 1);
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} rx={4}
                fill={colors[idx]} stroke="#fff" strokeWidth={2} />
            {width > 50 && height > 30 && (
                <>
                    <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle"
                        fill="#fff" fontSize={12} fontWeight="bold">
                        {name?.length > 12 ? name.substring(0, 12) + '…' : name}
                    </text>
                    <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle"
                        fill="rgba(255,255,255,0.8)" fontSize={11}>
                        {value?.toFixed(1)}
                    </text>
                </>
            )}
        </g>
    );
};

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('work');

    // ── Fetch all projects ──
    const { data: projectsRaw = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['reports-projects'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS)).data,
    });
    const projects = Array.isArray(projectsRaw) ? projectsRaw : (projectsRaw?.content || []);

    // ── Fetch issues per project ──
    const { data: allIssues = [], isLoading: loadingIssues } = useQuery({
        queryKey: ['reports-all-issues', projects.map(p => p.projectId).join(',')],
        queryFn: async () => {
            const results = await Promise.all(
                projects.map(p =>
                    apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(p.projectId))
                        .then(r => {
                            const issues = r.data?.content || r.data || [];
                            return issues.map(i => ({ ...i, projectName: p.name, projectId: p.projectId }));
                        })
                        .catch(() => [])
                )
            );
            return results.flat();
        },
        enabled: projects.length > 0,
    });

    const isLoading = loadingProjects || loadingIssues;

    // ══════════ COMPUTED DATA ══════════

    // --- Overall KPI ---
    const kpi = useMemo(() => {
        const total = allIssues.length;
        const done = allIssues.filter(i => i.statusName === 'Done').length;
        const withDue = allIssues.filter(i => i.dueDate);
        const overdue = withDue.filter(i => new Date(i.dueDate) < new Date() && i.statusName !== 'Done').length;
        const doneWithDue = allIssues.filter(i => i.statusName === 'Done' && i.dueDate);
        const onTimeDone = doneWithDue.filter(i => {
            const updated = i.updatedAt ? new Date(i.updatedAt) : new Date();
            return updated <= new Date(new Date(i.dueDate).setHours(23, 59, 59));
        }).length;
        const onTimeRate = doneWithDue.length > 0 ? Math.round((onTimeDone / doneWithDue.length) * 100) : 0;
        return { total, done, overdue, onTimeRate, inProgress: allIssues.filter(i => i.statusName === 'In Progress').length };
    }, [allIssues]);

    // --- Priority distribution (Pie) ---
    const priorityDist = useMemo(() => {
        const map = {};
        allIssues.forEach(i => {
            const p = i.priority || 'LOW';
            map[p] = (map[p] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [allIssues]);

    // --- Status distribution (Pie) ---
    const statusDist = useMemo(() => {
        const map = {};
        allIssues.forEach(i => {
            const s = i.statusName || 'Unknown';
            map[s] = (map[s] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [allIssues]);

    // --- Discipline per project (Bar) ---
    const disciplineByProject = useMemo(() => {
        const map = {};
        allIssues.filter(i => i.dueDate && i.statusName === 'Done').forEach(i => {
            const pName = i.projectName || 'N/A';
            if (!map[pName]) map[pName] = { name: pName, early: 0, onTime: 0, late: 0 };
            const due = new Date(new Date(i.dueDate).setHours(23, 59, 59));
            const completed = i.updatedAt ? new Date(i.updatedAt) : new Date();
            const diffDays = (due - completed) / (1000 * 60 * 60 * 24);
            if (diffDays > 1) map[pName].early++;
            else if (diffDays >= 0) map[pName].onTime++;
            else map[pName].late++;
        });
        return Object.values(map).sort((a, b) => (b.early + b.onTime + b.late) - (a.early + a.onTime + a.late)).slice(0, 8);
    }, [allIssues]);

    // --- Top 10 projects by issue count ---
    const top10Projects = useMemo(() => {
        const map = {};
        allIssues.forEach(i => {
            const pName = i.projectName || 'N/A';
            if (!map[pName]) map[pName] = { name: pName, total: 0, done: 0 };
            map[pName].total++;
            if (i.statusName === 'Done') map[pName].done++;
        });
        return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
    }, [allIssues]);

    // --- Assignment trend by month (Line) ---
    const monthlyTrend = useMemo(() => {
        const map = {};
        allIssues.forEach(i => {
            const d = i.createdAt ? new Date(i.createdAt) : null;
            if (!d) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!map[key]) map[key] = { month: key, created: 0, completed: 0 };
            map[key].created++;
        });
        allIssues.filter(i => i.statusName === 'Done').forEach(i => {
            const d = i.updatedAt ? new Date(i.updatedAt) : null;
            if (!d) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!map[key]) map[key] = { month: key, created: 0, completed: 0 };
            map[key].completed++;
        });
        return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
    }, [allIssues]);

    // ── HR Data ──

    // --- Per-employee stats ---
    const employeeStats = useMemo(() => {
        const map = {};
        allIssues.forEach(i => {
            const name = i.assigneeName || 'Chưa giao';
            const id = i.assigneeId || 'unassigned';
            if (!map[id]) map[id] = { id, name, total: 0, done: 0, onTime: 0, late: 0, prioritySum: 0 };
            map[id].total++;
            map[id].prioritySum += PRIORITY_WEIGHT[i.priority] || 1;
            if (i.statusName === 'Done') {
                map[id].done++;
                if (i.dueDate) {
                    const due = new Date(new Date(i.dueDate).setHours(23, 59, 59));
                    const completed = i.updatedAt ? new Date(i.updatedAt) : new Date();
                    if (completed <= due) map[id].onTime++;
                    else map[id].late++;
                }
            } else if (i.dueDate && new Date(i.dueDate) < new Date()) {
                map[id].late++;
            }
        });
        return Object.values(map)
            .filter(e => e.id !== 'unassigned')
            .map(e => ({
                ...e,
                onTimeRate: e.done > 0 ? Math.round(((e.onTime) / e.done) * 100) : 0,
                avgWeight: e.total > 0 ? +(e.prioritySum / e.total).toFixed(2) : 0,
            }))
            .sort((a, b) => b.total - a.total);
    }, [allIssues]);

    // --- Treemap data ---
    const treemapData = useMemo(() => {
        return employeeStats.filter(e => e.avgWeight > 0).map(e => ({
            name: e.name,
            size: e.total,
            value: e.avgWeight,
        }));
    }, [employeeStats]);

    // --- Discipline ranking (Bar) ---
    const disciplineRanking = useMemo(() => {
        return employeeStats
            .map(e => ({
                name: e.name.length > 10 ? e.name.substring(0, 10) + '…' : e.name,
                fullName: e.name,
                early: e.onTime,
                late: e.late,
                score: e.done > 0 ? Math.round((e.onTime / e.done) * 100) : 0
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }, [employeeStats]);

    // ══════════ RENDER ══════════

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-12 h-12 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="text-gray-500">Đang tải dữ liệu báo cáo...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                        <i className="fa-solid fa-chart-pie text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Báo cáo tổng hợp</h1>
                        <p className="text-gray-500 text-sm">{projects.length} dự án · {allIssues.length} công việc</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 inline-flex gap-1">
                {[
                    { id: 'work', label: 'Báo cáo Công việc', icon: 'fa-list-check' },
                    { id: 'hr', label: 'Báo cáo Nhân sự', icon: 'fa-users' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <i className={`fa-solid ${tab.icon} text-xs`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════ TAB: WORK REPORT ═══════ */}
            {activeTab === 'work' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Tổng công việc', value: kpi.total, icon: 'fa-list', color: 'from-blue-500 to-indigo-600', bgLight: 'bg-blue-50' },
                            { label: 'Hoàn thành', value: kpi.done, icon: 'fa-check-circle', color: 'from-emerald-500 to-green-600', bgLight: 'bg-emerald-50' },
                            { label: 'Đúng hạn', value: `${kpi.onTimeRate}%`, icon: 'fa-clock', color: 'from-violet-500 to-purple-600', bgLight: 'bg-violet-50' },
                            { label: 'Quá hạn', value: kpi.overdue, icon: 'fa-exclamation-triangle', color: 'from-red-500 to-rose-600', bgLight: 'bg-red-50' },
                        ].map((card, idx) => (
                            <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md`}>
                                        <i className={`fa-solid ${card.icon} text-sm`} />
                                    </div>
                                </div>
                                <p className="text-3xl font-extrabold text-gray-900">{card.value}</p>
                                <p className="text-xs text-gray-500 mt-1 font-medium">{card.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Priority Pie */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <i className="fa-solid fa-signal text-indigo-500" />
                                Phân bố theo mức độ ưu tiên
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Tỷ lệ công việc theo cấp độ</p>
                            {priorityDist.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={priorityDist}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {priorityDist.map((entry) => (
                                                <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyState />}
                        </div>

                        {/* Status Pie */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <i className="fa-solid fa-chart-pie text-purple-500" />
                                Phân bố theo trạng thái
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Tỷ lệ công việc theo trạng thái</p>
                            {statusDist.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={statusDist}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {statusDist.map((entry) => (
                                                <Cell key={entry.name} fill={STATUS_COLORS_MAP[entry.name] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyState />}
                        </div>
                    </div>

                    {/* Discipline Bar */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <i className="fa-solid fa-ranking-star text-amber-500" />
                            Đánh giá kỷ luật theo dự án
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Số tasks hoàn thành sớm / đúng hạn / trễ hạn</p>
                        {disciplineByProject.length > 0 ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={disciplineByProject} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="early" fill={DISCIPLINE_COLORS.early} name="Sớm hạn" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="onTime" fill={DISCIPLINE_COLORS.onTime} name="Đúng hạn" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="late" fill={DISCIPLINE_COLORS.late} name="Trễ hạn" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState />}
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top 10 Projects */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <i className="fa-solid fa-trophy text-yellow-500" />
                                Top 10 dự án lớn nhất
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Theo số lượng công việc</p>
                            {top10Projects.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={top10Projects} layout="vertical" barGap={2}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                                        <Legend />
                                        <Bar dataKey="total" fill="#6366f1" name="Tổng" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="done" fill="#22c55e" name="Hoàn thành" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <EmptyState />}
                        </div>

                        {/* Monthly Trend */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <i className="fa-solid fa-chart-line text-cyan-500" />
                                Xu hướng giao việc theo thời gian
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Số tasks được tạo và hoàn thành theo tháng</p>
                            {monthlyTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <LineChart data={monthlyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2.5} name="Tạo mới" dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2.5} name="Hoàn thành" dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <EmptyState />}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ TAB: HR REPORT ═══════ */}
            {activeTab === 'hr' && (
                <div className="space-y-6">
                    {/* Treemap - Average Weight */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <i className="fa-solid fa-weight-scale text-indigo-500" />
                            Trọng số trung bình công việc
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">
                            Ai đang gánh vác các công việc khó và quan trọng nhất? (Kích thước = số tasks, Màu = trọng số: CRITICAL=4, HIGH=3, MED=2, LOW=1)
                        </p>
                        {treemapData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <Treemap
                                    data={treemapData}
                                    dataKey="size"
                                    nameKey="name"
                                    aspectRatio={4 / 3}
                                    content={<TreemapCell />}
                                >
                                    <Tooltip
                                        content={({ payload }) => {
                                            if (!payload?.[0]) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 text-sm">
                                                    <p className="font-bold text-gray-900">{d.name}</p>
                                                    <p className="text-gray-600">Số tasks: <strong>{d.size}</strong></p>
                                                    <p className="text-gray-600">Trọng số TB: <strong>{d.value?.toFixed(2)}</strong></p>
                                                </div>
                                            );
                                        }}
                                    />
                                </Treemap>
                            </ResponsiveContainer>
                        ) : <EmptyState text="Không có dữ liệu nhân viên" />}
                    </div>

                    {/* Discipline Ranking */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <i className="fa-solid fa-medal text-amber-500" />
                            Xếp hạng kỷ luật nhân viên
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Nhân viên nộp sớm/đúng hạn vs. trễ hạn</p>
                        {disciplineRanking.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={disciplineRanking} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                                        formatter={(val, name) => [val, name]}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                                    />
                                    <Legend />
                                    <Bar dataKey="early" fill={DISCIPLINE_COLORS.early} name="Đúng/Sớm hạn" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="late" fill={DISCIPLINE_COLORS.late} name="Trễ hạn" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <EmptyState />}
                    </div>

                    {/* Employee Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                            <i className="fa-solid fa-table-list text-indigo-500" />
                            <h3 className="text-lg font-bold text-gray-900">Chi tiết theo nhân viên</h3>
                            <span className="ml-auto text-xs text-gray-400">{employeeStats.length} người</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Nhân viên</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Tổng tasks</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Hoàn thành</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Đúng hạn</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Trễ hạn</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Tỷ lệ đúng hạn</th>
                                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase">Trọng số TB</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {employeeStats.map((e, idx) => (
                                        <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 text-sm text-gray-400 font-mono">{idx + 1}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {e.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{e.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-center text-sm font-semibold text-gray-700">{e.total}</td>
                                            <td className="px-5 py-3 text-center text-sm text-emerald-600 font-semibold">{e.done}</td>
                                            <td className="px-5 py-3 text-center text-sm text-indigo-600 font-semibold">{e.onTime}</td>
                                            <td className="px-5 py-3 text-center text-sm text-red-500 font-semibold">{e.late}</td>
                                            <td className="px-5 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${e.onTimeRate >= 80 ? 'bg-emerald-500' : e.onTimeRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${e.onTimeRate}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-bold ${e.onTimeRate >= 80 ? 'text-emerald-600' : e.onTimeRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {e.onTimeRate}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${e.avgWeight >= 3 ? 'bg-red-100 text-red-700' :
                                                        e.avgWeight >= 2 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-green-100 text-green-700'
                                                    }`}>
                                                    {e.avgWeight}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {employeeStats.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                                <i className="fa-solid fa-users text-3xl mb-3" />
                                                <p>Không có dữ liệu nhân viên</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({ text = 'Chưa có dữ liệu' }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <i className="fa-solid fa-chart-area text-3xl mb-3" />
            <p className="text-sm">{text}</p>
        </div>
    );
}
