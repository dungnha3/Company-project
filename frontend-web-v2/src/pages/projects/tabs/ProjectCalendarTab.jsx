import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';
import IssueDetailModal from '../components/IssueDetailModal';

const STATUS_COLORS = {
    'To Do': { bg: 'bg-gray-50 border-gray-200 text-gray-700 shadow-sm', fill: 'bg-gray-300/40' },
    'In Progress': { bg: 'bg-indigo-50 border-indigo-200 text-indigo-800 shadow-sm', fill: 'bg-indigo-500/20' },
    'Review': { bg: 'bg-purple-50 border-purple-200 text-purple-800 shadow-sm', fill: 'bg-purple-500/20' },
    'Done': { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm', fill: 'bg-emerald-500/20' },
};

const DAY_WIDTH = 48; // slightly wider days for premium readability

export default function ProjectCalendarTab({ projectId }) {
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const leftScrollRef = useRef(null);
    const rightScrollRef = useRef(null);

    const { data: issuesData, isLoading } = useQuery({
        queryKey: ['project-issues-calendar', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId), {
            params: { size: 500, sort: 'createdAt,desc' }
        })).data,
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

    // Calculate Timeline Boundaries
    const { minDate, maxDate, totalDays, dates } = useMemo(() => {
        if (filteredIssues.length === 0) {
            const today = new Date();
            const min = new Date(today); min.setDate(min.getDate() - 7);
            const max = new Date(today); max.setDate(max.getDate() + 14);
            return { minDate: min, maxDate: max, totalDays: 22, dates: [] };
        }

        let min = new Date('2099-01-01');
        let max = new Date('1970-01-01');

        filteredIssues.forEach(i => {
            const s = new Date(i.startDate || i.createdAt);
            const e = new Date(i.dueDate || i.createdAt);
            if (s < min) min = new Date(s);
            if (e > max) max = new Date(e);
        });

        // Add padding
        min.setDate(min.getDate() - 5);
        max.setDate(max.getDate() + 10);

        // Calculate all dates
        const datesArray = [];
        let curr = new Date(min);
        while (curr <= max) {
            datesArray.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        return {
            minDate: min,
            maxDate: max,
            totalDays: datesArray.length,
            dates: datesArray
        };
    }, [filteredIssues]);

    // Group dates by Month for the header
    const months = useMemo(() => {
        const groups = [];
        if (dates.length === 0) return groups;
        
        let currentMonth = dates[0].getMonth();
        let currentYear = dates[0].getFullYear();
        let count = 0;
        
        dates.forEach((d, i) => {
            if (d.getMonth() !== currentMonth) {
                groups.push({ month: currentMonth, year: currentYear, colSpan: count });
                currentMonth = d.getMonth();
                currentYear = d.getFullYear();
                count = 1;
            } else {
                count++;
            }
            if (i === dates.length - 1) {
                groups.push({ month: currentMonth, year: currentYear, colSpan: count });
            }
        });
        return groups;
    }, [dates]);

    const getDaysDiff = (d1, d2) => {
        const _MS_PER_DAY = 1000 * 60 * 60 * 24;
        const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
        const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
        return Math.floor((utc2 - utc1) / _MS_PER_DAY);
    };

    // Scroll Synchronization Event Handlers
    const handleLeftScroll = () => {
        if (rightScrollRef.current && leftScrollRef.current) {
            rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
        }
    };

    const handleRightScroll = () => {
        if (leftScrollRef.current && rightScrollRef.current) {
            leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
        }
    };

    // Auto-scroll to center Today inside the timeline
    useEffect(() => {
        if (isLoading || dates.length === 0 || !rightScrollRef.current) return;

        const todayStr = new Date().toDateString();
        const todayIndex = dates.findIndex(d => d.toDateString() === todayStr);

        if (todayIndex !== -1) {
            const todayOffset = todayIndex * DAY_WIDTH;
            const viewportWidth = rightScrollRef.current.clientWidth;
            rightScrollRef.current.scrollLeft = todayOffset - viewportWidth / 2 + DAY_WIDTH / 2;
        }
    }, [isLoading, dates]);

    // Estimated progress calculation
    const getProgressPct = (issue) => {
        if (issue.statusName === 'Done') return 100;
        if (issue.statusName === 'Review') return 75;
        if (issue.statusName === 'In Progress') {
            if (issue.estimatedHours && issue.loggedHours) {
                return Math.min(Math.round((issue.loggedHours / issue.estimatedHours) * 100), 90);
            }
            return 35;
        }
        return 0;
    };

    if (isLoading) return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500" /></div>;

    return (
        <div className="space-y-4 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-chart-gantt text-lg" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Lộ trình & Lịch công việc (Gantt Chart)</h3>
                        <p className="text-xs text-gray-500">Xem sơ đồ {filteredIssues.length} công việc và thời gian thực hiện đồng bộ</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors font-bold text-gray-700 focus:outline-none focus:border-indigo-400">
                        <option value="all">Tất cả người thực hiện</option>
                        {assignees.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors font-bold text-gray-700 focus:outline-none focus:border-indigo-400">
                        <option value="all">Tất cả trạng thái</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Gantt Chart Area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
                {filteredIssues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                        <i className="fa-solid fa-calendar-xmark text-3xl text-gray-350 animate-bounce" />
                        <p className="text-sm">Không có dữ liệu lộ trình công việc</p>
                    </div>
                ) : (
                    <div className="flex h-full">
                        
                        {/* Left Pane: Issue List */}
                        <div className="w-80 flex-shrink-0 border-r border-gray-150 flex flex-col bg-white z-20 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.03)]">
                            {/* Left Header */}
                            <div className="h-20 border-b border-gray-200 bg-gray-50/70 flex items-end p-4 pb-2.5 font-bold text-gray-500 text-xs shadow-sm uppercase tracking-wider">
                                <div className="w-full flex justify-between">
                                    <span>Công việc</span>
                                    <span>Phụ trách</span>
                                </div>
                            </div>
                            {/* Left Body - with scrollsync */}
                            <div
                                ref={leftScrollRef}
                                onScroll={handleLeftScroll}
                                className="flex-1 overflow-y-auto"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div className="py-2">
                                    {filteredIssues.map(issue => (
                                        <div key={issue.issueId} className="h-12 flex items-center justify-between px-3 border-b border-gray-50 hover:bg-slate-50/75 transition-colors cursor-pointer group"
                                            onClick={() => setSelectedIssue(issue)}>
                                            <div className="flex items-center gap-2 truncate">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[issue.statusName]?.fill || 'bg-gray-300'}`} />
                                                <span className="text-[9px] font-mono font-bold text-gray-400 flex-shrink-0">{issue.issueKey}</span>
                                                <span className="text-xs text-gray-700 truncate group-hover:text-indigo-600 font-semibold">{issue.title}</span>
                                            </div>
                                            {issue.assigneeName ? (
                                                <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-50 to-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-black border border-indigo-200 flex-shrink-0 select-none uppercase" title={issue.assigneeName}>
                                                    {issue.assigneeName.charAt(0)}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-gray-300 font-bold shrink-0">—</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Pane: Timeline */}
                        <div
                            ref={rightScrollRef}
                            onScroll={handleRightScroll}
                            className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/20"
                        >
                            {/* Header: Months & Days */}
                            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
                                {/* Months Row */}
                                <div className="flex border-b border-gray-100 h-10">
                                    {months.map((m, i) => (
                                        <div key={i} className="flex items-center justify-center text-[10px] font-extrabold text-gray-500 border-r border-gray-100 bg-gray-50/60 uppercase tracking-wide"
                                            style={{ width: m.colSpan * DAY_WIDTH, minWidth: m.colSpan * DAY_WIDTH }}>
                                            Tháng {m.month + 1}, {m.year}
                                        </div>
                                    ))}
                                </div>
                                {/* Days Row */}
                                <div className="flex h-10">
                                    {dates.map((d, i) => {
                                        const isToday = d.toDateString() === new Date().toDateString();
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        return (
                                            <div key={i} className={`flex flex-col items-center justify-center text-[9px] border-r border-gray-100 flex-shrink-0
                                                ${isToday ? 'bg-indigo-50 text-indigo-700 font-black' : isWeekend ? 'bg-gray-100/40 text-gray-400' : 'text-gray-500'}
                                            `} style={{ width: DAY_WIDTH }}>
                                                <span className="uppercase text-[7px] font-bold">{d.toLocaleDateString('vi', { weekday: 'short' })}</span>
                                                <span className="font-extrabold text-xs">{d.getDate()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Timeline Body */}
                            <div className="relative py-2" style={{ width: totalDays * DAY_WIDTH, minHeight: '100%' }}>
                                {/* Vertical Grid Lines */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {dates.map((d, i) => {
                                        const isToday = d.toDateString() === new Date().toDateString();
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        return (
                                            <div key={i} className={`border-r h-full flex-shrink-0
                                                ${isToday ? 'border-indigo-200 bg-indigo-50/5' : isWeekend ? 'border-gray-100 bg-gray-50/10' : 'border-gray-100/50 border-dashed'}
                                            `} style={{ width: DAY_WIDTH }} />
                                        );
                                    })}
                                </div>

                                {/* Issue Bars */}
                                {filteredIssues.map((issue, idx) => {
                                    const start = new Date(issue.startDate || issue.createdAt);
                                    const end = new Date(issue.dueDate || issue.createdAt);
                                    
                                    // Ensure end is at least 1 day after start if they are the same day for display
                                    if (end.toDateString() === start.toDateString()) {
                                        end.setDate(end.getDate() + 1);
                                    }

                                    const leftOffset = getDaysDiff(minDate, start) * DAY_WIDTH;
                                    const durationDays = getDaysDiff(start, end);
                                    const barWidth = Math.max(durationDays * DAY_WIDTH, DAY_WIDTH); // At least 1 day wide
                                    const statusStyle = STATUS_COLORS[issue.statusName] || STATUS_COLORS['To Do'];
                                    
                                    const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.statusName !== 'Done';
                                    const progressPct = getProgressPct(issue);

                                    return (
                                        <div key={issue.issueId} className="h-12 relative flex items-center group cursor-pointer"
                                            onClick={() => setSelectedIssue(issue)}>
                                            <div
                                                className={`absolute h-8 rounded-xl shadow-sm border flex items-center px-3 overflow-hidden transition-all group-hover:shadow-md group-hover:brightness-95
                                                    ${statusStyle.bg}
                                                    ${isOverdue ? 'ring-2 ring-red-400 border-red-500' : ''}
                                                `}
                                                style={{ left: leftOffset, width: barWidth }}
                                                title={`${issue.title}\nBắt đầu: ${formatDate(start)}\nHạn chót: ${formatDate(end)}`}
                                            >
                                                {/* Shaded Progress Bar Inside */}
                                                <div
                                                    className={`absolute left-0 top-0 bottom-0 ${statusStyle.fill} transition-all duration-500`}
                                                    style={{ width: `${progressPct}%` }}
                                                />
                                                
                                                {/* Task Title (Text) */}
                                                <span className="text-[10px] font-black truncate relative z-10">{issue.title}</span>

                                                {/* Tiny Progress Badge & Assignee inside bar if wide enough */}
                                                {barWidth > 120 && (
                                                    <span className="text-[8px] font-black opacity-60 ml-2 relative z-10 uppercase shrink-0">
                                                        {progressPct}%
                                                    </span>
                                                )}
                                                
                                                {issue.assigneeName && barWidth > 90 && (
                                                    <span className="ml-auto w-4.5 h-4.5 rounded-full bg-white/50 text-[8px] font-black flex items-center justify-center border border-white/60 shrink-0 select-none uppercase relative z-10" title={issue.assigneeName}>
                                                        {issue.assigneeName.charAt(0)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Progress / Info floating on hover */}
                                            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1.5 px-3 rounded-lg -translate-y-9 shadow-lg pointer-events-none whitespace-nowrap z-30 flex items-center gap-2 font-semibold"
                                                style={{ left: leftOffset + barWidth/2, transform: 'translate(-50%, -100%)' }}>
                                                <i className="fa-solid fa-clock text-indigo-400" />
                                                <span>{formatDate(start)} - {formatDate(end)}</span>
                                                <span className="text-gray-400">|</span>
                                                <span className="text-indigo-300">{progressPct}% hoàn thành</span>
                                                {isOverdue && (
                                                    <>
                                                        <span className="text-gray-400">|</span>
                                                        <span className="text-red-400 font-extrabold flex items-center gap-1">
                                                            <i className="fa-solid fa-circle-exclamation text-[10px]" />
                                                            Quá hạn!
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedIssue && <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
        </div>
    );
}
