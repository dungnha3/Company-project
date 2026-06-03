import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import TimeLogSection from './TimeLogSection';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate, formatDateTime } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';

const STATUSES = [
    { value: 1, label: 'Chờ xử lý', color: 'bg-gray-100 text-gray-700' },
    { value: 2, label: 'Đang thực hiện', color: 'bg-indigo-100 text-indigo-700' },
    { value: 3, label: 'Đang review', color: 'bg-purple-100 text-purple-700' },
    { value: 4, label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
];

const PRIORITIES = [
    { value: 'LOW', label: 'Thấp', icon: 'fa-arrow-down', color: 'text-gray-500' },
    { value: 'MEDIUM', label: 'Trung bình', icon: 'fa-minus', color: 'text-indigo-500' },
    { value: 'HIGH', label: 'Cao', icon: 'fa-arrow-up', color: 'text-orange-500' },
    { value: 'CRITICAL', label: 'Khẩn cấp', icon: 'fa-fire', color: 'text-red-500' },
];

const ISSUE_TYPES = [
    { value: 'TASK', label: 'Task', icon: 'fa-check', color: 'bg-indigo-500' },
    { value: 'BUG', label: 'Bug', icon: 'fa-bug', color: 'bg-red-500' },
    { value: 'STORY', label: 'Story', icon: 'fa-bookmark', color: 'bg-green-500' },
    { value: 'EPIC', label: 'Epic', icon: 'fa-bolt', color: 'bg-purple-500' },
];

export default function IssueDetailModal({ issue, onClose, onUpdate }) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('details'); // details | comments | activity
    const [newComment, setNewComment] = useState('');
    const [timelogKey, setTimelogKey] = useState(0); // Increment to force TimeLogSection refresh

    const { hasPermission } = useAccessControl();
    const canManageIssues = hasPermission('PROJECT.MANAGE_ISSUES');

    // Listen for timelog-updated events (e.g. from auto-stop on task completion)
    useEffect(() => {
        const handler = (e) => {
            if (!e.detail?.issueId || e.detail.issueId === issue?.issueId) {
                setTimelogKey(k => k + 1);
            }
        };
        window.addEventListener('timelog-updated', handler);
        return () => window.removeEventListener('timelog-updated', handler);
    }, [issue?.issueId]);

    // Fetch full issue details
    const { data: fullIssue, isLoading } = useQuery({
        queryKey: ['issue', issue?.issueId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ISSUES.BY_ID(issue.issueId))).data,
        enabled: !!issue?.issueId,
    });

    // Fetch project members for assignee
    const { data: members = [] } = useQuery({
        queryKey: ['projectMembers', fullIssue?.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(fullIssue.projectId))).data,
        enabled: !!fullIssue?.projectId,
    });

    // Fetch comments (backend returns Page object with .content array)
    const { data: comments = [] } = useQuery({
        queryKey: ['issueComments', issue?.issueId],
        queryFn: async () => {
            const res = (await apiClient.get(ENDPOINTS.COMMENTS.BY_ISSUE(issue.issueId))).data;
            return res?.content || (Array.isArray(res) ? res : []);
        },
        enabled: !!issue?.issueId && activeTab === 'comments',
    });

    const statusMutation = useMutation({
        mutationFn: async (statusId) => {
            await apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS_TO(issue.issueId, statusId));
        },
        onMutate: async (statusId) => {
            await queryClient.cancelQueries({ queryKey: ['issue', issue.issueId] });
            const snapshot = queryClient.getQueryData(['issue', issue.issueId]);
            queryClient.setQueryData(['issue', issue.issueId], (old) =>
                old ? { ...old, statusId, statusName: STATUSES.find(s => s.value === statusId)?.label } : old
            );
            return { snapshot };
        },
        onError: (err, vars, context) => {
            toast.error('Không thể cập nhật trạng thái');
            if (context?.snapshot) {
                queryClient.setQueryData(['issue', issue.issueId], context.snapshot);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issue', issue.issueId] });
            queryClient.invalidateQueries({ queryKey: ['myIssues'] });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật trạng thái');
            onUpdate?.();
        },
    });

    // Assign mutation
    const assignMutation = useMutation({
        mutationFn: async (assigneeId) => {
            await apiClient.patch(ENDPOINTS.ISSUES.ASSIGN(issue.issueId, assigneeId));
        },
        onMutate: async (assigneeId) => {
            await queryClient.cancelQueries({ queryKey: ['issue', issue.issueId] });
            const snapshot = queryClient.getQueryData(['issue', issue.issueId]);
            const member = members.find(m => String(m.userId) === String(assigneeId));
            queryClient.setQueryData(['issue', issue.issueId], (old) =>
                old ? { ...old, assigneeId, assigneeName: assigneeId ? (member?.username || member?.fullName || 'User') : null } : old
            );
            return { snapshot };
        },
        onError: (err, vars, context) => {
            toast.error('Không thể giao việc');
            if (context?.snapshot) {
                queryClient.setQueryData(['issue', issue.issueId], context.snapshot);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issue', issue.issueId] });
        },
        onSuccess: () => {
            toast.success('Đã giao việc');
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
        onMutate: async (content) => {
            await queryClient.cancelQueries({ queryKey: ['issueComments', issue.issueId] });
            const snapshot = queryClient.getQueryData(['issueComments', issue.issueId]);
            const optimisticComment = {
                commentId: `temp-${Date.now()}`,
                content,
                authorName: 'Bạn',
                createdAt: new Date().toISOString(),
                _optimistic: true,
            };
            queryClient.setQueryData(['issueComments', issue.issueId], (old = []) => [...old, optimisticComment]);
            setNewComment('');
            return { snapshot };
        },
        onError: (err, vars, context) => {
            if (context?.snapshot !== undefined) {
                queryClient.setQueryData(['issueComments', issue.issueId], context.snapshot);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issueComments', issue.issueId] });
        },
    });

    // File upload mutation
    const fileInputRef = useRef(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const uploadFileMutation = useMutation({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            await apiClient.post(ENDPOINTS.STORAGE.UPLOAD_ISSUE_FILE(issue.issueId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onMutate: () => setUploadingFile(true),
        onSettled: () => setUploadingFile(false),
        onSuccess: () => {
            toast.success('Đã tải file lên');
            queryClient.invalidateQueries(['issueFiles', issue.issueId]);
        },
        onError: () => toast.error('Lỗi khi tải file lên'),
    });

    // Delete file mutation
    const deleteFileMutation = useMutation({
        mutationFn: async (fileId) => {
            await apiClient.delete(ENDPOINTS.STORAGE.DELETE_FILE(fileId));
        },
        onSuccess: () => {
            toast.success('Đã xóa file');
            queryClient.invalidateQueries(['issueFiles', issue.issueId]);
        },
        onError: () => toast.error('Lỗi khi xóa file'),
    });

    // Fetch issue files
    const { data: issueFiles = [] } = useQuery({
        queryKey: ['issueFiles', issue.issueId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.ISSUE_FILES(issue.issueId))).data,
        enabled: activeTab === 'files',
    });

    // Update full issue mutation
    const updateIssueMutation = useMutation({
        mutationFn: async (payload) => {
            const currentIssue = fullIssue || issue;
            await apiClient.put(ENDPOINTS.ISSUES.BY_ID(issue.issueId), {
                title: currentIssue.title || currentIssue.subject,
                description: currentIssue.description,
                statusId: currentIssue.statusId,
                priority: currentIssue.priority,
                issueType: currentIssue.issueType,
                assigneeId: currentIssue.assigneeId,
                estimatedHours: currentIssue.estimatedHours,
                actualHours: currentIssue.actualHours,
                startDate: currentIssue.startDate,
                dueDate: currentIssue.dueDate,
                weight: currentIssue.weight,
                isImportant: currentIssue.isImportant || false,
                isUrgent: currentIssue.isUrgent || false,
                ...payload
            });
        },
        onMutate: async (payload) => {
            await queryClient.cancelQueries({ queryKey: ['issue', issue.issueId] });
            const snapshot = queryClient.getQueryData(['issue', issue.issueId]);
            queryClient.setQueryData(['issue', issue.issueId], (old) =>
                old ? { ...old, ...payload } : old
            );
            return { snapshot };
        },
        onError: (err, vars, context) => {
            toast.error('Không thể cập nhật thẻ');
            if (context?.snapshot) {
                queryClient.setQueryData(['issue', issue.issueId], context.snapshot);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issue', issue.issueId] });
            queryClient.invalidateQueries({ queryKey: ['myIssues'] });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật thẻ');
            onUpdate?.();
        },
    });

    // Delete issue mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            await apiClient.delete(`/api/issues/${issue.issueId}`);
        },
        onMutate: async () => {
            const snapshotProjectIssues = queryClient.getQueryData(['projectIssues']);
            const snapshotProjectBacklog = queryClient.getQueryData(['projectBacklog']);
            const snapshotSprintIssues = queryClient.getQueryData(['sprintIssues']);
            const snapshotMyIssues = queryClient.getQueryData(['myIssues']);
            const snapshotIssues = queryClient.getQueryData(['issues']);
            return { snapshotProjectIssues, snapshotProjectBacklog, snapshotSprintIssues, snapshotMyIssues, snapshotIssues };
        },
        onError: (err, vars, context) => {
            toast.error('Lỗi khi xóa công việc');
            if (context) {
                if (context.snapshotProjectIssues) queryClient.setQueryData(['projectIssues'], context.snapshotProjectIssues);
                if (context.snapshotProjectBacklog) queryClient.setQueryData(['projectBacklog'], context.snapshotProjectBacklog);
                if (context.snapshotSprintIssues) queryClient.setQueryData(['sprintIssues'], context.snapshotSprintIssues);
                if (context.snapshotMyIssues) queryClient.setQueryData(['myIssues'], context.snapshotMyIssues);
                if (context.snapshotIssues) queryClient.setQueryData(['issues'], context.snapshotIssues);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['projectIssues'] });
            queryClient.invalidateQueries({ queryKey: ['projectBacklog'] });
            queryClient.invalidateQueries({ queryKey: ['sprintIssues'] });
            queryClient.invalidateQueries({ queryKey: ['myIssues'] });
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
        onSuccess: () => {
            toast.success('Đã xóa công việc');
            onUpdate?.();
            onClose();
        },
    });

    const handleDelete = () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa công việc này không? Mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn.')) {
            deleteMutation.mutate();
        }
    };

    if (!issue) return null;

    const currentIssue = fullIssue || issue;

    return (
        <div className="modal-overlay items-start pt-8 overflow-y-auto" onClick={onClose}>
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl w-full max-w-4xl mx-4 mb-10 shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <span className="bg-white/20 text-white px-2 py-1 rounded-md text-sm font-mono">
                            {currentIssue.issueKey || `#${currentIssue.issueId}`}
                        </span>
                        <span className="text-white/80 text-sm">|</span>
                        <select
                            value={currentIssue.issueType || 'TASK'}
                            onChange={(e) => canManageIssues && updateIssueMutation.mutate({ issueType: e.target.value })}
                            disabled={!canManageIssues || updateIssueMutation.isPending}
                            className={`bg-transparent text-white font-medium text-sm border-none focus:ring-0 cursor-pointer hover:bg-white/10 rounded px-1 -ml-1 appearance-none ${!canManageIssues ? 'opacity-50' : ''}`}
                            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                        >
                            {ISSUE_TYPES.map(t => (
                                <option key={t.value} value={t.value} className="text-gray-900 bg-white">{t.label}</option>
                            ))}
                        </select>
                        <span className="text-white font-medium truncate max-w-md ml-2">{currentIssue.projectName}</span>
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
                                value={currentIssue.statusId || 1}
                                onChange={(e) => canManageIssues && statusMutation.mutate(Number(e.target.value))}
                                disabled={!canManageIssues || statusMutation.isPending}
                                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-300 ${!canManageIssues ? 'bg-gray-50' : ''}`}
                            >
                                {STATUSES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs text-gray-500 mb-1">Độ ưu tiên</label>
                            <select
                                value={currentIssue.priority || 'MEDIUM'}
                                onChange={(e) => canManageIssues && updateIssueMutation.mutate({ priority: e.target.value })}
                                disabled={!canManageIssues || updateIssueMutation.isPending}
                                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-300 ${!canManageIssues ? 'bg-gray-50' : ''}`}
                            >
                                {PRIORITIES.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Assignee Dropdown */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs text-gray-500 mb-1">Người thực hiện</label>
                            <select
                                value={currentIssue.assigneeId || ''}
                                onChange={(e) => canManageIssues && assignMutation.mutate(e.target.value || null)}
                                disabled={!canManageIssues || assignMutation.isPending}
                                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-300 ${!canManageIssues ? 'bg-gray-50' : ''}`}
                            >
                                <option value="">-- Chưa giao --</option>
                                {members.map(m => (
                                    <option key={m.userId} value={m.userId}>
                                        {m.fullName || m.username} ({m.position || 'Thành viên'}) | Phân bổ: {m.allocationRate || 0}% | Task: {m.completedIssues || 0}/{m.totalIssues || 0} {m.allocationRate > 100 ? '⚠️ Quá tải' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sprint & Due Date Row */}
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs text-gray-500 mb-1">Sprint</label>
                                <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                                    <i className="fa-solid fa-layer-group text-indigo-400 text-xs" />
                                    <span className={currentIssue.sprintName ? 'text-gray-700' : 'text-gray-400'}>
                                        {currentIssue.sprintName || '— Backlog'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs text-gray-500 mb-1">Hạn chót</label>
                                <div className={`px-3 py-2 bg-gray-50 rounded-lg text-sm ${currentIssue.dueDate && new Date(currentIssue.dueDate) < new Date() ? 'text-red-600' : 'text-gray-700'}`}>
                                    {currentIssue.dueDate ? formatDate(currentIssue.dueDate) : '—'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
                    {[
                        { id: 'details', label: 'Chi tiết', icon: 'fa-file-lines' },
                        { id: 'comments', label: 'Bình luận', icon: 'fa-comments' },
                        { id: 'files', label: 'Tài liệu', icon: 'fa-folder' },
                        { id: 'activity', label: 'Lịch sử', icon: 'fa-history' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors
                                ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <i className={`fa-solid ${tab.icon}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 min-h-[300px] max-h-[500px] overflow-y-auto">
                    {activeTab === 'details' && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">Mô tả</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">
                                    {currentIssue.description || <span className="italic text-gray-400">Không có mô tả</span>}
                                </p>
                            </div>

                            {/* Subtasks Section */}
                            <SubtasksSection
                                subtasks={currentIssue.subtasks || []}
                                projectId={currentIssue.projectId}
                                onUpdate={() => {
                                    queryClient.invalidateQueries(['issue', currentIssue.issueId]);
                                    onUpdate?.();
                                }}
                            />

                            {/* New Fields: Weight, Start Date, Important/Urgent, Eisenhower */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                                {/* Start Date */}
                                <div>
                                    <span className="text-xs text-gray-500">Ngày bắt đầu</span>
                                    <div className="text-sm font-medium text-gray-900">
                                        {currentIssue.startDate ? formatDate(currentIssue.startDate) : '—'}
                                    </div>
                                </div>
                                {/* Due Date */}
                                <div>
                                    <span className="text-xs text-gray-500">Hạn chót</span>
                                    <div className={`text-sm font-medium ${currentIssue.dueDate && new Date(currentIssue.dueDate) < new Date() && currentIssue.statusName !== 'Done' ? 'text-red-600' : 'text-gray-900'}`}>
                                        {currentIssue.dueDate ? formatDate(currentIssue.dueDate) : '—'}
                                    </div>
                                </div>
                                {/* Completed At */}
                                <div>
                                    <span className="text-xs text-gray-500">Hoàn thành lúc</span>
                                    <div className="text-sm font-medium text-emerald-600">
                                        {currentIssue.completedAt ? formatDateTime(currentIssue.completedAt) : '—'}
                                    </div>
                                </div>
                                {/* Weight */}
                                <div>
                                    <span className="text-xs text-gray-500">Trọng số (1-10)</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${(currentIssue.weight || 0) >= 7 ? 'bg-red-500' : (currentIssue.weight || 0) >= 4 ? 'bg-amber-500' : 'bg-green-500'}`}
                                                style={{ width: `${((currentIssue.weight || 0) / 10) * 100}%` }} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 min-w-[20px]">{currentIssue.weight || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Eisenhower + Importance/Urgency */}
                            <div className="flex flex-wrap gap-3 pt-2">
                                {currentIssue.isImportant && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 flex items-center gap-1">
                                        <i className="fa-solid fa-star text-[10px]" /> Quan trọng
                                    </span>
                                )}
                                {currentIssue.isUrgent && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                                        <i className="fa-solid fa-bolt text-[10px]" /> Khẩn cấp
                                    </span>
                                )}
                                {currentIssue.eisenhowerQuadrant && (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${currentIssue.eisenhowerQuadrant === 1 ? 'bg-red-100 text-red-700' :
                                        currentIssue.eisenhowerQuadrant === 2 ? 'bg-blue-100 text-blue-700' :
                                            currentIssue.eisenhowerQuadrant === 3 ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        <i className="fa-solid fa-grid-2 text-[10px]" />
                                        {currentIssue.eisenhowerQuadrant === 1 ? 'Làm ngay' :
                                            currentIssue.eisenhowerQuadrant === 2 ? 'Lên kế hoạch' :
                                                currentIssue.eisenhowerQuadrant === 3 ? 'Giao lại' : 'Làm sau'}
                                    </span>
                                )}
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
                                <div>
                                    <span className="text-xs text-gray-500">Thực tế</span>
                                    <div className="text-sm font-medium text-gray-900">{currentIssue.actualHours != null ? `${currentIssue.actualHours}h` : '—'}</div>
                                </div>
                            </div>

                            {/* Scoring Coefficients Panel */}
                            {currentIssue.aiScore != null || currentIssue.humanScore != null || currentIssue.totalScore != null || currentIssue.priorityCoefficient ? (
                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <i className="fa-solid fa-sliders text-indigo-500" />
                                        Hệ số & Điểm số
                                    </h3>

                                    {/* Coefficient bars */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                        {[
                                            { label: 'Hệ số ưu tiên', key: 'priorityCoefficient', color: 'bg-red-500' },
                                            { label: 'Hệ số độ phức tạp', key: 'complexityCoefficient', color: 'bg-orange-500' },
                                            { label: 'Hệ số timeline', key: 'timelineCoefficient', color: 'bg-blue-500' },
                                            { label: 'Hệ số chất lượng', key: 'qualityCoefficient', color: 'bg-green-500' },
                                            { label: 'Hệ số rework', key: 'reworkCoefficient', color: 'bg-red-400', warn: true },
                                        ].map(({ label, key, color, warn }) => {
                                            const val = currentIssue[key];
                                            if (val == null) return null;
                                            const pct = Math.min((Number(val) / 2) * 100, 100);
                                            return (
                                                <div key={key} className="bg-gray-50 rounded-lg px-3 py-2">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs text-gray-600 font-medium">{label}</span>
                                                        <span className={`text-xs font-bold ${warn && Number(val) > 0.5 ? 'text-red-500' : 'text-gray-700'}`}>
                                                            {Number(val).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* AI / Human / Total Score */}
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div className={`rounded-xl px-3 py-2.5 text-center ${currentIssue.aiScore != null ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50 border border-gray-100'}`}>
                                            <div className="text-[10px] uppercase tracking-wide text-indigo-400 font-semibold mb-1">AI Score</div>
                                            <div className={`text-xl font-black ${currentIssue.aiScore != null ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                {currentIssue.aiScore != null ? Number(currentIssue.aiScore).toFixed(1) : '—'}
                                            </div>
                                            {currentIssue.aiScore != null && <div className="text-[9px] text-indigo-300 mt-0.5">/ 10</div>}
                                        </div>
                                        <div className={`rounded-xl px-3 py-2.5 text-center ${currentIssue.humanScore != null ? 'bg-purple-50 border border-purple-100' : 'bg-gray-50 border border-gray-100'}`}>
                                            <div className="text-[10px] uppercase tracking-wide text-purple-400 font-semibold mb-1">Human Score</div>
                                            <div className={`text-xl font-black ${currentIssue.humanScore != null ? 'text-purple-600' : 'text-gray-300'}`}>
                                                {currentIssue.humanScore != null ? Number(currentIssue.humanScore).toFixed(1) : '—'}
                                            </div>
                                            {currentIssue.humanScore != null && <div className="text-[9px] text-purple-300 mt-0.5">/ 10</div>}
                                        </div>
                                        <div className={`rounded-xl px-3 py-2.5 text-center ${currentIssue.totalScore != null ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100' : 'bg-gray-50 border border-gray-100'}`}>
                                            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Total Score</div>
                                            <div className={`text-xl font-black ${currentIssue.totalScore != null ? (
                                                Number(currentIssue.totalScore) >= 8 ? 'text-green-600' :
                                                Number(currentIssue.totalScore) >= 6 ? 'text-amber-600' : 'text-red-500'
                                            ) : 'text-gray-300'}`}>
                                                {currentIssue.totalScore != null ? Number(currentIssue.totalScore).toFixed(1) : '—'}
                                            </div>
                                            {currentIssue.totalScore != null && (
                                                <div className="text-[9px] text-gray-400 mt-0.5">
                                                    {Number(currentIssue.totalScore) >= 8 ? '⭐ Xuất sắc' :
                                                     Number(currentIssue.totalScore) >= 6 ? '✓ Tốt' : '⚠ Yếu'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rework warning if any */}
                                    {(currentIssue.reworkCount || 0) > 0 && (
                                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                                            <i className="fa-solid fa-rotate-right text-red-400 text-sm" />
                                            <span className="text-xs text-red-600 font-medium">
                                                Đã bị rework <strong>{currentIssue.reworkCount} lần</strong> — bị trừ <strong>-{currentIssue.reworkCount * 5}%</strong> điểm
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {/* Custom Fields Section */}
                            {canManageIssues ? (
                                <CustomFieldsSection
                                    projectId={currentIssue.projectId}
                                    issueId={currentIssue.issueId}
                                    initialValues={currentIssue.customFieldValues || {}}
                                />
                            ) : (
                                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                    <div className="text-sm font-medium text-gray-500 mb-2">Custom Fields</div>
                                    {Object.keys(currentIssue.customFieldValues || {}).length > 0 ? (
                                        <div className="space-y-1">
                                            {Object.entries(currentIssue.customFieldValues).map(([key, val]) => (
                                                <div key={key} className="text-sm text-gray-600">
                                                    <span className="font-medium">{key}:</span> {String(val ?? '')}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400 italic">Không có custom fields</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="space-y-4">
                            {/* Add Comment */}
                            {canManageIssues ? (
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
                                    U
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Thêm bình luận..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 resize-none"
                                        rows={2}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={() => commentMutation.mutate(newComment)}
                                            disabled={!newComment.trim() || commentMutation.isPending}
                                            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {commentMutation.isPending ? 'Đang gửi...' : 'Gửi'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            ) : (
                                <div className="text-center py-3 text-sm text-gray-400 italic">Bạn không có quyền bình luận</div>
                            )}

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

                    {activeTab === 'files' && (
                        <div className="space-y-4">
                            {/* Upload area */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-700">File đính kèm</h3>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingFile}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                                >
                                    {uploadingFile ? (
                                        <><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</>
                                    ) : (
                                        <><i className="fa-solid fa-upload" /> Tải lên file</>
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) uploadFileMutation.mutate(file);
                                        e.target.value = '';
                                    }}
                                />
                            </div>

                            {/* File list */}
                            {issueFiles.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <i className="fa-solid fa-folder-open text-3xl mb-2" />
                                    <p className="text-sm">Chưa có file đính kèm</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {issueFiles.map(file => (
                                        <div key={file.id || file.fileId} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <i className={`fa-solid ${file.contentType === 'folder' ? 'fa-folder text-amber-500' : 'fa-file text-gray-400'} flex-shrink-0`} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{file.fileName}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : ''} • {file.uploadedBy?.fullName || file.uploadedByName || 'Người dùng'}
                                                        {file.createdAt ? ' • ' + new Date(file.createdAt).toLocaleDateString('vi-VN') : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = `${apiClient.defaults.baseURL}${ENDPOINTS.STORAGE.DOWNLOAD_FILE(file.id || file.fileId)}`;
                                                        link.download = file.fileName;
                                                        link.click();
                                                    }}
                                                    className="w-8 h-8 rounded-lg hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
                                                    title="Tải xuống"
                                                >
                                                    <i className="fa-solid fa-download text-xs" />
                                                </button>
                                                {canManageIssues && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Xóa file này?')) {
                                                                deleteFileMutation.mutate(file.id || file.fileId);
                                                            }
                                                        }}
                                                        className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 flex items-center justify-center transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <i className="fa-solid fa-trash text-xs" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-6">
                            <TimeLogSection
                                key={timelogKey}
                                issueId={currentIssue.issueId}
                                estimatedHours={currentIssue.estimatedHours || 0}
                                onUpdate={() => {
                                    queryClient.invalidateQueries(['issue', currentIssue.issueId]);
                                    onUpdate?.();
                                }}
                            />
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <i className="fa-solid fa-history text-indigo-500" />
                                    Nhật ký hoạt động công việc
                                </h3>
                                <ActivityLogTab issueId={currentIssue.issueId} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <div>
                        {canManageIssues && (
                            <button
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <i className="fa-solid fa-trash-can" />
                                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa công việc'}
                            </button>
                        )}
                    </div>
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
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                                value={values[field.id] || ''}
                                onBlur={(e) => handleChange(field.id, e.target.value)}
                                onChange={(e) => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                            />
                        )}
                        {field.type === 'NUMBER' && (
                            <input
                                type="number"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                                value={values[field.id] || ''}
                                onBlur={(e) => handleChange(field.id, e.target.value)}
                                onChange={(e) => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                            />
                        )}
                        {field.type === 'DATE' && (
                            <input
                                type="date"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                                value={values[field.id] || ''}
                                onChange={(e) => handleChange(field.id, e.target.value)}
                            />
                        )}
                        {field.type === 'DROPDOWN' && (
                            <select
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-indigo-500"
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
            STATUS_CHANGED: 'fa-arrow-right text-indigo-500',
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

function SubtasksSection({ subtasks, projectId, onUpdate }) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [expandedSubtaskId, setExpandedSubtaskId] = useState(null);

    const statusMutation = useMutation({
        mutationFn: async ({ subtaskId, statusId }) => {
            await apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS_TO(subtaskId, statusId));
        },
        onMutate: async ({ subtaskId, statusId }) => {
            await queryClient.cancelQueries({ queryKey: ['issue', projectId] });
            const snapshot = queryClient.getQueryData(['issue', projectId]);
            queryClient.setQueryData(['issue', projectId], (old) =>
                old ? {
                    ...old,
                    subtasks: (old.subtasks || []).map(s =>
                        s.issueId === subtaskId
                            ? { ...s, statusId, statusName: STATUS_OPTIONS.find(o => o.value === statusId)?.label }
                            : s
                    )
                } : old
            );
            return { snapshot };
        },
        onError: (err, vars, context) => {
            toast.error('Lỗi cập nhật trạng thái');
            if (context?.snapshot) {
                queryClient.setQueryData(['issue', projectId], context.snapshot);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issue', projectId] });
        },
        onSuccess: () => {
            toast.success('Đã cập nhật trạng thái');
            onUpdate?.();
        },
    });

    if (!subtasks || subtasks.length === 0) return null;

    const completedCount = subtasks.filter(s => s.statusName?.toLowerCase().includes('done') || s.statusName?.toLowerCase().includes('hoàn thành')).length;
    const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

    const STATUS_OPTIONS = [
        { value: 1, label: 'Chờ xử lý', shortLabel: 'Chờ', color: 'bg-gray-100 text-gray-600' },
        { value: 2, label: 'Đang thực hiện', shortLabel: 'Làm', color: 'bg-indigo-100 text-indigo-600' },
        { value: 3, label: 'Đang review', shortLabel: 'Review', color: 'bg-purple-100 text-purple-600' },
        { value: 4, label: 'Hoàn thành', shortLabel: 'Done', color: 'bg-green-100 text-green-600' },
    ];

    const getStatusStyle = (statusId) => {
        const found = STATUS_OPTIONS.find(s => s.value === statusId);
        return found ? found.color : 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="border border-violet-200 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600">
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-white text-xs" />
                    <span className="text-sm font-semibold text-white">Sub-tasks</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                        {subtasks.length}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-white/80 font-medium">{progress}%</span>
                    </div>
                    <span className="text-[10px] text-white/70">
                        {completedCount}/{subtasks.length} hoàn thành
                    </span>
                </div>
            </div>

            {/* Subtask rows */}
            <div className="divide-y divide-violet-100">
                {subtasks.map((subtask) => {
                    const isExpanded = expandedSubtaskId === subtask.issueId;

                    return (
                        <div key={subtask.issueId} className="hover:bg-violet-50/50 transition-colors">
                            {/* Row */}
                            <div className="flex items-center gap-3 px-4 py-2.5 pl-8">
                                {/* Expand / collapse */}
                                <button
                                    onClick={() => setExpandedSubtaskId(isExpanded ? null : subtask.issueId)}
                                    className="w-5 h-5 flex items-center justify-center text-violet-400 hover:text-violet-600 transition-colors flex-shrink-0"
                                >
                                    <i className={`fa-solid fa-chevron-right text-[9px] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>

                                {/* Status badge */}
                                <select
                                    value={subtask.statusId || 1}
                                    onChange={(e) => statusMutation.mutate({ subtaskId: subtask.issueId, statusId: Number(e.target.value) })}
                                    disabled={statusMutation.isPending}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border-0 cursor-pointer focus:ring-1 focus:ring-violet-400 ${getStatusStyle(subtask.statusId)}`}
                                >
                                    {STATUS_OPTIONS.map(s => (
                                        <option key={s.value} value={s.value}>{s.shortLabel}</option>
                                    ))}
                                </select>

                                {/* Title */}
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm text-gray-700 truncate block">{subtask.title}</span>
                                    {isExpanded && subtask.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{subtask.description}</p>
                                    )}
                                </div>

                                {/* Assignee */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {subtask.assigneeName ? (
                                        <>
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white text-[9px] font-bold">
                                                {subtask.assigneeName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs text-gray-500 max-w-[80px] truncate">
                                                {subtask.assigneeName}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Chưa giao</span>
                                    )}
                                </div>

                                {/* Issue key */}
                                <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                                    {subtask.issueKey}
                                </span>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                                <div className="px-8 pb-3 pl-12 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/60 rounded-lg p-3 border border-violet-100">
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Người tạo</span>
                                            <span className="text-xs font-medium text-gray-700">{subtask.reporterName || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Ngày tạo</span>
                                            <span className="text-xs font-medium text-gray-700">{subtask.createdAt ? formatDate(subtask.createdAt) : '—'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Hạn chót</span>
                                            <span className={`text-xs font-medium ${subtask.dueDate && new Date(subtask.dueDate) < new Date() && !subtask.statusName?.toLowerCase().includes('done') ? 'text-red-500' : 'text-gray-700'}`}>
                                                {subtask.dueDate ? formatDate(subtask.dueDate) : '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">Trọng số</span>
                                            <span className="text-xs font-medium text-gray-700">{subtask.weight || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

