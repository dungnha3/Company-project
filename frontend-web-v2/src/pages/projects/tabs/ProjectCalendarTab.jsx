import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';
import IssueDetailModal from '../components/IssueDetailModal';

const STATUS_COLORS = {
    'To Do': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' },
    'In Progress': { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
    'Review': { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
    'Done': { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800' },
};

const DAY_WIDTH = 40; // pixels per day

export default function ProjectCalendarTab({ projectId }) {
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [filterAssignee, setFilterAssignee] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

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

    if (isLoading) return <div className="p-8 text-center"><i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500" /></div>;

    return (
        <div className="space-y-4 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-chart-gantt text-lg" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Timeline / Roadmap</h3>
                        <p className="text-xs text-gray-500">Lộ trình {filteredIssues.length} công việc</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <option value="all">Tất cả người thực hiện</option>
                        {assignees.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <option value="all">Tất cả trạng thái</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Gantt Chart Area */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
                {filteredIssues.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">Không có dữ liệu timeline</div>
                ) : (
                    <div className="flex h-full">
                        
                        {/* Left Pane: Issue List */}
                        <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white z-20">
                            {/* Left Header */}
                            <div className="h-20 border-b border-gray-200 bg-gray-50 flex items-end p-3 pb-2 font-semibold text-gray-600 text-sm shadow-sm">
                                <div className="w-full flex justify-between">
                                    <span>Công việc</span>
                                    <span>Phụ trách</span>
                                </div>
                            </div>
                            {/* Left Body */}
                            <div className="flex-1 overflow-hidden" style={{ scrollbarWidth: 'none' }}>
                                <div className="py-2">
                                    {filteredIssues.map(issue => (
                                        <div key={issue.issueId} className="h-12 flex items-center justify-between px-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group"
                                            onClick={() => setSelectedIssue(issue)}>
                                            <div className="flex items-center gap-2 truncate">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[issue.statusName]?.bg || 'bg-gray-300'}`} />
                                                <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">{issue.issueKey}</span>
                                                <span className="text-sm text-gray-700 truncate group-hover:text-indigo-600 font-medium">{issue.title}</span>
                                            </div>
                                            {issue.assigneeName && (
                                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0" title={issue.assigneeName}>
                                                    {issue.assigneeName.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Pane: Timeline */}
                        <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/30">
                            {/* Header: Months & Days */}
                            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                                {/* Months Row */}
                                <div className="flex border-b border-gray-100 h-10">
                                    {months.map((m, i) => (
                                        <div key={i} className="flex items-center justify-center text-xs font-bold text-gray-600 border-r border-gray-100 bg-gray-50/80"
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
                                            <div key={i} className={`flex flex-col items-center justify-center text-[10px] border-r border-gray-100 flex-shrink-0
                                                ${isToday ? 'bg-indigo-100 text-indigo-700 font-bold' : isWeekend ? 'bg-gray-100 text-gray-400' : 'text-gray-500'}
                                            `} style={{ width: DAY_WIDTH }}>
                                                <span className="uppercase text-[8px]">{d.toLocaleDateString('vi', { weekday: 'short' })}</span>
                                                <span>{d.getDate()}</span>
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
                                                ${isToday ? 'border-indigo-200 bg-indigo-50/20' : isWeekend ? 'border-gray-100 bg-gray-50/50' : 'border-gray-100 border-dashed'}
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

                                    return (
                                        <div key={issue.issueId} className="h-12 relative flex items-center group cursor-pointer"
                                            onClick={() => setSelectedIssue(issue)}>
                                            <div
                                                className={`absolute h-7 rounded-full shadow-sm border flex items-center px-3 overflow-hidden transition-all group-hover:shadow-md group-hover:brightness-95
                                                    ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}
                                                    ${isOverdue ? 'ring-2 ring-red-400 border-red-500' : ''}
                                                `}
                                                style={{ left: leftOffset, width: barWidth }}
                                                title={`${issue.title}\nBắt đầu: ${formatDate(start)}\nHoàn thành: ${formatDate(end)}`}
                                            >
                                                <span className="text-[10px] font-bold truncate">{issue.title}</span>
                                            </div>
                                            {/* Progress / Info floating on hover */}
                                            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] py-1 px-2 rounded -translate-y-8 pointer-events-none whitespace-nowrap z-30"
                                                style={{ left: leftOffset + barWidth/2, transform: 'translate(-50%, -100%)' }}>
                                                {formatDate(start)} - {formatDate(end)}
                                                {isOverdue && <span className="ml-2 text-red-400 font-bold">Quá hạn!</span>}
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
