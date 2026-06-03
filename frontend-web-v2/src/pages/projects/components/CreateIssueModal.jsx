import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import SubtaskSuggestionPanel from '@components/smart-assistant/SubtaskSuggestionPanel';

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

export default function CreateIssueModal({ isOpen, onClose, onSuccess, defaultProjectId = null }) {
    const [form, setForm] = useState({
        projectId: defaultProjectId || '',
        title: '',
        description: '',
        issueType: 'TASK',
        priority: 'MEDIUM',
        assigneeId: '',
        estimatedHours: '',
        startDate: '',
        dueDate: '',
        weight: '',
        isImportant: false,
        isUrgent: false,
        sprintId: '',
        storageFolder: '',
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [acceptedSubtasks, setAcceptedSubtasks] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const toast = useToast();
    const queryClient = useQueryClient();
    const { hasPermission } = useAccessControl();
    const canManageIssues = hasPermission('PROJECT.MANAGE_ISSUES');

    // Fetch project folders for dropdown
    const { data: projectFiles = [] } = useQuery({
        queryKey: ['projectFiles', form.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.PROJECT_FILES(form.projectId))).data,
        enabled: !!form.projectId && isOpen,
        staleTime: 10000,
    });

    // Extract unique folder paths from project files
    const availableFolders = useMemo(() => {
        const folders = new Set();
        projectFiles.forEach(f => {
            if (f.contentType === 'folder' && f.folder) {
                folders.add(f.folder);
            }
        });
        return Array.from(folders).sort();
    }, [projectFiles]);

    // Fetch projects
    const { data: projects = [] } = useQuery({
        queryKey: ['myProjects'],
        queryFn: async () => {
            const res = (await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS)).data;
            return Array.isArray(res) ? res : (res?.content || []);
        },
        enabled: isOpen,
        staleTime: 0,
        retry: false,
        onError: () => {},
    });

    // Fetch project members when project selected
    const { data: members = [] } = useQuery({
        queryKey: ['projectMembers', form.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(form.projectId))).data,
        enabled: isOpen && !!form.projectId,
    });

    // Fetch sprints when project selected
    const { data: sprints = [] } = useQuery({
        queryKey: ['projectSprints', form.projectId],
        queryFn: async () => {
            const res = (await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(form.projectId))).data;
            return Array.isArray(res) ? res : (res?.content || []);
        },
        enabled: isOpen && !!form.projectId,
    });

    // Reset form when defaultProjectId changes
    useEffect(() => {
        if (defaultProjectId) {
            setForm(prev => ({ ...prev, projectId: defaultProjectId }));
        }
    }, [defaultProjectId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.projectId || !form.title.trim()) {
            toast.error('Vui lòng chọn dự án và nhập tiêu đề');
            return;
        }

        try {
            setIsSubmitting(true);
            // Step 1: Build payload for parent issue
            const parentPayload = {
                projectId: parseInt(form.projectId),
                title: form.title.trim(),
                description: form.description.trim() || null,
                priority: form.priority,
                assigneeId: form.assigneeId ? parseInt(form.assigneeId) : null,
                estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
                startDate: form.startDate || null,
                dueDate: form.dueDate || null,
                weight: form.weight ? parseInt(form.weight) : null,
                isImportant: form.isImportant,
                isUrgent: form.isUrgent,
                sprintId: form.sprintId ? parseInt(form.sprintId) : null,
            };

            // Step 2: Create parent issue
            const parentResponse = await apiClient.post(ENDPOINTS.ISSUES.CREATE, parentPayload);
            const parentIssue = parentResponse.data;
            const parentIssueId = parentIssue.issueId;

            // Step 3: Create child issues for each accepted subtask
            if (acceptedSubtasks.length > 0) {
                for (const subtask of acceptedSubtasks) {
                    const subtaskPayload = {
                        ...parentPayload,
                        title: subtask.title,
                        description: `Subtask (${subtask.category || 'general'}) được gợi ý bởi AI cho issue: ${form.title.trim()}`,
                        parentIssueId: parentIssueId,
                    };
                    await apiClient.post(ENDPOINTS.ISSUES.CREATE, subtaskPayload);
                }
                toast.success(`Đã tạo ${acceptedSubtasks.length} sub-task cho issue chính!`);
            }

            // Step 4: Upload files linked to parent issue
            if (selectedFiles.length > 0 && parentIssueId) {
                const folderParam = form.storageFolder ? `?folder=${encodeURIComponent(form.storageFolder)}` : '';
                for (const file of selectedFiles) {
                    try {
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('issueId', parentIssueId.toString());
                        await apiClient.post(
                            `${ENDPOINTS.STORAGE.UPLOAD_PROJECT_FILE(form.projectId)}${folderParam}`,
                            fd,
                            { headers: { 'Content-Type': 'multipart/form-data' } }
                        );
                    } catch (err) {
                        console.error('Failed to upload file:', err);
                    }
                }
                toast.success(`${selectedFiles.length} file đã được đính kèm`);
            }

            toast.success(`Tạo ${form.issueType === 'BUG' ? 'bug' : 'task'} thành công!`);
            setSelectedFiles([]);
            setAcceptedSubtasks([]);
            queryClient.invalidateQueries(['myIssues']);
            queryClient.invalidateQueries(['projectIssues', form.projectId]);
            onSuccess?.(parentIssue);
            handleClose();
        } catch (err) {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setForm({
            projectId: defaultProjectId || '',
            title: '',
            description: '',
            issueType: 'TASK',
            priority: 'MEDIUM',
            assigneeId: '',
            estimatedHours: '',
            startDate: '',
            dueDate: '',
            weight: '',
            isImportant: false,
            isUrgent: false,
            sprintId: '',
            storageFolder: '',
        });
        setSelectedFiles([]);
        setAcceptedSubtasks([]);
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-cyan-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">Tạo Issue Mới</h2>
                        <p className="text-indigo-100 text-sm">Thêm công việc vào dự án</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center"
                    >
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="p-6 space-y-5">
                        {/* Project Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dự án <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="projectId"
                                value={form.projectId}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300"
                                required
                            >
                                <option value="">-- Chọn dự án --</option>
                                {projects.map(p => (
                                    <option key={p.projectId} value={p.projectId}>
                                        {p.name} ({p.keyProject})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Issue Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Loại</label>
                            <div className="flex gap-2">
                                {ISSUE_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, issueType: type.value }))}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all
                                            ${form.issueType === type.value
                                                ? `${type.color} text-white shadow-md`
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        <i className={`fa-solid ${type.icon}`} />
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tiêu đề <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={form.title}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300"
                                placeholder="VD: Implement login feature"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 resize-none"
                                placeholder="Mô tả chi tiết task..."
                                rows={3}
                            />
                        </div>

                        {/* Smart Subtask Suggestion */}
                        <SubtaskSuggestionPanel
                            title={form.title}
                            description={form.description}
                            onAccept={(selected) => setAcceptedSubtasks(selected)}
                        />

                        {/* Accepted Subtasks Preview */}
                        {acceptedSubtasks.length > 0 && (
                            <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <i className="fa-solid fa-check-circle text-green-500 text-sm" />
                                    <span className="text-sm font-semibold text-green-700">
                                        Đã chọn {acceptedSubtasks.length} sub-task
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {acceptedSubtasks.map((st, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-green-200 rounded-full text-xs text-green-700"
                                        >
                                            <i className="fa-solid fa-check text-green-400 text-[8px]" />
                                            {st.title}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sprint & Assignee Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
                                <select
                                    name="sprintId"
                                    value={form.sprintId}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 disabled:opacity-50"
                                    disabled={!form.projectId || sprints.length === 0}
                                >
                                    <option value="">-- Backlog (không gán) --</option>
                                    {sprints.map(s => (
                                        <option key={s.sprintId} value={s.sprintId}>
                                            {s.name} {s.status === 'ACTIVE' ? '🔥' : s.status === 'PLANNING' ? '📋' : ''}
                                        </option>
                                    ))}
                                </select>
                                {form.projectId && sprints.length === 0 && (
                                    <p className="text-xs text-gray-400 mt-1">Chưa có sprint nào</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
                                <select
                                    name="assigneeId"
                                    value={form.assigneeId}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 disabled:opacity-50"
                                    disabled={!form.projectId}
                                >
                                    <option value="">-- Chọn người --</option>
                                    {members.map(m => (
                                        <option key={m.userId} value={m.userId}>
                                            {m.fullName || m.username} ({m.position || 'Thành viên'}) | Phân bổ: {m.allocationRate || 0}% | Task: {m.completedIssues || 0}/{m.totalIssues || 0} {m.allocationRate > 100 ? '⚠️ Quá tải' : ''}
                                        </option>
                                    ))}
                                </select>
                                {!form.projectId && (
                                    <p className="text-xs text-gray-400 mt-1">Chọn dự án trước</p>
                                )}
                            </div>
                        </div>

                        {/* Priority Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Độ ưu tiên</label>
                                <select
                                    name="priority"
                                    value={form.priority}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300"
                                >
                                    {PRIORITIES.map(p => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Estimated Hours & Due Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ước tính (giờ)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <i className="fa-solid fa-clock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            name="estimatedHours"
                                            value={form.estimatedHours}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300"
                                            placeholder="8"
                                            min="0"
                                            step="0.5"
                                        />
                                    </div>
                                    <AIAutoEstimateButton
                                        projectId={form.projectId ? parseInt(form.projectId) : null}
                                        assigneeId={form.assigneeId ? parseInt(form.assigneeId) : null}
                                        weight={form.weight ? parseInt(form.weight) : null}
                                        issueType={form.issueType}
                                        onApply={(hours) => setForm(prev => ({ ...prev, estimatedHours: hours.toString() }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trọng số (1-10)</label>
                                <div className="relative">
                                    <i className="fa-solid fa-weight-scale absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        name="weight"
                                        value={form.weight}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300"
                                        placeholder="5"
                                        min="1"
                                        max="10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Start Date & Due Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                                <div className="relative">
                                    <i className="fa-solid fa-play absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={form.startDate}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn chót</label>
                                <div className="relative">
                                    <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        name="dueDate"
                                        value={form.dueDate}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Important & Urgent Checkboxes */}
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.isImportant}
                                    onChange={(e) => setForm(prev => ({ ...prev, isImportant: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-purple-600 transition-colors">
                                    <i className="fa-solid fa-star text-purple-500 mr-1" /> Quan trọng
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={form.isUrgent}
                                    onChange={(e) => setForm(prev => ({ ...prev, isUrgent: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-red-600 transition-colors">
                                    <i className="fa-solid fa-bolt text-red-500 mr-1" /> Khẩn cấp
                                </span>
                            </label>
                        </div>

                        {/* Storage: Folder selection & File upload */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <i className="fa-solid fa-folder-open text-amber-500" /> Lưu trữ tài liệu
                            </h3>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Thư mục lưu trữ</label>
                                <div className="flex gap-2">
                                    <select
                                        name="storageFolder"
                                        value={form.storageFolder}
                                        onChange={handleInputChange}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 bg-white"
                                    >
                                        <option value="">-- Gốc dự án (không chọn) --</option>
                                        {availableFolders.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                                    >
                                        <i className="fa-solid fa-paperclip" /> Chọn file
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (files.length > 0) {
                                                setSelectedFiles(prev => [...prev, ...files]);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                                {availableFolders.length === 0 && (
                                    <p className="text-xs text-gray-400 mt-1">Chưa có thư mục nào. Tạo trong tab Lưu trữ của dự án.</p>
                                )}
                            </div>
                            {selectedFiles.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-gray-600">{selectedFiles.length} file đã chọn:</p>
                                    {selectedFiles.map((f, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                                            <span className="text-xs text-gray-700 truncate flex items-center gap-2">
                                                <i className="fa-solid fa-file text-gray-400" /> {f.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <i className="fa-solid fa-times text-xs" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={!canManageIssues || isSubmitting}
                            className={`px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-lg hover:from-indigo-700 hover:to-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2 ${!canManageIssues ? 'cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-plus" />
                                    Tạo task
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── AI Auto Estimate Button ─────────────────────────────────────────────────
function AIAutoEstimateButton({ projectId, assigneeId, weight, issueType, onApply }) {
    const [showTooltip, setShowTooltip] = useState(false);

    const { data: estimate, isLoading, isFetching } = useQuery({
        queryKey: ['smart-estimate', projectId, assigneeId, weight, issueType],
        queryFn: async () => {
            return (await apiClient.get(ENDPOINTS.SMART_ASSISTANT.ESTIMATE(projectId, issueType, weight, assigneeId))).data;
        },
        enabled: !!projectId && !!assigneeId,
        staleTime: 5 * 60 * 1000,
    });

    const canEstimate = !!projectId && !!assigneeId;

    const handleClick = () => {
        if (!canEstimate) return;
        if (estimate?.suggestedHours != null) {
            onApply(estimate.suggestedHours);
            setShowTooltip(true);
            setTimeout(() => setShowTooltip(false), 3000);
        }
    };

    const getConfidenceColor = (conf) => {
        if (conf === 'high') return 'bg-green-100 text-green-700 border-green-200';
        if (conf === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    const getMethodBadge = (method) => {
        if (method === 'OLS') return { label: 'ML', color: 'bg-purple-100 text-purple-700' };
        if (method === 'Heuristic') return { label: 'Heuristic', color: 'bg-blue-100 text-blue-700' };
        return { label: 'Baseline', color: 'bg-gray-100 text-gray-500' };
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleClick}
                disabled={!canEstimate || isLoading || isFetching}
                title={!canEstimate ? 'Cần chọn dự án và người thực hiện trước' : 'AI gợi ý giờ'}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    !canEstimate
                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                }`}
            >
                {isLoading || isFetching ? (
                    <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                ) : (
                    <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                )}
                <span className="hidden sm:inline">AI gợi ý</span>
            </button>

            {/* Tooltip / result popup */}
            {showTooltip && estimate && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-amber-200 rounded-xl shadow-xl p-4 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">Gợi ý từ AI</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getConfidenceColor(estimate.confidence)}`}>
                            {estimate.confidence === 'high' ? 'Cao' : estimate.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                        </span>
                    </div>
                    <div className="flex items-end gap-2 mb-1">
                        <span className="text-3xl font-bold text-amber-600">{estimate.suggestedHours}</span>
                        <span className="text-sm text-gray-400 mb-1">giờ</span>
                        {estimate.method && (
                            <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${getMethodBadge(estimate.method).color}`}>
                                {getMethodBadge(estimate.method).label}
                            </span>
                        )}
                    </div>
                    {estimate.explanation ? (
                        <p className="text-xs text-gray-600 leading-relaxed">{estimate.explanation}</p>
                    ) : (
                        <p className="text-xs text-gray-500 leading-relaxed">{estimate.basis}</p>
                    )}
                    {estimate.derivedFromNSamples > 0 && estimate.rSquared != null && (
                        <p className="text-[10px] text-gray-400 mt-1">R²={estimate.rSquared} • {estimate.derivedFromNSamples} samples</p>
                    )}
                </div>
            )}

            {/* Disabled hint */}
            {!canEstimate && (
                <span className="absolute -top-7 left-0 text-[10px] text-gray-400 whitespace-nowrap hidden group-hover:block">
                    Chọn dự án & người làm
                </span>
            )}
        </div>
    );
}
