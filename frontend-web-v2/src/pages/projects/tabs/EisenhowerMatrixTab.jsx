import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import IssueDetailModal from '../components/IssueDetailModal';

const QUADRANTS = [
    { id: 1, title: 'Làm ngay', subtitle: 'Quan trọng & Khẩn cấp', icon: 'fa-fire', color: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    { id: 2, title: 'Lên kế hoạch', subtitle: 'Quan trọng & Không khẩn', icon: 'fa-calendar-check', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    { id: 3, title: 'Giao lại', subtitle: 'Không quan trọng & Khẩn', icon: 'fa-share', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    { id: 4, title: 'Làm sau', subtitle: 'Không quan trọng & Không khẩn', icon: 'fa-clock', color: 'from-gray-400 to-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
];

const PRIORITY_COLORS = { CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-indigo-500', LOW: 'bg-gray-400' };

export default function EisenhowerMatrixTab({ projectId }) {
    const [selectedIssue, setSelectedIssue] = useState(null);

    const { data: issuesRaw = [], isLoading } = useQuery({
        queryKey: ['project-issues-eisenhower', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId));
            return res.data?.content || res.data || [];
        },
        enabled: !!projectId,
    });

    const issues = Array.isArray(issuesRaw) ? issuesRaw : [];

    // Group issues by eisenhower quadrant — compute client-side from isImportant/isUrgent
    const quadrantData = useMemo(() => {
        const map = { 1: [], 2: [], 3: [], 4: [] };
        issues.forEach(i => {
            const imp = Boolean(i.isImportant);
            const urg = Boolean(i.isUrgent);
            let q;
            if (imp && urg)      q = 1;  // Do first
            else if (imp && !urg) q = 2;  // Schedule
            else if (!imp && urg) q = 3;  // Delegate
            else                  q = 4;  // Eliminate
            map[q].push(i);
        });
        return map;
    }, [issues]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <i className="fa-solid fa-grid-2" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Ma trận Eisenhower</h2>
                    <p className="text-xs text-gray-500">Phân loại tự động dựa trên "Quan trọng" và "Khẩn cấp"</p>
                </div>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {QUADRANTS.map(q => (
                    <div key={q.id} className={`rounded-2xl border-2 ${q.border} ${q.bg} p-4 min-h-[200px]`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${q.color} flex items-center justify-center text-white`}>
                                <i className={`fa-solid ${q.icon} text-sm`} />
                            </div>
                            <div>
                                <h3 className={`text-sm font-bold ${q.text}`}>{q.title}</h3>
                                <p className="text-[10px] text-gray-400">{q.subtitle}</p>
                            </div>
                            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${q.text} bg-white`}>
                                {quadrantData[q.id].length}
                            </span>
                        </div>
                        <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                            {quadrantData[q.id].length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6 italic">Không có công việc</p>
                            ) : quadrantData[q.id].map(issue => (
                                <button
                                    key={issue.issueId}
                                    onClick={() => setSelectedIssue(issue)}
                                    className="w-full text-left bg-white rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[issue.priority] || 'bg-gray-400'}`} />
                                        <span className="text-xs text-gray-400 font-mono">{issue.issueKey}</span>
                                        <span className="text-xs text-gray-500 ml-auto">
                                            {issue.assigneeName || '—'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-800 mt-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{issue.title}</p>
                                    {issue.weight && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[10px] text-gray-400">Trọng số:</span>
                                            <span className="text-[10px] font-bold text-gray-600">{issue.weight}/10</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {selectedIssue && (
                <IssueDetailModal
                    issue={selectedIssue}
                    onClose={() => setSelectedIssue(null)}
                    onUpdate={() => { }}
                />
            )}
        </div>
    );
}
