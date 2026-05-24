import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function QuickReviewModal({ issue, onClose, onSuccess }) {
    const toast = useToast();
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        performanceScore: 5,
        reworkCount: 0,
        reviewerNote: '',
    });

    const quickScoreMutation = useMutation({
        mutationFn: async (data) => {
            return (await apiClient.post(ENDPOINTS.REVIEWS.QUICK_SCORE(issue.issueId), data)).data;
        },
        onSuccess: () => {
            toast.success('Chấm điểm thành công! Thẻ đã được chuyển sang Done.');
            queryClient.invalidateQueries(['issues']);
            queryClient.invalidateQueries(['myIssues']);
            onSuccess?.();
            onClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi chấm điểm');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        quickScoreMutation.mutate(form);
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
                                <span className="text-xs">Người thực hiện: <strong>{issue.assignee?.fullName || 'Chưa giao'}</strong></span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Điểm chất lượng (1-10) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={form.performanceScore}
                                    onChange={(e) => setForm(prev => ({ ...prev, performanceScore: parseInt(e.target.value) }))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                />
                                <span className="font-bold text-lg text-emerald-600 w-8 text-center">{form.performanceScore}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số lần Rework</label>
                            <input
                                type="number"
                                min="0"
                                value={form.reworkCount}
                                onChange={(e) => setForm(prev => ({ ...prev, reworkCount: parseInt(e.target.value) || 0 }))}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú / Nhận xét</label>
                            <textarea
                                value={form.reviewerNote}
                                onChange={(e) => setForm(prev => ({ ...prev, reviewerNote: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
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
                            disabled={quickScoreMutation.isPending}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
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
