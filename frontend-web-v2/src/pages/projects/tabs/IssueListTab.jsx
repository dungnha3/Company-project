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
            {/* Score cells */}
            <ScoreCell value={issue.aiScore} color="text-indigo-600" bg="bg-indigo-50" />
            <ScoreCell value={issue.humanScore} color="text-purple-600" bg="bg-purple-50" />
            <ScoreCell value={issue.totalScore} color={issue.totalScore >= 8 ? 'text-green-600' : issue.totalScore >= 6 ? 'text-amber-600' : 'text-red-500'} bg="bg-gray-50" bold />
            <CoeffCell value={issue.priorityCoefficient} color="text-red-600" />
            <CoeffCell value={issue.timelineCoefficient} color="text-blue-600" />
            <CoeffCell value={issue.complexityCoefficient} color="text-purple-600" />
            <CoeffCell value={issue.qualityCoefficient} color="text-green-600" />
            <ReworkCell count={issue.reworkCount} />
        </tr>
    );
}

// ─── Score Cell ───────────────────────────────────────────────────────────
function ScoreCell({ value, color, bg, bold }) {
    if (value == null) return <td className="px-6 py-4 text-center text-gray-300">—</td>;
    return (
        <td className="px-6 py-4 text-center">
            <span className={`inline-flex items-center justify-center min-w-[36px] px-1.5 py-0.5 rounded-md text-xs font-semibold ${color} ${bg} ${bold ? 'font-black' : ''}`}>
                {Number(value).toFixed(1)}
            </span>
        </td>
    );
}

// ─── Coefficient Cell ─────────────────────────────────────────────────────
function CoeffCell({ value, color }) {
    if (value == null) return <td className="px-6 py-4 text-center text-gray-300">—</td>;
    return (
        <td className="px-6 py-4 text-center">
            <span className={`text-xs font-bold ${color}`} title={`Hệ số: ${Number(value).toFixed(2)}`}>
                {Number(value).toFixed(1)}
            </span>
        </td>
    );
}

// ─── Rework Cell ──────────────────────────────────────────────────────────
function ReworkCell({ count }) {
    if (!count || count === 0) return <td className="px-6 py-4 text-center text-gray-300">—</td>;
    return (
        <td className="px-6 py-4 text-center">
            <span className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-600" title={`Rework ${count} lần (-${count * 5}%)`}>
                <i className="fa-solid fa-rotate-right text-[9px]" />
                {count}
            </span>
        </td>
    );
}

export default function IssueListTab({ projectId }) {
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize] = useState(15);
    const queryClient = useQueryClient();

    // Fetch all issues (client-side filter + pagination)
    const { data: allIssuesRaw = [], isLoading } = useQuery({
        queryKey: ['project-issues-all', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId), { params: { size: 1000 } });
            const d = res.data;
            return Array.isArray(d) ? d : (d?.content || []);
        },
    });

    // Extract unique filter options from all data
    const statusOptions = [...new Set(allIssuesRaw.map(i => i.statusName).filter(Boolean))];
    const priorityOptions = [...new Set(allIssuesRaw.map(i => i.priority).filter(Boolean))];
    const assigneeOptions = [...new Set(allIssuesRaw.map(i => i.assigneeName).filter(Boolean))];

    // Apply filters
    const filteredIssues = allIssuesRaw.filter(issue => {
        if (search && !issue.title?.toLowerCase().includes(search.toLowerCase()) &&
            !issue.issueKey?.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterStatus && issue.statusName !== filterStatus) return false;
        if (filterPriority && issue.priority !== filterPriority) return false;
        if (filterAssignee && issue.assigneeName !== filterAssignee) return false;
        return true;
    });

    const totalElements = filteredIssues.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
    const paginatedIssues = filteredIssues.slice(page * pageSize, (page + 1) * pageSize);

    const hasFilters = search || filterStatus || filterPriority || filterAssignee;

    // Reset to page 0 whenever filters change
    const handleFilterChange = (setter) => (e) => {
        setter(e.target.value);
        setPage(0);
    };

    const clearFilters = () => {
        setSearch('');
        setFilterStatus('');
        setFilterPriority('');
        setFilterAssignee('');
        setPage(0);
    };

    const handleCloseModal = () => {
        setSelectedIssue(null);
        queryClient.invalidateQueries(['project-issues', projectId]);
    };

    const priorityLabels = { CRITICAL: 'Khẩn cấp', HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp' };

    return (
        <div className="space-y-4">
            {/* Header + Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
                {/* Toolbar header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <i className="fa-solid fa-list-check text-gray-400 text-sm" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Danh sách công việc</p>
                            <p className="text-[10px] text-gray-500">{allIssuesRaw.length} công việc</p>
                        </div>
                    </div>
                </div>

                {/* Filters row */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                            placeholder="Tìm theo tên hoặc mã..."
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={handleFilterChange(setFilterStatus)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                    >
                        <option value="">Tất cả trạng thái</option>
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Priority Filter */}
                    <select
                        value={filterPriority}
                        onChange={handleFilterChange(setFilterPriority)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                    >
                        <option value="">Tất cả ưu tiên</option>
                        {priorityOptions.map(p => <option key={p} value={p}>{priorityLabels[p] || p}</option>)}
                    </select>

                    {/* Assignee Filter */}
                    <select
                        value={filterAssignee}
                        onChange={handleFilterChange(setFilterAssignee)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
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
                    Hiển thị {paginatedIssues.length}{hasFilters ? ` / ${totalElements}` : ` / ${allIssuesRaw.length}`} công việc
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ưu tiên</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Hạn chót</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Người thực hiện</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase" title="AI Score">AI</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase" title="Human Score">Human</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase" title="Total Score">Total</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-indigo-500 uppercase" title="Priority Coefficient">P</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-blue-500 uppercase" title="Timeline Coefficient">T</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-purple-500 uppercase" title="Complexity Coefficient">C</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-green-500 uppercase" title="Quality Coefficient">Q</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase" title="Rework Count">RW</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="13" className="px-6 py-12 text-center text-gray-500">
                                        <i className="fa-solid fa-spinner fa-spin text-xl text-indigo-500" />
                                        <p className="mt-2">Đang tải...</p>
                                    </td>
                                </tr>
                            ) : paginatedIssues.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="px-6 py-12 text-center text-gray-500">
                                        <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-3" />
                                        <p className="font-medium">Không có task nào</p>
                                        <p className="text-sm mt-1">{hasFilters ? 'Không có task nào phù hợp với bộ lọc' : 'Các task của dự án sẽ xuất hiện ở đây'}</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedIssues.map((issue) => (
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

            {/* Pagination */}
            {(totalPages > 1 || totalElements > pageSize) && (
                <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Hiển thị <span className="font-medium text-gray-700">{page * pageSize + 1}</span>
                        –<span className="font-medium text-gray-700">{Math.min((page + 1) * pageSize, totalElements)}</span>
                        {' '}trong <span className="font-medium text-gray-700">{totalElements}</span> công việc
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <i className="fa-solid fa-chevron-left text-xs" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let pageNum = i;
                            if (totalPages > 7) {
                                if (page <= 3) pageNum = i;
                                else if (page >= totalPages - 3) pageNum = totalPages - 7 + i;
                                else pageNum = page - 3 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === pageNum ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                                >
                                    {pageNum + 1}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <i className="fa-solid fa-chevron-right text-xs" />
                        </button>
                    </div>
                </div>
            )}

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
