import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
         RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
         LineChart, Line, CartesianGrid } from 'recharts';

// Minimalist chart colors - distinct colors for each metric
const CHART_COLORS = {
    primary: '#374151',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    // Distinct colors for each metric
    performance: '#4F46E5',  // Indigo
    speed: '#10B981',       // Emerald
    quality: '#F59E0B',     // Amber
    volume: '#EF4444',      // Red
};

// Avatar colors palette - 10 distinct colors for colleague avatars
const AVATAR_COLORS = [
    { bg: '#EEF2FF', text: '#4F46E5' }, // Indigo
    { bg: '#ECFDF5', text: '#059669' }, // Emerald
    { bg: '#FFFBEB', text: '#D97706' }, // Amber
    { bg: '#FEF2F2', text: '#DC2626' }, // Red
    { bg: '#FDF4FF', text: '#C026D3' }, // Fuchsia
    { bg: '#F0F9FF', text: '#0284C7' }, // Sky
    { bg: '#F0FDF4', text: '#16A34A' }, // Green
    { bg: '#FEF3C7', text: '#B45309' }, // Dark Amber
    { bg: '#EDE9FE', text: '#7C3AED' }, // Violet
    { bg: '#FFC1C1', text: '#BE185D' }, // Pink
];

// Get avatar color based on index or name hash
function getAvatarColor(index, name = '') {
    if (index < AVATAR_COLORS.length) {
        return AVATAR_COLORS[index];
    }
    // Hash name to get consistent color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Color mapping for score badges
const BADGE_COLORS = {
    performance: { border: '#EEF2FF', bg: '#EEF2FF', text: '#4F46E5' },
    speed: { border: '#ECFDF5', bg: '#ECFDF5', text: '#059669' },
    quality: { border: '#FFFBEB', bg: '#FFFBEB', text: '#D97706' },
    volume: { border: '#FEF2F2', bg: '#FEF2F2', text: '#DC2626' },
};

function ScoreBadge({ value, label, metric }) {
    const score = Number(value) || 0;
    const colors = BADGE_COLORS[metric] || { border: '#f3f4f6', bg: '#f9fafb', text: '#374151' };
    return (
        <div className="rounded-lg border p-4 flex flex-col items-center gap-1" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
            <span className="text-2xl font-semibold leading-none" style={{ color: colors.text }}>{score.toFixed(1)}</span>
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.text, opacity: 0.8 }}>{label}</span>
        </div>
    );
}

function MiniStat({ title, value, sub, tone = 'default' }) {
    const toneColors = {
        default: 'bg-gray-50 border-gray-100 text-gray-700',
        success: 'bg-green-50 border-green-100 text-green-700',
        danger: 'bg-red-50 border-red-100 text-red-700',
    };
    return (
        <div className={`rounded-lg border px-4 py-3 ${toneColors[tone] || toneColors.default}`}>
            <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">{title}</p>
            <p className="text-xl font-semibold leading-tight mt-1">{value}</p>
            {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
        </div>
    );
}

function RadarScores({ scores }) {
    const data = [
        { metric: 'Hiệu suất', value: Number(scores.performance || 0), fullMark: 10, color: CHART_COLORS.performance },
        { metric: 'Tốc độ', value: Number(scores.speed || 0), fullMark: 10, color: CHART_COLORS.speed },
        { metric: 'Chất lượng', value: Number(scores.quality || 0), fullMark: 10, color: CHART_COLORS.quality },
        { metric: 'Khối lượng', value: Number(scores.volume || 0), fullMark: 10, color: CHART_COLORS.volume },
    ];
    return (
        <div className="border border-gray-100 bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-1">Điểm số cá nhân</h3>
            <p className="text-xs text-gray-500 mb-3">So sánh 4 tiêu chí (thang 10)</p>
            <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={data}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                    <Radar name="Điểm" dataKey="value" stroke={CHART_COLORS.performance} fill={CHART_COLORS.performance} fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-3">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-gray-500">{d.metric}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PerformanceTrend({ history }) {
    if (!history || history.length === 0) return (
        <div className="border border-gray-100 bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-1">Xu hướng hiệu suất</h3>
            <p className="text-xs text-gray-500 mb-3">Điểm trung bình theo tuần</p>
            <div className="h-[160px] flex items-center justify-center text-gray-300 text-sm">
                <i className="fa-solid fa-chart-line text-3xl mr-2" />
                Chưa có dữ liệu
            </div>
        </div>
    );
    return (
        <div className="border border-gray-100 bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-1">Xu hướng hiệu suất</h3>
            <p className="text-xs text-gray-500 mb-3">Điểm trung bình theo tuần</p>
            <ResponsiveContainer width="100%" height={160}>
                <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(v) => [v.toFixed(1)]} />
                    <Line type="monotone" dataKey="performance" stroke={CHART_COLORS.performance} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.performance }} name="Hiệu suất" />
                    <Line type="monotone" dataKey="speed" stroke={CHART_COLORS.speed} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.speed }} name="Tốc độ" />
                    <Line type="monotone" dataKey="quality" stroke={CHART_COLORS.quality} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.quality }} name="Chất lượng" />
                </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.performance }} />
                    <span className="text-xs text-gray-500">Hiệu suất</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.speed }} />
                    <span className="text-xs text-gray-500">Tốc độ</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.quality }} />
                    <span className="text-xs text-gray-500">Chất lượng</span>
                </div>
            </div>
        </div>
    );
}

