import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function TaskAssignmentPanel({ projectId, onClose }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [selections, setSelections] = useState({});

    const { data: assignments = [], isLoading, refetch } = useQuery({
        queryKey: ['smart-task-assignment', projectId],
        queryFn: async () => {
            return (await apiClient.get(`/api/smart-assistant?action=task-assignment&projectId=${projectId}`)).data;
        },
        enabled: !!projectId,
    });

    const assignMutation = useMutation({
        mutationFn: async (assignments) => {
            return (await apiClient.post('/api/smart-assistant/assign', assignments)).data;
        },
        onSuccess: (data) => {
            toast.success(`Đã giao ${data.assigned}/${data.total} công việc thành công!`, 'success');
            queryClient.invalidateQueries(['issues', projectId]);
            queryClient.invalidateQueries(['smart-task-assignment', projectId]);
            queryClient.invalidateQueries(['smart-summary', projectId]);
            onClose();
        },
        onError: () => {
            toast.error('Có lỗi khi giao việc');
        },
    });

    const handleToggle = (issueId) => {
        setSelections(prev => ({
            ...prev,
            [issueId]: prev[issueId] === false ? true : (prev[issueId] === undefined ? false : prev[issueId])
        }));
    };

    const isSelected = (issueId) => {
        if (selections[issueId] === undefined) return true; // default checked
        return selections[issueId];
    };

    const handleChangeAssignee = (issueId, newUserId) => {
        setSelections(prev => ({
            ...prev,
            [issueId]: prev[issueId] === false ? false : (prev[issueId] === undefined ? true : prev[issueId]),
            [`assignee-${issueId}`]: newUserId,
        }));
    };

    const handleAssignAll = () => {
        const toAssign = assignments
            .filter(a => isSelected(a.issueId))
            .map(a => {
                const newAssigneeId = selections[`assignee-${a.issueId}`];
                return {
                    issueId: a.issueId,
                    assigneeId: newAssigneeId !== undefined ? newAssigneeId : a.suggestedAssignee?.userId,
                };
            })
            .filter(a => a.assigneeId);

        if (toAssign.length === 0) {
            toast.error('Không có issue nào được chọn để giao');
            return;
        }
        assignMutation.mutate(toAssign);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'BUG': return 'fa-bug';
            case 'STORY': return 'fa-bookmark';
            default: return 'fa-check-square';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'BUG': return 'text-red-500';
            case 'STORY': return 'text-green-500';
            default: return 'text-indigo-500';
        }
    };

    if (isLoading) {
        return (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="text-center">
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500 mb-3" />
                    <p className="text-gray-500">Đang phân tích...</p>
                </div>
            </div>
        );
    }

    if (assignments.length === 0) {
        return (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="text-center py-16">
                    <i className="fa-solid fa-check-circle text-5xl text-green-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">Tất cả issue đã được giao việc</p>
                    <p className="text-sm text-gray-400 mt-1">Không còn issue nào trong backlog</p>
                    <button onClick={onClose} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        Đóng
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-slate-50/95 backdrop-blur-sm z-20 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <i className="fa-solid fa-robot text-indigo-600 text-lg" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Lập kế hoạch giao việc</h2>
                        <p className="text-sm text-gray-500">
                            Phân tích: <strong>{assignments.length}</strong> issue chưa giao
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 flex items-center gap-1"
                    >
                        <i className="fa-solid fa-rotate text-xs" />
                        Tải lại
                    </button>
                    <button onClick={onClose} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                        <i className="fa-solid fa-xmark mr-1" />
                        Đóng
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {assignments.map(assignment => (
                    <div key={assignment.issueId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Header row */}
                        <div className="flex items-start gap-3 p-4">
                            <input
                                type="checkbox"
                                checked={isSelected(assignment.issueId)}
                                onChange={() => handleToggle(assignment.issueId)}
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <i className={`fa-solid ${getTypeIcon(assignment.issueType)} ${getTypeColor(assignment.issueType)} text-xs`} />
                                    <span className="text-xs font-mono text-gray-400">{assignment.issueKey}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                        assignment.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                        assignment.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                        assignment.priority === 'LOW' ? 'bg-gray-100 text-gray-600' :
                                        'bg-indigo-50 text-indigo-700'
                                    }`}>
                                        {assignment.priority}
                                    </span>
                                    {assignment.isOverdue && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                            TRỄ DEADLINE
                                        </span>
                                    )}
                                    {assignment.reworkCount > 0 && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                            Rework: {assignment.reworkCount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-medium text-gray-800 mb-2">{assignment.title}</p>
                                <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                                    {assignment.weight && (
                                        <span className="flex items-center gap-1">
                                            <i className="fa-solid fa-weight-scale" />
                                            Weight: {assignment.weight}/10
                                        </span>
                                    )}
                                    {assignment.dueDate && (
                                        <span className="flex items-center gap-1">
                                            <i className="fa-solid fa-calendar" />
                                            {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    )}
                                </div>

                                {/* Suggestion */}
                                {isSelected(assignment.issueId) && assignment.suggestedAssignee && (
                                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <i className="fa-solid fa-robot text-indigo-500 text-xs" />
                                                <span className="text-xs text-indigo-600 font-semibold">Gợi ý:</span>
                                                <div className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                                    {assignment.suggestedAssignee.fullName?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <span className="text-sm font-bold text-gray-800">{assignment.suggestedAssignee.fullName}</span>
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                    {assignment.suggestedAssignee.score} điểm
                                                </span>
                                            </div>

                                            {/* Alternatives dropdown */}
                                            {assignment.alternatives?.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-gray-400">Thay đổi:</span>
                                                    {assignment.alternatives.map(alt => {
                                                        const currentId = selections[`assignee-${assignment.issueId}`] ?? assignment.suggestedAssignee.userId;
                                                        const isActive = currentId === alt.userId;
                                                        return (
                                                            <button
                                                                key={alt.userId}
                                                                onClick={() => handleChangeAssignee(assignment.issueId, alt.userId)}
                                                                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                                                    isActive
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                {alt.fullName?.charAt(0)}. ({alt.score})
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Breakdown */}
                                        {assignment.suggestedAssignee.breakdown && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {Object.entries(assignment.suggestedAssignee.breakdown)
                                                    .filter(([, v]) => v > 0)
                                                    .sort(([, a], [, b]) => b - a)
                                                    .slice(0, 4)
                                                    .map(([key, val]) => (
                                                        <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-white text-gray-500">
                                                            {key === 'skillMatch' ? 'Kỹ năng' :
                                                             key === 'workload' ? 'Workload' :
                                                             key === 'history' ? 'Lịch sử' :
                                                             key === 'availability' ? 'Rảnh' :
                                                             key === 'deadline' ? 'Deadline' :
                                                             key === 'loadBalance' ? 'Cân bằng' :
                                                             key === 'reliability' ? 'Đúng hạn' : key}: +{val}
                                                        </span>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200 shadow-sm">
                <span className="text-sm text-gray-500">
                    {assignments.filter(a => isSelected(a.issueId)).length}/{assignments.length} issue được chọn
                </span>
                <div className="flex gap-3">
                    <button
                        onClick={() => setSelections({})}
                        className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                        Bỏ chọn tất cả
                    </button>
                    <button
                        onClick={handleAssignAll}
                        disabled={assignMutation.isPending}
                        className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    >
                        {assignMutation.isPending ? (
                            <><i className="fa-solid fa-circle-notch fa-spin" /> Đang giao...</>
                        ) : (
                            <><i className="fa-solid fa-paper-plane" /> Giao tất cả ({assignments.filter(a => isSelected(a.issueId)).length})</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
