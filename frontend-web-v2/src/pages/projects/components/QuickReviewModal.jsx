import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useAccessControl } from '@shared/hooks/useAccessControl';

export default function QuickReviewModal({ issue, onClose, onSuccess }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { hasPermission } = useAccessControl();
    
    const canManageIssues = hasPermission('PROJECT.MANAGE_ISSUES');
    const canSubmit = canManageIssues;

    const [form, setForm] = useState({
        performanceScore: 7,
        reworkCount: 0,
        reviewerNote: '',
    });

    const quickScoreMutation = useMutation({
        mutationFn: async (data) => {
            return (await apiClient.post(ENDPOINTS.REVIEWS.QUICK_SCORE(issue.issueId), data)).data;
        },
        onMutate: async (data) => {
            await queryClient.cancelQueries({ queryKey: ['issues'] });
            const snapshotIssues = queryClient.getQueryData(['issues']);
            const snapshotMy = queryClient.getQueryData(['myIssues']);

            const doneStatusId = 4;
            const doneStatusName = 'Done';
            queryClient.setQueryData(['issues'], (old = []) =>
                old.map(i =>
                    String(i.issueId) === String(issue.issueId)
                        ? { ...i, statusId: doneStatusId, statusName: doneStatusName }
                        : i
                )
            );
            queryClient.setQueryData(['myIssues'], (old = []) =>
                old.map(i =>
                    String(i.issueId) === String(issue.issueId)
                        ? { ...i, statusId: doneStatusId, statusName: doneStatusName }
                        : i
                )
            );
            return { snapshotIssues, snapshotMy };
        },
        onError: (err, vars, context) => {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi chấm điểm');
            if (context?.snapshotIssues) {
                queryClient.setQueryData(['issues'], context.snapshotIssues);
            }
            if (context?.snapshotMy) {
                queryClient.setQueryData(['myIssues'], context.snapshotMy);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['myIssues'] });
        },
        onSuccess: () => {
            toast.success('Chấm điểm thành công! Thẻ đã được chuyển sang Done.');
            onSuccess?.();
            onClose();
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        quickScoreMutation.mutate({
            performanceScore: form.performanceScore,
            reworkCount: form.reworkCount,
            reviewerNote: form.reviewerNote,
        });
    };

    if (!issue) return null;

    return (
        <div className="modal-overlay items-center">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-500 to-teal-600 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-white">Chấm điểm & Hoàn thành</h2>
                        <p className="text-emerald-100 text-sm">Chấm điểm nhanh cho {issue.issueKey || `#${issue.issueId}`}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center">
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm mb-2 border border-emerald-100">
                            <strong>{issue.title}</strong>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="text-xs">Người thực hiện: <strong>{issue.assigneeName || 'Chưa giao'}</strong></span>
                            </div>
                        </div>

                        {/* Permission Warning */}
                        {!canManageIssues && (
                            <div className="bg-red-50 text-red-755 p-3 rounded-lg text-xs border border-red-150 flex items-start gap-2.5">
                                <i className="fa-solid fa-triangle-exclamation text-sm shrink-0 mt-0.5" />
                                <span>Bạn không có quyền <strong>Quản lý công việc (PROJECT.MANAGE_ISSUES)</strong> trong dự án này.</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Điểm chất lượng (1-10) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    disabled={!canSubmit}
                                    value={form.performanceScore}
                                    onChange={(e) => setForm(prev => ({ ...prev, performanceScore: parseFloat(e.target.value) }))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50"
                                />
                                <span className="font-bold text-lg text-emerald-600 w-10 text-center">{form.performanceScore}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số lần Rework</label>
                            <input
                                type="number"
                                min="0"
                                disabled={!canSubmit}
                                value={form.reworkCount}
                                onChange={(e) => setForm(prev => ({ ...prev, reworkCount: parseInt(e.target.value) || 0 }))}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú / Nhận xét</label>
                            <textarea
                                value={form.reviewerNote}
                                disabled={!canSubmit}
                                onChange={(e) => setForm(prev => ({ ...prev, reviewerNote: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                                rows={3}
                                placeholder="Nhận xét về chất lượng công việc..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit || quickScoreMutation.isPending}
                            className={`px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm ${!canSubmit ? 'cursor-not-allowed' : ''}`}
                        >
                            {quickScoreMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
                            Chấm điểm & Done
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
