import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';
import IssueDetailModal from '../components/IssueDetailModal';

// Reusing IssueRow logic or similar
function IssueRow({ issue, onClick }) {
    const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.statusName !== 'Done';

    const getStatusBadge = (statusName) => {
        const colors = {
            'To Do': 'bg-gray-100 text-gray-700',
            'In Progress': 'bg-indigo-100 text-indigo-700',
            'Review': 'bg-purple-100 text-purple-700',
            'Done': 'bg-green-100 text-green-700',
        };
        const colorClass = colors[statusName] || 'bg-gray-100 text-gray-700';

        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                {statusName}
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
                {getStatusBadge(issue.statusName)}
            </td>
            <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs ${issue.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                    issue.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        issue.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                    }`}>
                    {issue.priority}
                </span>
            </td>
            <td className="px-6 py-4">
                {issue.dueDate ? (
                    <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {isOverdue && <i className="fa-solid fa-exclamation-triangle mr-1" />}
                        {formatDate(issue.dueDate)}
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

export default function IssueListTab({ projectId }) {
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const queryClient = useQueryClient();

    // Fetch project issues
    const { data: issuesData, isLoading } = useQuery({
        queryKey: ['project-issues', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId))).data,
    });

    const allIssues = issuesData?.content || [];

    // Extract unique filter options from data
    const statusOptions = [...new Set(allIssues.map(i => i.statusName).filter(Boolean))];
    const priorityOptions = [...new Set(allIssues.map(i => i.priority).filter(Boolean))];
    const assigneeOptions = [...new Set(allIssues.map(i => i.assigneeName).filter(Boolean))];

    // Apply filters
    const issues = allIssues.filter(issue => {
        if (search && !issue.title?.toLowerCase().includes(search.toLowerCase()) &&
            !issue.issueKey?.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterStatus && issue.statusName !== filterStatus) return false;
        if (filterPriority && issue.priority !== filterPriority) return false;
        if (filterAssignee && issue.assigneeName !== filterAssignee) return false;
        return true;
    });

    const hasFilters = search || filterStatus || filterPriority || filterAssignee;

    const clearFilters = () => {
        setSearch('');
        setFilterStatus('');
        setFilterPriority('');
        setFilterAssignee('');
    };

    const handleCloseModal = () => {
        setSelectedIssue(null);
        queryClient.invalidateQueries(['project-issues', projectId]);
    };

    const priorityLabels = { CRITICAL: 'Khẩn cấp', HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' };

    return (
        <div className="space-y-4">
            {/* Toolbar with Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Tìm theo tên hoặc mã..."
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                        <option value="">Tất cả trạng thái</option>
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Priority Filter */}
                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                        <option value="">Tất cả ưu tiên</option>
                        {priorityOptions.map(p => <option key={p} value={p}>{priorityLabels[p] || p}</option>)}
                    </select>

                    {/* Assignee Filter */}
                    <select
                        value={filterAssignee}
                        onChange={(e) => setFilterAssignee(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                        <option value="">Tất cả người thực hiện</option>
                        {assigneeOptions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    {/* Clear Filters */}
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <i className="fa-solid fa-times" />
                            Xóa bộ lọc
                        </button>
                    )}
                </div>

                {/* Result count */}
                <div className="text-gray-500 text-sm">
                    Hiển thị {issues.length}{hasFilters ? ` / ${allIssues.length}` : ''} công việc
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Task</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Ưu tiên</th>
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
                            ) : issues.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-3" />
                                        <p className="font-medium">Không có task nào</p>
                                        <p className="text-sm mt-1">Các task của dự án sẽ xuất hiện ở đây</p>
                                    </td>
                                </tr>
                            ) : (
                                issues.map((issue) => (
                                    <IssueRow
                                        key={issue.issueId}
                                        issue={issue}
                                        onClick={() => setSelectedIssue(issue)}
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
