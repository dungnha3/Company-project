import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import IssueDetailModal from '../components/IssueDetailModal';

const STATUS_COLORS = {
    'To Do': '#94a3b8', 'In Progress': '#6366f1', 'Review': '#a855f7', 'Done': '#22c55e',
};
const PRIORITY_LABELS = { CRITICAL: 'Khẩn', HIGH: 'Cao', MEDIUM: 'TB', LOW: 'Thấp' };

export default function TimelineTab({ projectId }) {
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [filter, setFilter] = useState('');
    const scrollRef = useRef(null);

    const { data: issuesRaw = [], isLoading } = useQuery({
        queryKey: ['project-issues-timeline', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId));
            return res.data?.content || res.data || [];
        },
        enabled: !!projectId,
    });

    const issues = Array.isArray(issuesRaw) ? issuesRaw : [];

    // Compute timeline range
    const { filteredIssues, days, startDate, totalDays } = useMemo(() => {
        let filtered = issues.filter(i => i.startDate || i.dueDate);
        if (filter) {
            const q = filter.toLowerCase();
            filtered = filtered.filter(i =>
                i.title?.toLowerCase().includes(q) ||
                i.assigneeName?.toLowerCase().includes(q) ||
                i.issueKey?.toLowerCase().includes(q)
            );
        }

        if (filtered.length === 0) return { filteredIssues: [], days: [], startDate: null, totalDays: 0 };

        const allDates = filtered.flatMap(i => [i.startDate, i.dueDate].filter(Boolean)).map(d => new Date(d));
        const min = new Date(Math.min(...allDates));
        const max = new Date(Math.max(...allDates));
        // add 2 days padding each side
        min.setDate(min.getDate() - 2);
        max.setDate(max.getDate() + 2);

        const total = Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
        const dayArr = [];
        for (let i = 0; i < total; i++) {
            const d = new Date(min);
            d.setDate(d.getDate() + i);
            dayArr.push(d);
        }

        return { filteredIssues: filtered, days: dayArr, startDate: min, totalDays: total };
    }, [issues, filter]);

    // Count tasks per day
    const dailyCounts = useMemo(() => {
        const counts = {};
        days.forEach(d => { counts[d.toISOString().slice(0, 10)] = 0; });
        filteredIssues.forEach(i => {
            const s = new Date(i.startDate || i.dueDate);
            const e = new Date(i.dueDate || i.startDate);
            days.forEach(d => {
                const key = d.toISOString().slice(0, 10);
                if (d >= s && d <= e) counts[key] = (counts[key] || 0) + 1;
            });
        });
        return counts;
    }, [filteredIssues, days]);

    const getBarStyle = (issue) => {
        if (!startDate) return {};
        const s = new Date(issue.startDate || issue.dueDate);
        const e = new Date(issue.dueDate || issue.startDate);
        const leftDays = Math.max(0, (s - startDate) / (1000 * 60 * 60 * 24));
        const widthDays = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
        const cellW = 36;
        return {
            left: `${leftDays * cellW}px`,
            width: `${widthDays * cellW}px`,
        };
    };

    const today = new Date().toISOString().slice(0, 10);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                    <i className="fa-solid fa-timeline" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Timeline</h2>
                    <p className="text-xs text-gray-500">Gantt tổng quan các công việc theo thời gian</p>
                </div>
                <div className="ml-auto relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-56 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            </div>

            {filteredIssues.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <i className="fa-solid fa-timeline text-4xl mb-3" />
                    <p>Không có dữ liệu timeline (cần startDate hoặc dueDate)</p>
                </div>
            ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto" ref={scrollRef}>
                        <div style={{ minWidth: `${Math.max(totalDays * 36 + 280, 800)}px` }}>
                            {/* Header: day cells */}
                            <div className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                <div className="w-[280px] shrink-0 px-4 py-2 text-xs font-medium text-gray-500 border-r border-gray-200">
                                    Công việc
                                </div>
                                <div className="flex-1 flex">
                                    {days.map(d => {
                                        const key = d.toISOString().slice(0, 10);
                                        const isToday = key === today;
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        return (
                                            <div
                                                key={key}
                                                className={`w-9 shrink-0 text-center py-1 text-[10px] border-r border-gray-100 ${isToday ? 'bg-indigo-50 font-bold text-indigo-600' : isWeekend ? 'bg-gray-100 text-gray-400' : 'text-gray-500'}`}
                                            >
                                                <div>{d.getDate()}</div>
                                                <div className="text-[8px]">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()]}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Issue rows */}
                            {filteredIssues.map(issue => {
                                const statusColor = STATUS_COLORS[issue.statusName] || '#94a3b8';
                                const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.statusName !== 'Done';
                                return (
                                    <div key={issue.issueId} className="flex border-b border-gray-50 hover:bg-gray-50/50 group">
                                        {/* Issue info */}
                                        <div className="w-[280px] shrink-0 px-3 py-2 border-r border-gray-100 flex items-center gap-2 cursor-pointer"
                                            onClick={() => setSelectedIssue(issue)}>
                                            <span className="text-[10px] font-mono text-gray-400 min-w-[60px]">{issue.issueKey}</span>
                                            <span className="text-xs text-gray-800 truncate group-hover:text-indigo-600 transition-colors flex-1">{issue.title}</span>
                                            <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{issue.assigneeName?.split(' ').pop() || ''}</span>
                                        </div>
                                        {/* Bar area */}
                                        <div className="flex-1 relative h-9">
                                            {/* Grid lines */}
                                            {days.map(d => {
                                                const key = d.toISOString().slice(0, 10);
                                                const isToday = key === today;
                                                return (
                                                    <div key={key} className={`absolute top-0 bottom-0 w-9 border-r border-gray-50 ${isToday ? 'bg-indigo-50/30' : ''}`}
                                                        style={{ left: `${days.indexOf(d) * 36}px` }} />
                                                );
                                            })}
                                            {/* Issue bar */}
                                            <div
                                                className={`absolute top-1.5 h-6 rounded-md shadow-sm cursor-pointer transition-all hover:shadow-md hover:brightness-110 ${isOverdue ? 'ring-2 ring-red-400 ring-opacity-60' : ''}`}
                                                style={{ ...getBarStyle(issue), backgroundColor: statusColor, minWidth: '36px' }}
                                                onClick={() => setSelectedIssue(issue)}
                                                title={`${issue.title}\n${issue.startDate || ''} → ${issue.dueDate || ''}\n${issue.assigneeName || 'Chưa giao'}`}
                                            >
                                                <span className="text-[9px] text-white font-medium px-1.5 truncate block leading-6">
                                                    {issue.title}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Daily count footer */}
                            <div className="flex bg-gray-50 border-t border-gray-200">
                                <div className="w-[280px] shrink-0 px-4 py-1.5 text-xs font-medium text-gray-500 border-r border-gray-200">
                                    Tổng / ngày
                                </div>
                                <div className="flex-1 flex">
                                    {days.map(d => {
                                        const key = d.toISOString().slice(0, 10);
                                        const count = dailyCounts[key] || 0;
                                        return (
                                            <div key={key} className={`w-9 shrink-0 text-center py-1 text-[10px] font-medium border-r border-gray-100 ${count > 3 ? 'text-red-600 bg-red-50' : count > 0 ? 'text-gray-600' : 'text-gray-300'}`}>
                                                {count || '·'}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedIssue && (
                <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} onUpdate={() => { }} />
            )}
        </div>
    );
}