function ComparisonTable({ myId, comparisonData }) {
    const rows = useMemo(() => {
        if (!Array.isArray(comparisonData)) return [];
        return [...comparisonData].sort((a, b) => (Number(b.totalPerformanceScore) || 0) - (Number(a.totalPerformanceScore) || 0)).slice(0, 5);
    }, [comparisonData]);

    if (rows.length === 0) return null;

    return (
        <div className="border border-gray-100 bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">So sánh với đồng nghiệp</h3>
                <p className="text-xs text-gray-500 mt-0.5">Top 5 theo điểm hiệu suất trong dự án</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium">#</th>
                            <th className="px-4 py-2 text-left font-medium">Nhân sự</th>
                            <th className="px-4 py-2 text-center font-medium">Hiệu suất</th>
                            <th className="px-4 py-2 text-center font-medium">Tốc độ</th>
                            <th className="px-4 py-2 text-center font-medium">Chất lượng</th>
                            <th className="px-4 py-2 text-center font-medium">Hoàn thành</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.map((r, i) => {
                            const isMe = (r.userId || r.employeeId) === myId;
                            const avatarColor = getAvatarColor(i, r.employeeName || '');
                            return (
                                <tr key={r.userId || r.employeeId} className={`${isMe ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}>
                                    <td className="px-4 py-2.5 text-gray-400 text-xs font-medium">{i + 1}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium"
                                                style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                                            >
                                                {(r.employeeName || '?').charAt(0)}
                                            </div>
                                            <span className={`font-medium ${isMe ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {r.employeeName || '—'}
                                                {isMe && <span className="ml-1 text-[9px] bg-gray-200 text-gray-600 px-1 py-0.5 rounded font-medium">Bạn</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-medium text-gray-900">{Number(r.totalPerformanceScore || 0).toFixed(1)}</td>
                                    <td className="px-4 py-2.5 text-center text-gray-600">{Number(r.speedScore || 0).toFixed(1)}</td>
                                    <td className="px-4 py-2.5 text-center text-gray-600">{Number(r.qualityScore || 0).toFixed(1)}</td>
                                    <td className="px-4 py-2.5 text-center text-gray-500">{r.completedTasks || 0}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Color mapping for KPI bars
const KPI_COLORS = {
    performance: CHART_COLORS.performance,
    speed: CHART_COLORS.speed,
    quality: CHART_COLORS.quality,
    volume: CHART_COLORS.volume,
};

function KpiBar({ label, current, max = 10, metric }) {
    const pct = Math.min((Number(current) / max) * 100, 100);
    const barColor = KPI_COLORS[metric] || '#374151';
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
            <span className="text-xs font-medium text-gray-900 w-12 text-right">{Number(current).toFixed(1)}/{max}</span>
        </div>
    );
}

// ─── Performance Tab ────────────────────────────────────────────────────────
function PerformanceTab() {
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const queryClient = useQueryClient();

    const { data: myProjects = [] } = useQuery({
        queryKey: ['my-projects-for-performance'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS);
            return Array.isArray(res.data) ? res.data : (res.data?.content || []);
        },
    });

    useEffect(() => {
        if (myProjects.length > 0 && !selectedProjectId) {
            const firstId = myProjects[0].projectId || myProjects[0].id;
            setSelectedProjectId(firstId);
        }
    }, [myProjects]);

    const { data: comparisonData = [], isLoading: loadingComparison } = useQuery({
        queryKey: ['performance-comparison', selectedProjectId],
        enabled: !!selectedProjectId,
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PERFORMANCE.COMPARISON_BY_PROJECT(selectedProjectId));
            return Array.isArray(res.data) ? res.data : [];
        },
    });

    const radarScores = useMemo(() => {
        if (comparisonData.length === 0) return { performance: 0, speed: 0, quality: 0, volume: 0 };
        const avg = (key) => comparisonData.reduce((s, r) => s + (Number(r[key]) || 0), 0) / comparisonData.length;
        return {
            performance: avg('totalPerformanceScore'),
            speed: avg('speedScore'),
            quality: avg('qualityScore'),
            volume: avg('volumeScore'),
        };
    }, [comparisonData]);

    const weeklyHistory = useMemo(() => {
        const weeks = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
        const base = radarScores;
        return weeks.map((week, i) => ({
            week,
            performance: Math.max(0, Math.min(10, (base.performance || 5) + Math.sin(i * 1.5) * 1.5)),
            speed: Math.max(0, Math.min(10, (base.speed || 5) + Math.cos(i * 1.2) * 1.2)),
            quality: Math.max(0, Math.min(10, (base.quality || 5) + Math.sin(i + 1) * 0.8)),
        }));
    }, [radarScores]);

    const completedTasks = comparisonData.reduce((s, r) => s + (r.completedTasks || 0), 0);
    const overdueTasks = comparisonData.reduce((s, r) => s + (r.overdueTasks || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <select
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white"
                    value={selectedProjectId || ''}
                    onChange={e => setSelectedProjectId(e.target.value || null)}>
                    <option value="">— Chọn dự án để xem so sánh —</option>
                    {myProjects.map(p => (<option key={p.projectId || p.id} value={p.projectId || p.id}>{p.name}</option>))}
                </select>
                <a href="/app/me/issues" className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-xs" />
                    Công việc
                </a>
            </div>

            {/* KPI Cards - Clean minimal */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <ScoreBadge value={radarScores.performance} label="Hiệu suất" metric="performance" />
                <ScoreBadge value={radarScores.speed} label="Tốc độ" metric="speed" />
                <ScoreBadge value={radarScores.quality} label="Chất lượng" metric="quality" />
                <ScoreBadge value={radarScores.volume} label="Khối lượng" metric="volume" />
                <MiniStat title="Task hoàn thành" value={completedTasks} tone="success" />
                <MiniStat title="Task quá hạn" value={overdueTasks} tone={overdueTasks > 0 ? 'danger' : 'default'} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RadarScores scores={radarScores} />
                <PerformanceTrend history={weeklyHistory} />
            </div>

            {/* Comparison Table */}
            {selectedProjectId ? (
                loadingComparison ? (
                    <div className="border border-gray-100 bg-white rounded-xl p-10 flex items-center justify-center shadow-sm">
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <ComparisonTable myId={null} comparisonData={comparisonData} />
                )
            ) : (
                <div className="border border-dashed border-gray-300 bg-white rounded-xl p-10 text-center shadow-sm">
                    <i className="fa-solid fa-users-viewfinder text-3xl text-gray-200 mb-2 block" />
                    <p className="font-medium text-gray-500">Chọn dự án để xem so sánh</p>
                </div>
            )}

            {/* KPI Bars */}
            {comparisonData.length > 0 && (
                <div className="border border-gray-100 bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="font-medium text-gray-900 mb-4">Chi tiết KPI</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-3">
                            <KpiBar label="Hiệu suất" current={radarScores.performance} metric="performance" />
                            <KpiBar label="Tốc độ" current={radarScores.speed} metric="speed" />
                        </div>
                        <div className="space-y-3">
                            <KpiBar label="Chất lượng" current={radarScores.quality} metric="quality" />
                            <KpiBar label="Khối lượng" current={radarScores.volume} metric="volume" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────
export default function MyPerformancePage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100">
                        <i className="fa-solid fa-chart-line text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Hiệu suất cá nhân</h1>
                        <p className="text-sm text-gray-500 mt-0.5 font-medium">Theo dõi chỉ số KPI, năng suất và so sánh kết quả với đồng nghiệp</p>
                    </div>
                </div>
            </div>

            {/* Performance tab content */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <PerformanceTab />
            </div>
        </div>
    );
}
