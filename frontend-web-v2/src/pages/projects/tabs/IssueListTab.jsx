import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate } from '@shared/utils/formatters';
import IssueDetailModal from '../components/IssueDetailModal';

// Reusing IssueRow logic or similar
function IssueRow({ issue, onClick }) {
    const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.status !== 'DONE';

    const getStatusBadge = (status, statusName) => {
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
                {getStatusBadge(issue.status, issue.statusName)}
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
    const queryClient = useQueryClient();

    // Fetch project issues
    const { data: issuesData, isLoading } = useQuery({
        queryKey: ['project-issues', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId))).data,
    });

    const issues = issuesData?.content || [];

    const handleCloseModal = () => {
        setSelectedIssue(null);
        queryClient.invalidateQueries(['project-issues', projectId]);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar if needed */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="text-gray-500 text-sm">Hiển thị {issues.length} công việc</div>
                <div className="flex gap-2">
                    {/* Filters can go here */}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
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
