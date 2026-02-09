import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import IssueDetailModal from './components/IssueDetailModal';
import { SkeletonStatCard, SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyInbox } from '@/components/ui/EmptyState';

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'TODO', label: 'Cần làm' },
    { value: 'IN_PROGRESS', label: 'Đang làm' },
    { value: 'DONE', label: 'Hoàn thành' },
];

const VIEW_MODES = [
    { id: 'all', label: 'Tất cả', icon: 'fa-list' },
    { id: 'assigned', label: 'Được giao', icon: 'fa-user' },
    { id: 'reported', label: 'Tôi tạo', icon: 'fa-user-pen' },
    { id: 'overdue', label: 'Quá hạn', icon: 'fa-clock' },
];

export default function MyIssuesPage() {
    const [viewMode, setViewMode] = useState('all');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIssue, setSelectedIssue] = useState(null);
    const queryClient = useQueryClient();

    // Fetch my assigned issues (paginated response)
    const { data: assignedIssues = [], isLoading: loadingAssigned } = useQuery({
        queryKey: ['myIssues'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.MY_ISSUES)).data;
                // Handle paginated response (has .content) or direct array
                return response?.content || response || [];
            } catch {
                return [];
            }
        },
    });

    // Fetch issues I reported
    const { data: reportedIssues = [], isLoading: loadingReported } = useQuery({
        queryKey: ['myReportedIssues'],
        queryFn: async () => {
            try {
                const response = (await apiClient.get(ENDPOINTS.ISSUES.MY_REPORTED)).data;
                return Array.isArray(response) ? response : (response?.content || []);
            } catch {
                return [];
            }
        },
    });

    const isLoading = loadingAssigned || loadingReported;

    // Combine and filter issues
    const allIssues = (() => {
        let issues = [];

        switch (viewMode) {
            case 'assigned':
                issues = assignedIssues;
                break;
            case 'reported':
                issues = reportedIssues;
                break;
            case 'overdue':
                const today = new Date();
                issues = [...assignedIssues, ...reportedIssues].filter(
                    (i, idx, arr) => arr.findIndex(x => x.issueId === i.issueId) === idx // unique
                ).filter(i => i.dueDate && new Date(i.dueDate) < today && i.status !== 'DONE');
                break;
            default:
                // All unique issues
                issues = [...assignedIssues, ...reportedIssues].filter(
                    (i, idx, arr) => arr.findIndex(x => x.issueId === i.issueId) === idx
                );
        }

        // Apply status filter
        if (statusFilter) {
            issues = issues.filter(i => i.status === statusFilter || i.statusName === statusFilter);
        }

        // Apply search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            issues = issues.filter(i =>
                i.title?.toLowerCase().includes(q) ||
                i.issueKey?.toLowerCase().includes(q) ||
                i.projectName?.toLowerCase().includes(q)
            );
        }

        return issues;
    })();

    // Stats
    const stats = {
        total: [...assignedIssues, ...reportedIssues].filter((i, idx, arr) => arr.findIndex(x => x.issueId === i.issueId) === idx).length,
        assigned: assignedIssues.length,
        reported: reportedIssues.length,
        overdue: [...assignedIssues, ...reportedIssues].filter(
            (i, idx, arr) => arr.findIndex(x => x.issueId === i.issueId) === idx
        ).filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'DONE').length,
    };

    const handleIssueClick = (issue) => {
        setSelectedIssue(issue);
    };

    const handleCloseModal = () => {
        setSelectedIssue(null);
        queryClient.invalidateQueries(['myIssues']);
        queryClient.invalidateQueries(['myReportedIssues']);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Công việc của tôi</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý tất cả các tác vụ được giao và tạo bởi bạn</p>
                </div>
            </div>

            {/* Stats Cards */}
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SkeletonStatCard />
                    <SkeletonStatCard />
                    <SkeletonStatCard />
                    <SkeletonStatCard />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon="fa-list-check"
                        iconColor="bg-blue-100 text-blue-600"
                        label="Tổng tasks"
                        value={stats.total}
                    />
                    <StatCard
                        icon="fa-user"
                        iconColor="bg-indigo-100 text-indigo-600"
                        label="Được giao"
                        value={stats.assigned}
                    />
                    <StatCard
                        icon="fa-user-pen"
                        iconColor="bg-purple-100 text-purple-600"
                        label="Tôi tạo"
                        value={stats.reported}
                    />
                    <StatCard
                        icon="fa-clock"
                        iconColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        label="Quá hạn"
                        value={stats.overdue}
                        highlight={stats.overdue > 0}
                    />
                </div>
            )}

            {/* Filters & Search */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 animate-slide-up">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* View Mode Tabs */}
                    <div className="flex gap-2 flex-wrap">
                        {VIEW_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setViewMode(mode.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all
                                    ${viewMode === mode.id
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <i className={`fa-solid ${mode.icon}`} />
                                {mode.label}
                                {mode.id === 'overdue' && stats.overdue > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                        {stats.overdue}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1" />

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm task..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Issues Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Task</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Dự án</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Hạn chót</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Người thực hiện</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <i className="fa-solid fa-spinner fa-spin text-xl text-indigo-500" />
                                        <p className="mt-2">Đang tải...</p>
                                    </td>
                                </tr>
                            ) : allIssues.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-3" />
                                        <p className="font-medium">Không có task nào</p>
                                        <p className="text-sm mt-1">Các task được giao sẽ xuất hiện ở đây</p>
                                    </td>
                                </tr>
                            ) : (
                                allIssues.map((issue) => (
                                    <IssueRow
                                        key={issue.issueId}
                                        issue={issue}
                                        onClick={() => handleIssueClick(issue)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Issue Detail Modal */}
            {selectedIssue && (
                <IssueDetailModal
                    issue={selectedIssue}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}

function StatCard({ icon, iconColor, label, value, highlight = false }) {
    return (
        <div className={`bg-white rounded-xl p-4 border ${highlight ? 'border-red-200' : 'border-gray-100'} shadow-sm`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
                    <i className={`fa-solid ${icon}`} />
                </div>
                <div>
                    <div className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
                    <div className="text-sm text-gray-500">{label}</div>
                </div>
            </div>
        </div>
    );
}

function IssueRow({ issue, onClick }) {
    const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.status !== 'DONE';

    const getStatusBadge = (status, statusName, statusColor) => {
        const colors = {
            'TODO': 'bg-gray-100 text-gray-700',
            'IN_PROGRESS': 'bg-blue-100 text-blue-700',
            'IN_REVIEW': 'bg-purple-100 text-purple-700',
            'DONE': 'bg-green-100 text-green-700',
        };
        const colorClass = colors[status] || 'bg-gray-100 text-gray-700';

        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                {statusName || status}
            </span>
        );
    };

    return (
        <tr
            onClick={onClick}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
        >
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div>
                        <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                            {issue.issueKey}
                        </span>
                        <span className="font-medium text-gray-900">{issue.title}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-sm">
                    <i className="fa-solid fa-folder text-xs" />
                    {issue.projectName}
                </span>
            </td>
            <td className="px-6 py-4">
                {getStatusBadge(issue.status, issue.statusName, issue.statusColor)}
            </td>
            <td className="px-6 py-4">
                {issue.dueDate ? (
                    <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {isOverdue && <i className="fa-solid fa-exclamation-triangle mr-1" />}
                        {new Date(issue.dueDate).toLocaleDateString('vi-VN')}
                    </span>
                ) : (
                    <span className="text-gray-400">—</span>
                )}
            </td>
            <td className="px-6 py-4">
                {issue.assigneeName ? (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {issue.assigneeName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{issue.assigneeName}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">Chưa giao</span>
                )}
            </td>
        </tr>
    );
}
