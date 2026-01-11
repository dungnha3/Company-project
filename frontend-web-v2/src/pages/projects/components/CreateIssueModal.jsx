import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const PRIORITIES = [
    { value: 'LOW', label: 'Thấp', icon: 'fa-arrow-down', color: 'text-gray-500' },
    { value: 'MEDIUM', label: 'Trung bình', icon: 'fa-minus', color: 'text-blue-500' },
    { value: 'HIGH', label: 'Cao', icon: 'fa-arrow-up', color: 'text-orange-500' },
    { value: 'CRITICAL', label: 'Khẩn cấp', icon: 'fa-fire', color: 'text-red-500' },
];

const ISSUE_TYPES = [
    { value: 'TASK', label: 'Task', icon: 'fa-check', color: 'bg-blue-500' },
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
        dueDate: '',
    });
    const toast = useToast();
    const queryClient = useQueryClient();

    // Fetch projects
    const { data: projects = [] } = useQuery({
        queryKey: ['myProjects'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MY_PROJECTS)).data,
        enabled: isOpen,
    });

    // Fetch project members when project selected
    const { data: members = [] } = useQuery({
        queryKey: ['projectMembers', form.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(form.projectId))).data,
        enabled: isOpen && !!form.projectId,
    });

    // Reset form when defaultProjectId changes
    useEffect(() => {
        if (defaultProjectId) {
            setForm(prev => ({ ...prev, projectId: defaultProjectId }));
        }
    }, [defaultProjectId]);

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                projectId: parseInt(data.projectId),
                title: data.title.trim(),
                description: data.description.trim() || null,
                issueType: data.issueType,
                priority: data.priority,
                assigneeId: data.assigneeId ? parseInt(data.assigneeId) : null,
                estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : null,
                dueDate: data.dueDate || null,
            };
            return (await apiClient.post(`/api/issues`, payload)).data;
        },
        onSuccess: (issue) => {
            toast.success(`Tạo ${form.issueType === 'BUG' ? 'bug' : 'task'} thành công!`);
            queryClient.invalidateQueries(['myIssues']);
            queryClient.invalidateQueries(['projectIssues', form.projectId]);
            onSuccess?.(issue);
            handleClose();
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.projectId || !form.title.trim()) {
            toast.error('Vui lòng chọn dự án và nhập tiêu đề');
            return;
        }
        createMutation.mutate(form);
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
            dueDate: '',
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-500 to-cyan-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">Tạo Task Mới</h2>
                        <p className="text-blue-100 text-sm">Thêm công việc vào dự án</p>
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
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                placeholder="Mô tả chi tiết task..."
                                rows={3}
                            />
                        </div>

                        {/* Priority & Assignee Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Độ ưu tiên</label>
                                <select
                                    name="priority"
                                    value={form.priority}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {PRIORITIES.map(p => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
                                <select
                                    name="assigneeId"
                                    value={form.assigneeId}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                    disabled={!form.projectId}
                                >
                                    <option value="">-- Chọn người --</option>
                                    {members.map(m => (
                                        <option key={m.userId} value={m.userId}>
                                            {m.username || m.fullName} ({m.role})
                                        </option>
                                    ))}
                                </select>
                                {!form.projectId && (
                                    <p className="text-xs text-gray-400 mt-1">Chọn dự án trước</p>
                                )}
                            </div>
                        </div>

                        {/* Estimated Hours & Due Date Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ước tính (giờ)</label>
                                <div className="relative">
                                    <i className="fa-solid fa-clock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        name="estimatedHours"
                                        value={form.estimatedHours}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="8"
                                        min="0"
                                        step="0.5"
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
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={createMutation.isPending}
                            className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {createMutation.isPending ? (
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
