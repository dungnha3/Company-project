import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate, formatDateTime } from '@shared/utils/formatters';
import IssueDetailModal from '../components/IssueDetailModal';

const STATUS_COLORS = {
    'To Do': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
    'In Progress': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    'Review': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    'Done': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function ProjectCalendarTab({ projectId }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [hoveredIssue, setHoveredIssue] = useState(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

    const { data: issuesData, isLoading } = useQuery({
        queryKey: ['project-issues-calendar', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId))).data,
    });

    const issues = issuesData?.content || issuesData || [];

    const assignees = useMemo(() => {
        const map = new Map();
        issues.forEach(i => { if (i.assigneeId && i.assigneeName) map.set(i.assigneeId, i.assigneeName); });
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [issues]);

    const statuses = useMemo(() => {
        const set = new Set();
        issues.forEach(i => { if (i.statusName) set.add(i.statusName); });
        return Array.from(set);
    }, [issues]);

    const filteredIssues = useMemo(() => {
        return issues.filter(i => {
            if (filterAssignee !== 'all' && String(i.assigneeId) !== filterAssignee) return false;
            if (filterStatus !== 'all' && i.statusName !== filterStatus) return false;
            return true;
        });
    }, [issues, filterAssignee, filterStatus]);

    const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = toDateStr(new Date());

    const getIssuesForDate = (dateStr) => filteredIssues.filter(i => i.dueDate?.startsWith(dateStr));

    const handleIssueHover = (e, issue) => {
        setHoveredIssue(issue);
        setHoverPos({ x: e.clientX, y: e.clientY });
    };

    // ==================== NAVIGATION ====================
    const navigate = (delta) => {
        const d = new Date(currentDate);
        if (viewMode === 'month') d.setMonth(d.getMonth() + delta);
        else if (viewMode === 'week') d.setDate(d.getDate() + delta * 7);
        else d.setDate(d.getDate() + delta);
        setCurrentDate(d);
    };

    const goToToday = () => setCurrentDate(new Date());

    const getLabel = () => {
        if (viewMode === 'month') return currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
        if (viewMode === 'day') return currentDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const weekStart = getWeekStart();
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.getDate()}/${weekStart.getMonth() + 1} — ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}/${weekEnd.getFullYear()}`;
    };

    const getWeekStart = () => {
        const d = new Date(currentDate);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d;
    };

    // ==================== MONTH VIEW ====================
    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            days.push({ date: d, dateStr: toDateStr(d), day: i });
        }
        return days;
    };

    // ==================== WEEK VIEW ====================
    const getWeekDays = () => {
        const ws = getWeekStart();
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(ws);
            d.setDate(d.getDate() + i);
            return { date: d, dateStr: toDateStr(d), day: d.getDate() };
        });
    };

    // ==================== ISSUE CARD ====================
    const IssueCard = ({ issue, compact = false }) => {
        const statusColor = STATUS_COLORS[issue.statusName] || STATUS_COLORS['To Do'];
        const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.statusName !== 'Done';
        return (
            <div
                onClick={() => setSelectedIssue(issue)}
                onMouseEnter={(e) => handleIssueHover(e, issue)}
                onMouseLeave={() => setHoveredIssue(null)}
                className={`group flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] cursor-pointer transition-all hover:shadow-sm ${statusColor.bg} ${statusColor.text} ${isOverdue ? 'ring-1 ring-red-300' : ''}`}
            >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor.dot}`} />
                {issue.assigneeName && (
                    <span className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                        {issue.assigneeName.charAt(0).toUpperCase()}
                    </span>
                )}
                <span className="truncate font-medium leading-tight">{issue.title}</span>
                {isOverdue && <i className="fa-solid fa-exclamation-circle text-red-500 text-[9px] shrink-0 ml-auto" />}
            </div>
        );
    };

    // ==================== RENDER ====================
    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                        <i className="fa-solid fa-calendar-days" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Lịch công việc</h3>
                        <p className="text-xs text-gray-500">{filteredIssues.length} công việc</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View mode tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {[
                            { id: 'month', label: 'Tháng', icon: 'fa-calendar' },
                            { id: 'week', label: 'Tuần', icon: 'fa-calendar-week' },
                            { id: 'day', label: 'Ngày', icon: 'fa-calendar-day' },
                        ].map(v => (
                            <button key={v.id} onClick={() => setViewMode(v.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${viewMode === v.id ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                <i className={`fa-solid ${v.icon} text-[10px]`} /> {v.label}
                            </button>
                        ))}
                    </div>
                    <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                        <option value="all">Tất cả người thực hiện</option>
                        {assignees.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                        <option value="all">Tất cả trạng thái</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-500"><i className="fa-solid fa-chevron-left" /></button>
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-800 capitalize">{getLabel()}</h2>
                    <button onClick={goToToday} className="text-xs px-3 py-1 rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100 font-medium transition-colors">Hôm nay</button>
                </div>
                <button onClick={() => navigate(1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-500"><i className="fa-solid fa-chevron-right" /></button>
            </div>

            {/* Calendar Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-violet-500 mb-2" /><p className="text-gray-500 text-sm">Đang tải lịch...</p></div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* ========== MONTH VIEW ========== */}
                    {viewMode === 'month' && (
                        <>
                            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80">
                                {WEEKDAYS.map(day => <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{day}</div>)}
                            </div>
                            <div className="grid grid-cols-7 auto-rows-[minmax(110px,auto)]">
                                {getDaysInMonth().map((cell, idx) => {
                                    if (!cell) return <div key={idx} className="bg-gray-50/30 border-b border-r border-gray-100 min-h-[110px]" />;
                                    const dayIssues = getIssuesForDate(cell.dateStr);
                                    const isToday = cell.dateStr === todayStr;
                                    return (
                                        <div key={idx} className={`relative p-1.5 border-b border-r border-gray-100 transition-colors min-h-[110px] hover:bg-gray-50/50 ${isToday ? 'bg-violet-50/40 ring-1 ring-inset ring-violet-200' : ''}`}>
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-violet-600 text-white shadow-md' : 'text-gray-700'}`}>{cell.day}</span>
                                                {dayIssues.length > 0 && <span className="text-[10px] text-gray-400 font-medium">{dayIssues.length}</span>}
                                            </div>
                                            <div className="space-y-0.5 overflow-hidden max-h-[75px] overflow-y-auto">
                                                {dayIssues.slice(0, 3).map(issue => <IssueCard key={issue.issueId} issue={issue} />)}
                                                {dayIssues.length > 3 && <div className="text-[10px] text-gray-400 text-center font-medium py-0.5 cursor-pointer hover:text-violet-600">+{dayIssues.length - 3} khác</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ========== WEEK VIEW ========== */}
                    {viewMode === 'week' && (
                        <>
                            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80">
                                {getWeekDays().map((d, i) => {
                                    const isToday = d.dateStr === todayStr;
                                    return (
                                        <div key={i} className={`py-3 text-center border-r border-gray-100 ${isToday ? 'bg-violet-50' : ''}`}>
                                            <div className="text-[10px] font-semibold text-gray-400 uppercase">{WEEKDAYS[d.date.getDay()]}</div>
                                            <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-violet-600' : 'text-gray-800'}`}>{d.day}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-7 min-h-[400px]">
                                {getWeekDays().map((d, i) => {
                                    const dayIssues = getIssuesForDate(d.dateStr);
                                    const isToday = d.dateStr === todayStr;
                                    return (
                                        <div key={i} className={`p-2 border-r border-gray-100 ${isToday ? 'bg-violet-50/30' : ''}`}>
                                            <div className="space-y-1">
                                                {dayIssues.map(issue => <IssueCard key={issue.issueId} issue={issue} />)}
                                                {dayIssues.length === 0 && <p className="text-[10px] text-gray-300 text-center py-8 italic">Trống</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ========== DAY VIEW ========== */}
                    {viewMode === 'day' && (() => {
                        const dateStr = toDateStr(currentDate);
                        const dayIssues = getIssuesForDate(dateStr);
                        const isToday = dateStr === todayStr;
                        return (
                            <div className={`p-6 min-h-[400px] ${isToday ? 'bg-violet-50/20' : ''}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className={`inline-flex w-12 h-12 items-center justify-center rounded-2xl text-xl font-bold ${isToday ? 'bg-violet-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700'}`}>
                                        {currentDate.getDate()}
                                    </span>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-500">{WEEKDAYS[currentDate.getDay()]}</div>
                                        <div className="text-xs text-gray-400">{dayIssues.length} công việc</div>
                                    </div>
                                </div>
                                {dayIssues.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <i className="fa-solid fa-calendar-xmark text-4xl mb-3" />
                                        <p>Không có công việc</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {dayIssues.map(issue => {
                                            const statusColor = STATUS_COLORS[issue.statusName] || STATUS_COLORS['To Do'];
                                            const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.statusName !== 'Done';
                                            return (
                                                <div key={issue.issueId}
                                                    onClick={() => setSelectedIssue(issue)}
                                                    onMouseEnter={(e) => handleIssueHover(e, issue)}
                                                    onMouseLeave={() => setHoveredIssue(null)}
                                                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${statusColor.bg} border ${isOverdue ? 'border-red-300' : 'border-transparent'}`}>
                                                    <span className={`w-3 h-10 rounded-full ${statusColor.dot}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono text-gray-400 bg-white/60 px-1.5 py-0.5 rounded">{issue.issueKey}</span>
                                                            <span className={`text-sm font-semibold ${statusColor.text}`}>{issue.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                            {issue.assigneeName && <span className="flex items-center gap-1"><i className="fa-solid fa-user text-[9px]" /> {issue.assigneeName}</span>}
                                                            <span>{issue.statusName}</span>
                                                            {issue.startDate && <span>Bắt đầu: {formatDate(issue.startDate)}</span>}
                                                        </div>
                                                    </div>
                                                    {isOverdue && <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">Quá hạn</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Trạng thái:</span>
                {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                    <div key={status} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                        <span className="text-xs text-gray-600">{status}</span>
                    </div>
                ))}
            </div>

            {/* Hover Popup Card */}
            {hoveredIssue && (
                <div className="fixed z-[999] pointer-events-none"
                    style={{ left: Math.min(hoverPos.x + 10, window.innerWidth - 320), top: Math.min(hoverPos.y - 10, window.innerHeight - 200) }}>
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-[300px] animate-fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{hoveredIssue.issueKey}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[hoveredIssue.statusName]?.bg || 'bg-gray-100'} ${STATUS_COLORS[hoveredIssue.statusName]?.text || 'text-gray-600'}`}>
                                {hoveredIssue.statusName}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mb-2">{hoveredIssue.title}</h4>
                        <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-2"><i className="fa-solid fa-user w-4 text-center" /> <span>{hoveredIssue.assigneeName || 'Chưa giao'}</span></div>
                            {hoveredIssue.startDate && <div className="flex items-center gap-2"><i className="fa-solid fa-play w-4 text-center" /> <span>Bắt đầu: {formatDate(hoveredIssue.startDate)}</span></div>}
                            <div className="flex items-center gap-2"><i className="fa-solid fa-flag-checkered w-4 text-center" /> <span>Hạn chót: {hoveredIssue.dueDate ? formatDate(hoveredIssue.dueDate) : '—'}</span></div>
                            {hoveredIssue.weight && <div className="flex items-center gap-2"><i className="fa-solid fa-weight-scale w-4 text-center" /> <span>Trọng số: {hoveredIssue.weight}/10</span></div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Issue Detail Modal */}
            {selectedIssue && <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
        </div>
    );
}
