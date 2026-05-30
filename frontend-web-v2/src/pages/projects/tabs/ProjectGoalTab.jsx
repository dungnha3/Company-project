import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';

export default function ProjectGoalTab({ projectId }) {
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const queryClient = useQueryClient();
    const toast = useToast();
    const { hasPermission } = useAccessControl();
    const canManageGoals = hasPermission('PROJECT.MANAGE_PHASES');

    const currentYear = new Date().getFullYear();
    const [filterYear, setFilterYear] = useState(currentYear);

    // Fetch goals
    const { data: goals = [], isLoading } = useQuery({
        queryKey: ['project-goals', projectId, filterYear],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.GOALS(projectId), {
                params: { year: filterYear },
            });
            return res.data || [];
        },
        enabled: !!projectId,
    });

    // Fetch all years that have goals (for filter)
    const { data: allGoals = [] } = useQuery({
        queryKey: ['project-goals-all', projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROJECTS.GOALS(projectId));
            return res.data || [];
        },
        enabled: !!projectId,
    });

    const availableYears = [...new Set(allGoals.map(g => g.year))].sort((a, b) => b - a);

    const deleteMutation = useMutation({
        mutationFn: (goalId) => apiClient.delete(ENDPOINTS.PROJECTS.GOAL_DELETE(projectId, goalId)),
        onSuccess: () => {
            toast.success('Đã xóa mục tiêu');
            queryClient.invalidateQueries(['project-goals', projectId]);
            queryClient.invalidateQueries(['project-goals-all', projectId]);
        },
    });

    const toggleMutation = useMutation({
        mutationFn: (goalId) => apiClient.patch(ENDPOINTS.PROJECTS.GOAL_TOGGLE(projectId, goalId)),
        onSuccess: () => {
            toast.success('Đã cập nhật trạng thái');
            queryClient.invalidateQueries(['project-goals', projectId]);
            queryClient.invalidateQueries(['project-goals-all', projectId]);
        },
    });

    // Group goals by month
    const goalsByMonth = goals.reduce((acc, goal) => {
        const month = goal.month;
        if (!acc[month]) acc[month] = [];
        acc[month].push(goal);
        return acc;
    }, {});

    const MONTHS = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
    ];

    const progressByMonth = Object.entries(goalsByMonth).reduce((acc, [month, monthGoals]) => {
        const completed = monthGoals.filter(g => g.isCompleted).length;
        const total = monthGoals.length;
        acc[month] = { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
        return acc;
    }, {});

    const handleOpenEdit = (goal) => {
        setEditingGoal(goal);
        setShowModal(true);
    };

    const handleOpenCreate = () => {
        setEditingGoal(null);
        setShowModal(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Mục tiêu dự án</h2>
                    <p className="text-sm text-gray-500">Đặt mục tiêu theo tháng để theo dõi tiến độ</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300"
                    >
                        {availableYears.length > 0 ? availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        )) : (
                            <option value={currentYear}>{currentYear}</option>
                        )}
                    </select>
                    {canManageGoals && (
                        <button
                            onClick={handleOpenCreate}
                            className="btn-primary flex items-center gap-2"
                        >
                            <i className="fa-solid fa-plus" />
                            Thêm mục tiêu
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                    const data = progressByMonth[month] || { completed: 0, total: 0, pct: 0 };
                    const isCurrentMonth = new Date().getMonth() + 1 === month && new Date().getFullYear() === filterYear;
                    return (
                        <div
                            key={month}
                            className={`bg-white rounded-xl border p-4 shadow-sm ${isCurrentMonth ? 'ring-2 ring-indigo-300 border-indigo-200' : 'border-gray-100'}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-indigo-700' : 'text-gray-700'}`}>
                                    {MONTHS[month - 1]}
                                </span>
                                {isCurrentMonth && (
                                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">HIỆN TẠI</span>
                                )}
                            </div>
                            <div className="text-xl font-bold text-gray-900">{data.completed}/{data.total}</div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                <div
                                    className={`h-full rounded-full transition-all ${data.pct === 100 ? 'bg-green-500' : data.pct > 0 ? 'bg-indigo-500' : 'bg-gray-200'}`}
                                    style={{ width: `${data.pct}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{data.pct}% hoàn thành</div>
                        </div>
                    );
                })}
            </div>

            {/* Goals by Month */}
            {goals.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                    <i className="fa-solid fa-bullseye text-4xl text-gray-300 mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Chưa có mục tiêu nào</h3>
                    <p className="text-sm text-gray-500 mb-4">Thêm mục tiêu theo tháng để theo dõi tiến độ dự án</p>
                    {canManageGoals && (
                        <button onClick={handleOpenCreate} className="btn-primary">
                            <i className="fa-solid fa-plus mr-2" />
                            Thêm mục tiêu đầu tiên
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                        const monthGoals = goalsByMonth[month];
                        if (!monthGoals || monthGoals.length === 0) return null;
                        return (
                            <div key={month}>
                                <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-base font-bold text-gray-800">{MONTHS[month - 1]} {filterYear}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${monthGoals.every(g => g.isCompleted) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {monthGoals.filter(g => g.isCompleted).length}/{monthGoals.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {monthGoals.map(goal => (
                                        <div
                                            key={goal.goalId}
                                            className={`bg-white rounded-xl border p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow ${goal.isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}
                                        >
                                            <button
                                                onClick={() => toggleMutation.mutate(goal.goalId)}
                                                disabled={toggleMutation.isPending}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                                    ${goal.isCompleted
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-300 hover:border-green-400'}`}
                                            >
                                                {goal.isCompleted && <i className="fa-solid fa-check text-[8px]" />}
                                            </button>
                                            <div className="flex-1">
                                                <p className={`font-medium ${goal.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                    {goal.title}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Tạo {formatDate(goal.createdAt)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {canManageGoals && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEdit(goal)}
                                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Sửa"
                                                        >
                                                            <i className="fa-solid fa-pen text-sm" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('Xóa mục tiêu này?')) {
                                                                    deleteMutation.mutate(goal.goalId);
                                                                }
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <i className="fa-solid fa-trash text-sm" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <GoalModal
                    projectId={projectId}
                    goal={editingGoal}
                    defaultYear={filterYear}
                    onClose={() => { setShowModal(false); setEditingGoal(null); }}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['project-goals', projectId]);
                        queryClient.invalidateQueries(['project-goals-all', projectId]);
                        setShowModal(false);
                        setEditingGoal(null);
                    }}
                />
            )}
        </div>
    );
}

function GoalModal({ projectId, goal, defaultYear, onClose, onSuccess }) {
    const [form, setForm] = useState({
        title: goal?.title || '',
        month: goal?.month || new Date().getMonth() + 1,
        year: goal?.year || defaultYear || new Date().getFullYear(),
    });
    const toast = useToast();
    const isEditing = !!goal;

    const mutation = useMutation({
        mutationFn: async (data) => {
            if (isEditing) {
                // Backend only has toggle, no full edit — delete + recreate
                await apiClient.delete(ENDPOINTS.PROJECTS.GOAL_DELETE(projectId, goal.goalId));
            }
            return apiClient.post(ENDPOINTS.PROJECTS.GOAL_CREATE(projectId), data);
        },
        onSuccess: () => {
            toast.success(isEditing ? 'Đã cập nhật mục tiêu' : 'Đã thêm mục tiêu');
            onSuccess();
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast.error('Vui lòng nhập mục tiêu');
            return;
        }
        mutation.mutate(form);
    };

    const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        {isEditing ? 'Sửa mục tiêu' : 'Thêm mục tiêu mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mục tiêu</label>
                        <textarea
                            value={form.title}
                            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 resize-none"
                            placeholder="VD: Hoàn thành module authentication"
                            rows={3}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                            <select
                                value={form.month}
                                onChange={(e) => setForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300"
                            >
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                            <input
                                type="number"
                                value={form.year}
                                onChange={(e) => setForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300"
                                min={2020}
                                max={2100}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            Hủy
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary">
                            {mutation.isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mục tiêu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
