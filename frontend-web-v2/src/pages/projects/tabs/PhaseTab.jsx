import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const PHASE_STATUS = {
    PLANNING: { label: 'Lập kế hoạch', color: 'bg-gray-100 text-gray-700', icon: 'fa-clipboard-list' },
    IN_PROGRESS: { label: 'Đang thực hiện', color: 'bg-blue-100 text-blue-700', icon: 'fa-spinner' },
    COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
    ON_HOLD: { label: 'Tạm dừng', color: 'bg-yellow-100 text-yellow-700', icon: 'fa-pause-circle' },
};

export default function PhaseTab({ projectId }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPhase, setEditingPhase] = useState(null);
    const queryClient = useQueryClient();
    const toast = useToast();

    // Fetch phases
    const { data: phases = [], isLoading } = useQuery({
        queryKey: ['phases', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PHASES.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });

    // Delete phase mutation
    const deleteMutation = useMutation({
        mutationFn: (phaseId) => apiClient.delete(ENDPOINTS.PHASES.BY_ID(phaseId)),
        onSuccess: () => {
            toast.success('Đã xóa giai đoạn');
            queryClient.invalidateQueries(['phases', projectId]);
        },
    });

    // Update phase status mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ phaseId, status }) =>
            apiClient.put(ENDPOINTS.PHASES.BY_ID(phaseId), { status }),
        onSuccess: () => {
            toast.success('Đã cập nhật trạng thái');
            queryClient.invalidateQueries(['phases', projectId]);
        },
    });

    // Sort phases by orderIndex
    const sortedPhases = [...phases].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    // Calculate progress
    const completedCount = sortedPhases.filter(p => p.status === 'COMPLETED').length;
    const progress = phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Giai đoạn dự án</h2>
                    <p className="text-sm text-gray-500">Quản lý các giai đoạn (phases) trong dự án</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus" />
                    Thêm giai đoạn
                </button>
            </div>

            {/* Progress Overview */}
            {phases.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-700">Tiến độ tổng thể</span>
                        <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{completedCount}/{phases.length} giai đoạn hoàn thành</span>
                    </div>
                </div>
            )}

            {/* Phase Timeline */}
            {sortedPhases.length > 0 ? (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                    <div className="space-y-4">
                        {sortedPhases.map((phase, index) => {
                            const statusConfig = PHASE_STATUS[phase.status] || PHASE_STATUS.PLANNING;
                            return (
                                <div key={phase.phaseId} className="relative flex gap-4 pl-12">
                                    {/* Circle indicator */}
                                    <div className={`absolute left-4 w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px]
                                        ${phase.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                                            phase.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' :
                                                'bg-gray-300 text-gray-600'}`}
                                    >
                                        {phase.status === 'COMPLETED' ? <i className="fa-solid fa-check" /> : index + 1}
                                    </div>

                                    {/* Phase Card */}
                                    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900">{phase.name}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                                {phase.description && (
                                                    <p className="text-sm text-gray-500 mb-2">{phase.description}</p>
                                                )}
                                                <div className="flex gap-4 text-xs text-gray-500">
                                                    {phase.startDate && (
                                                        <span>
                                                            <i className="fa-regular fa-calendar mr-1" />
                                                            {new Date(phase.startDate).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    )}
                                                    {phase.endDate && (
                                                        <span>
                                                            <i className="fa-solid fa-arrow-right mx-1" />
                                                            {new Date(phase.endDate).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    )}
                                                    {phase.issueCount !== undefined && (
                                                        <span>
                                                            <i className="fa-solid fa-list-check mr-1" />
                                                            {phase.issueCount} tasks
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1">
                                                {/* Status Quick Change */}
                                                <select
                                                    value={phase.status}
                                                    onChange={(e) => updateStatusMutation.mutate({
                                                        phaseId: phase.phaseId,
                                                        status: e.target.value
                                                    })}
                                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    {Object.entries(PHASE_STATUS).map(([key, val]) => (
                                                        <option key={key} value={key}>{val.label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => setEditingPhase(phase)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <i className="fa-solid fa-pen text-sm" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Xóa giai đoạn này?')) {
                                                            deleteMutation.mutate(phase.phaseId);
                                                        }
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa"
                                                >
                                                    <i className="fa-solid fa-trash text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <i className="fa-solid fa-layer-group text-4xl text-gray-300 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Chưa có giai đoạn nào</h3>
                    <p className="text-sm text-gray-500 mb-4">Thêm giai đoạn để chia nhỏ dự án thành các phần dễ quản lý</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <i className="fa-solid fa-plus mr-2" />
                        Thêm giai đoạn đầu tiên
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || editingPhase) && (
                <PhaseModal
                    projectId={projectId}
                    phase={editingPhase}
                    onClose={() => { setShowCreateModal(false); setEditingPhase(null); }}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['phases', projectId]);
                        setShowCreateModal(false);
                        setEditingPhase(null);
                    }}
                />
            )}
        </div>
    );
}

function PhaseModal({ projectId, phase, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name: phase?.name || '',
        description: phase?.description || '',
        startDate: phase?.startDate?.split('T')[0] || '',
        endDate: phase?.endDate?.split('T')[0] || '',
        status: phase?.status || 'PLANNING',
        orderIndex: phase?.orderIndex || 1,
    });
    const toast = useToast();
    const isEditing = !!phase;

    const mutation = useMutation({
        mutationFn: async (data) => {
            if (isEditing) {
                return (await apiClient.put(ENDPOINTS.PHASES.BY_ID(phase.phaseId), data)).data;
            }
            return (await apiClient.post(ENDPOINTS.PHASES.BY_PROJECT(projectId), data)).data;
        },
        onSuccess: () => {
            toast.success(isEditing ? 'Đã cập nhật giai đoạn' : 'Đã tạo giai đoạn');
            onSuccess();
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Vui lòng nhập tên giai đoạn');
            return;
        }
        mutation.mutate(form);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        {isEditing ? 'Chỉnh sửa giai đoạn' : 'Thêm giai đoạn mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tên giai đoạn <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="VD: Giai đoạn thiết kế"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Mô tả chi tiết..."
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                {Object.entries(PHASE_STATUS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                            <input
                                type="number"
                                value={form.orderIndex}
                                onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value) || 1 })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {mutation.isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo giai đoạn'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
