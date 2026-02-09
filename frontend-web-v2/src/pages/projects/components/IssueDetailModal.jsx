import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import TimeLogSection from './TimeLogSection';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate, formatDateTime } from '@shared/utils/formatters';

const STATUSES = [
    { value: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-700' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-100 text-purple-700' },
    { value: 'DONE', label: 'Done', color: 'bg-green-100 text-green-700' },
];

const PRIORITIES = [
    { value: 'LOW', label: 'Low', icon: 'fa-arrow-down', color: 'text-gray-500' },
    { value: 'MEDIUM', label: 'Medium', icon: 'fa-minus', color: 'text-blue-500' },
    { value: 'HIGH', label: 'High', icon: 'fa-arrow-up', color: 'text-orange-500' },
    { value: 'CRITICAL', label: 'Critical', icon: 'fa-fire', color: 'text-red-500' },
];

export default function IssueDetailModal({ issue, onClose, onUpdate }) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('details'); // details | comments | timelogs
    const [newComment, setNewComment] = useState('');

    // Fetch full issue details
    const { data: fullIssue, isLoading } = useQuery({
        queryKey: ['issue', issue?.issueId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ISSUES.BY_ID(issue.issueId))).data,
        enabled: !!issue?.issueId,
        initialData: issue,
    });

    // Fetch project members for assignee
    const { data: members = [] } = useQuery({
        queryKey: ['projectMembers', fullIssue?.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(fullIssue.projectId))).data,
        enabled: !!fullIssue?.projectId,
    });

    // Fetch comments
    const { data: comments = [] } = useQuery({
        queryKey: ['issueComments', issue?.issueId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.COMMENTS.BY_ISSUE(issue.issueId))).data,
        enabled: !!issue?.issueId && activeTab === 'comments',
    });

    // Update status mutation
    const statusMutation = useMutation({
        mutationFn: async (newStatus) => {
            await apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS(issue.issueId), { status: newStatus });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật trạng thái');
            queryClient.invalidateQueries(['issue', issue.issueId]);
            queryClient.invalidateQueries(['myIssues']);
            onUpdate?.();
        },
    });

    // Assign mutation
    const assignMutation = useMutation({
        mutationFn: async (assigneeId) => {
            await apiClient.patch(ENDPOINTS.ISSUES.ASSIGN(issue.issueId), { assigneeId });
        },
        onSuccess: () => {
            toast.success('Đã giao việc');
            queryClient.invalidateQueries(['issue', issue.issueId]);
            onUpdate?.();
        },
    });

    // Add comment mutation
    const commentMutation = useMutation({
        mutationFn: async (content) => {
            await apiClient.post(ENDPOINTS.COMMENTS.CREATE, {
                issueId: issue.issueId,
                content: content.trim(),
            });
        },
        onSuccess: () => {
            setNewComment('');
            queryClient.invalidateQueries(['issueComments', issue.issueId]);
        },
    });

    if (!issue) return null;

    const currentIssue = fullIssue || issue;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 pt-8 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 mb-10 shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/20 text-white px-2 py-1 rounded-md text-sm font-mono">
                            {currentIssue.issueKey || `#${currentIssue.issueId}`}
                        </span>
                        <span className="text-white/80 text-sm">|</span>
                        <span className="text-white font-medium truncate max-w-md">{currentIssue.projectName}</span>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                {/* Title & Quick Actions */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{currentIssue.title || currentIssue.subject}</h2>

                    <div className="flex flex-wrap gap-4">
                        {/* Status Dropdown */}
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs text-gray-500 mb-1">Trạng thái</label>
                            <select
                                value={currentIssue.status || 'TODO'}
                                onChange={(e) => statusMutation.mutate(e.target.value)}
                                disabled={statusMutation.isPending}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs text-gray-500 mb-1">Độ ưu tiên</label>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                                <i className={`fa-solid ${PRIORITIES.find(p => p.value === currentIssue.priority)?.icon || 'fa-minus'} ${PRIORITIES.find(p => p.value === currentIssue.priority)?.color || 'text-gray-500'}`} />
                                <span>{PRIORITIES.find(p => p.value === currentIssue.priority)?.label || 'Medium'}</span>
                            </div>
                        </div>

                        {/* Assignee Dropdown */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-gray-500 mb-1">Người thực hiện</label>
                            <select
                                value={currentIssue.assigneeId || ''}
                                onChange={(e) => assignMutation.mutate(e.target.value || null)}
                                disabled={assignMutation.isPending}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Chưa giao --</option>
                                {members.map(m => (
                                    <option key={m.userId} value={m.userId}>
                                        {m.username || m.fullName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Due Date */}
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs text-gray-500 mb-1">Hạn chót</label>
                            <div className={`px-3 py-2 bg-gray-50 rounded-lg text-sm ${currentIssue.dueDate && new Date(currentIssue.dueDate) < new Date() ? 'text-red-600' : 'text-gray-700'}`}>
                                {currentIssue.dueDate ? formatDate(currentIssue.dueDate) : '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
                    {[
                        { id: 'details', label: 'Chi tiết', icon: 'fa-file-lines' },
                        { id: 'comments', label: 'Bình luận', icon: 'fa-comments' },
                        { id: 'activity', label: 'Lịch sử', icon: 'fa-history' },
                        { id: 'timelogs', label: 'Time Logs', icon: 'fa-clock' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors
                                ${activeTab === tab.id
                                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className={`fa-solid ${tab.icon}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 min-h-[300px] max-h-[400px] overflow-y-auto">
                    {activeTab === 'details' && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Mô tả</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">
                                    {currentIssue.description || <span className="italic text-gray-400">Không có mô tả</span>}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                                <div>
                                    <span className="text-xs text-gray-500">Người tạo</span>
                                    <div className="text-sm font-medium text-gray-900">{currentIssue.reporterName || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500">Ngày tạo</span>
                                    <div className="text-sm font-medium text-gray-900">
                                        {currentIssue.createdAt ? formatDate(currentIssue.createdAt) : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500">Ước tính</span>
                                    <div className="text-sm font-medium text-gray-900">{currentIssue.estimatedHours || 0}h</div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500">Đã log</span>
                                    <div className="text-sm font-medium text-gray-900">{currentIssue.loggedHours || 0}h</div>
                                </div>
                            </div>

                            {/* Custom Fields Section */}
                            <CustomFieldsSection
                                projectId={currentIssue.projectId}
                                issueId={currentIssue.issueId}
                                initialValues={currentIssue.customFieldValues || {}}
                            />
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="space-y-4">
                            {/* Add Comment */}
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
                                    U
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Thêm bình luận..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        rows={2}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={() => commentMutation.mutate(newComment)}
                                            disabled={!newComment.trim() || commentMutation.isPending}
                                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {commentMutation.isPending ? 'Đang gửi...' : 'Gửi'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Comments List */}
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                {comments.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">Chưa có bình luận nào</p>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.commentId} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs shrink-0">
                                                {comment.authorName?.charAt(0) || 'U'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-gray-900">{comment.authorName}</span>
                                                    <span className="text-xs text-gray-400">
                                                        {formatDateTime(comment.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'timelogs' && (
                        <TimeLogSection
                            issueId={currentIssue.issueId}
                            estimatedHours={currentIssue.estimatedHours || 0}
                        />
                    )}

                    {activeTab === 'activity' && (
                        <ActivityLogTab issueId={currentIssue.issueId} />
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

// Custom Fields Section Component
function CustomFieldsSection({ projectId, issueId, initialValues }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [values, setValues] = useState(initialValues);

    // Fetch custom field definitions
    const { data: fields = [], isLoading } = useQuery({
        queryKey: ['customFields', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CUSTOM_FIELDS.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });

    // Update value mutation
    const updateMutation = useMutation({
        mutationFn: async ({ fieldId, value }) => {
            // Assuming endpoint to update specific custom field value or all values
            // Here we use a hypothetical endpoint. If it fails, we fall back to generic issue update if applicable.
            // Using the endpoint defined in endpoints.js: ISSUE_VALUES
            await apiClient.put(ENDPOINTS.CUSTOM_FIELDS.ISSUE_VALUES(issueId), {
                [fieldId]: value
            });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật trường tùy chỉnh');
            queryClient.invalidateQueries(['issue', issueId]);
        },
        onError: () => toast.error('Lỗi cập nhật trường tùy chỉnh')
    });

    const handleChange = (fieldId, value) => {
        setValues(prev => ({ ...prev, [fieldId]: value }));
        // Debounce or auto-save could be added here. For now, we save on blur or selection.
        if (value !== values[fieldId]) {
            updateMutation.mutate({ fieldId, value });
        }
    };

    if (isLoading) return <div className="py-4 text-center text-xs text-gray-400">Đang tải trường tùy chỉnh...</div>;
    if (!fields.length) return null;

    return (
        <div className="pt-4 border-t border-gray-100 mt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Thông tin thêm</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fields.map(field => (
                    <div key={field.id} className="space-y-1">
                        <label className="text-xs text-gray-500 block">{field.name}</label>
                        {field.type === 'TEXT' && (
                            <input
                                type="text"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                value={values[field.id] || ''}
                                onBlur={(e) => handleChange(field.id, e.target.value)}
                                onChange={(e) => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                            />
                        )}
                        {field.type === 'NUMBER' && (
                            <input
                                type="number"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                value={values[field.id] || ''}
                                onBlur={(e) => handleChange(field.id, e.target.value)}
                                onChange={(e) => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                            />
                        )}
                        {field.type === 'DATE' && (
                            <input
                                type="date"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                value={values[field.id] || ''}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                            />
                        )}
                        {field.type === 'DROPDOWN' && (
                            <select
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                value={values[field.id] || ''}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                            >
                                <option value="">-- Chọn --</option>
                                {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ActivityLogTab({ issueId }) {
    const { data: activities = [], isLoading } = useQuery({
        queryKey: ['issueActivities', issueId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ACTIVITIES.BY_ISSUE(issueId))).data?.content || [],
        enabled: !!issueId,
    });

    const getActivityIcon = (type) => {
        const icons = {
            CREATED: 'fa-plus-circle text-green-500',
            STATUS_CHANGED: 'fa-arrow-right text-blue-500',
            ASSIGNEE_CHANGED: 'fa-user text-purple-500',
            PRIORITY_CHANGED: 'fa-flag text-orange-500',
            SPRINT_CHANGED: 'fa-layer-group text-indigo-500',
            DUE_DATE_CHANGED: 'fa-calendar text-red-500',
            COMMENT_ADDED: 'fa-comment text-gray-500',
            ESTIMATED_HOURS_CHANGED: 'fa-clock text-cyan-500',
        };
        return icons[type] || 'fa-circle text-gray-400';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400" />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <i className="fa-solid fa-history text-3xl mb-2" />
                <p>Chưa có hoạt động nào</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
                {activities.map((activity) => (
                    <div key={activity.activityId} className="flex gap-4 pl-8 relative">
                        {/* Icon */}
                        <div className="absolute left-2 w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                            <i className={`fa-solid ${getActivityIcon(activity.activityType)} text-[10px]`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">{activity.userName || 'User'}</span>
                                <span className="text-xs text-gray-400">
                                    {formatDateTime(activity.createdAt)}
                                </span>
                            </div>
                            <p className="text-gray-600">{activity.description}</p>
                            {activity.oldValue && activity.newValue && (
                                <div className="mt-2 text-xs flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded line-through">{activity.oldValue}</span>
                                    <i className="fa-solid fa-arrow-right text-gray-400" />
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{activity.newValue}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

