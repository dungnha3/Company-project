import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import BurndownChart from '../components/BurndownChart';

const SPRINT_STATUS = {
    PLANNING: { label: 'Planning', color: 'bg-gray-100 text-gray-700' },
    ACTIVE: { label: 'Active', color: 'bg-blue-100 text-blue-700' },
    COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
};

export default function SprintTab({ projectId }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSprint, setSelectedSprint] = useState(null);
    const queryClient = useQueryClient();
    const toast = useToast();

    // Fetch sprints
    const { data: sprints = [], isLoading } = useQuery({
        queryKey: ['sprints', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.SPRINTS.BY_PROJECT(projectId))).data,
        enabled: !!projectId,
    });

    // Start sprint mutation
    const startMutation = useMutation({
        mutationFn: (sprintId) => apiClient.post(ENDPOINTS.SPRINTS.START(sprintId)),
        onSuccess: () => {
            toast.success('Sprint đã bắt đầu!');
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    // Complete sprint mutation
    const completeMutation = useMutation({
        mutationFn: (sprintId) => apiClient.post(ENDPOINTS.SPRINTS.COMPLETE(sprintId)),
        onSuccess: () => {
            toast.success('Sprint đã hoàn thành!');
            queryClient.invalidateQueries(['sprints', projectId]);
        },
    });

    // Separate active and other sprints
    const activeSprint = sprints.find(s => s.status === 'ACTIVE');
    const planningSprints = sprints.filter(s => s.status === 'PLANNING');
    const completedSprints = sprints.filter(s => s.status === 'COMPLETED');

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
                    <h2 className="text-lg font-bold text-gray-900">Sprint Management</h2>
                    <p className="text-sm text-gray-500">Quản lý các sprint trong dự án</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus" />
                    Tạo Sprint
                </button>
            </div>

            {/* Active Sprint */}
            {activeSprint && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                                    <i className="fa-solid fa-rocket" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{activeSprint.name}</h3>
                                    <span className="text-xs text-blue-600 font-medium">ACTIVE SPRINT</span>
                                </div>
                            </div>
                            <button
                                onClick={() => completeMutation.mutate(activeSprint.sprintId)}
                                disabled={completeMutation.isPending}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                                <i className="fa-solid fa-check mr-2" />
                                Hoàn thành Sprint
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Bắt đầu</span>
                                <div className="font-medium">{activeSprint.startDate ? formatDate(activeSprint.startDate) : '—'}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">Kết thúc</span>
                                <div className="font-medium">{activeSprint.endDate ? formatDate(activeSprint.endDate) : '—'}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">Issues</span>
                                <div className="font-medium">{activeSprint.issueCount || 0}</div>
                            </div>
                            <div>
                                <span className="text-gray-500">Story Points</span>
                                <div className="font-medium">{activeSprint.totalStoryPoints || 0}</div>
                            </div>
                        </div>
                        {activeSprint.goal && (
                            <p className="mt-3 text-sm text-gray-600 border-t border-blue-200 pt-3">
                                <strong>Goal:</strong> {activeSprint.goal}
                            </p>
                        )}
                    </div>

                    {/* Burndown Chart for Active Sprint */}
                    <BurndownChart
                        sprintId={activeSprint.sprintId}
                        sprintName={activeSprint.name}
                    />
                </div>
            )}

            {/* Planning Sprints */}
            {planningSprints.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-clock text-gray-400" />
                        Upcoming ({planningSprints.length})
                    </h3>
                    <div className="space-y-3">
                        {planningSprints.map(sprint => (
                            <div key={sprint.sprintId} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900">{sprint.name}</h4>
                                        <p className="text-sm text-gray-500">
                                            {sprint.startDate ? formatDate(sprint.startDate) : 'TBD'}
                                            {' → '}
                                            {sprint.endDate ? formatDate(sprint.endDate) : 'TBD'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${SPRINT_STATUS.PLANNING.color}`}>
                                            {SPRINT_STATUS.PLANNING.label}
                                        </span>
                                        <button
                                            onClick={() => startMutation.mutate(sprint.sprintId)}
                                            disabled={startMutation.isPending || activeSprint}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                                            title={activeSprint ? 'Phải hoàn thành sprint hiện tại trước' : 'Bắt đầu sprint'}
                                        >
                                            <i className="fa-solid fa-play mr-1" />
                                            Start
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Sprints */}
            {completedSprints.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-check-circle text-green-500" />
                        Completed ({completedSprints.length})
                    </h3>
                    <div className="space-y-2">
                        {completedSprints.slice(0, 5).map(sprint => (
                            <div key={sprint.sprintId} className="bg-gray-50 rounded-lg border border-gray-100 p-3 flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-gray-700">{sprint.name}</h4>
                                    <p className="text-xs text-gray-500">
                                        {sprint.completedAt ? formatDate(sprint.completedAt) : 'Completed'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span>{sprint.issueCount || 0} issues</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${SPRINT_STATUS.COMPLETED.color}`}>
                                        Done
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {sprints.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <i className="fa-solid fa-layer-group text-4xl text-gray-300 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Chưa có Sprint nào</h3>
                    <p className="text-sm text-gray-500 mb-4">Tạo sprint đầu tiên để bắt đầu quản lý công việc theo chu kỳ</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <i className="fa-solid fa-plus mr-2" />
                        Tạo Sprint
                    </button>
                </div>
            )}

            {/* Create Sprint Modal */}
            {showCreateModal && (
                <CreateSprintModal
                    projectId={projectId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['sprints', projectId]);
                        setShowCreateModal(false);
                    }}
                />
            )}
        </div>
    );
}

function CreateSprintModal({ projectId, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name: '',
        goal: '',
        startDate: '',
        endDate: '',
    });
    const toast = useToast();

    const createMutation = useMutation({
        mutationFn: async (data) => {
            return (await apiClient.post(ENDPOINTS.SPRINTS.LIST, { ...data, projectId })).data;
        },
        onSuccess: () => {
            toast.success('Tạo sprint thành công!');
            onSuccess();
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Vui lòng nhập tên sprint');
            return;
        }
        createMutation.mutate(form);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Tạo Sprint Mới</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tên Sprint <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="VD: Sprint 1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Goal</label>
                        <textarea
                            value={form.goal}
                            onChange={(e) => setForm({ ...form, goal: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Mục tiêu của sprint này..."
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
                            disabled={createMutation.isPending}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {createMutation.isPending ? 'Đang tạo...' : 'Tạo Sprint'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
