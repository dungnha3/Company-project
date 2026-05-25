import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

const REVIEW_TYPES = [
    { value: 'PERIODIC', label: 'Định kỳ (tháng/quý)' },
    { value: 'SPRINT_REVIEW', label: 'Sprint Review' },
    { value: 'PROJECT_COMPLETION', label: 'Kết thúc dự án' },
    { value: 'PROJECT', label: 'Theo dự án' },
    { value: 'PROMOTION', label: 'Thăng chức' },
];

export default function BulkReviewModal({ isOpen, onClose }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        reviewPeriod: '',
        reviewType: 'PERIODIC',
    });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const { data: needingReview = [], isLoading: loadingNeeding } = useQuery({
        queryKey: ['reviews', 'needing-review', formData.reviewPeriod, formData.reviewType],
        queryFn: async () => {
            if (!formData.reviewPeriod) return [];
            const res = await apiClient.get(ENDPOINTS.REVIEWS.NEEDING_REVIEW, {
                params: { reviewPeriod: formData.reviewPeriod, reviewType: formData.reviewType }
            });
            return res.data || [];
        },
        enabled: step === 2 && !!formData.reviewPeriod,
    });

    const bulkMutation = useMutation({
        mutationFn: (payload) => apiClient.post(ENDPOINTS.REVIEWS.BULK_CREATE, payload),
        onSuccess: (res) => {
            const data = res.data;
            queryClient.invalidateQueries(['reviews']);
            queryClient.invalidateQueries(['reviews-stats']);
            showToast(
                `Đã tạo ${data.createdCount} phiếu đánh giá` +
                (data.skippedCount > 0 ? `, ${data.skippedCount} đã có` : ''),
                'success'
            );
            onClose();
            setStep(1);
            setFormData({ reviewPeriod: '', reviewType: 'PERIODIC' });
            setSelectedIds(new Set());
            setSearchTerm('');
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const filteredEmployees = useMemo(() => {
        if (!searchTerm) return needingReview;
        const s = searchTerm.toLowerCase();
        return needingReview.filter(e =>
            (e.fullName || '').toLowerCase().includes(s) ||
            (e.positionName || '').toLowerCase().includes(s) ||
            (e.departmentName || '').toLowerCase().includes(s)
        );
    }, [needingReview, searchTerm]);

    const handleSelectAll = () => {
        if (selectedIds.size === filteredEmployees.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredEmployees.map(e => e.employeeId)));
        }
    };

    const handleToggle = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSearch = (period) => {
        setFormData(prev => ({ ...prev, reviewPeriod: period }));
        setStep(2);
        setSelectedIds(new Set());
        setSearchTerm('');
    };

    const handleCreate = () => {
        if (selectedIds.size === 0) {
            showToast('Vui lòng chọn ít nhất một nhân viên', 'warning');
            return;
        }
        bulkMutation.mutate({
            employeeIds: Array.from(selectedIds),
            reviewPeriod: formData.reviewPeriod,
            reviewType: formData.reviewType,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
        });
    };

    const currentYear = new Date().getFullYear();
    const periodSuggestions = useMemo(() => {
        const q = (n) => `Q${n}-${currentYear}`;
        const m = (n) => `${String(n).padStart(2, '0')}-${currentYear}`;
        return [q(1), q(2), q(3), q(4), m(1), m(2), m(3), m(4), m(5), m(6), m(7), m(8), m(9), m(10), m(11), m(12), String(currentYear)];
    }, [currentYear]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Tạo đánh giá hàng loạt</h2>
                        <p className="text-sm text-gray-500">
                            {step === 1 ? 'Chọn kỳ và loại đánh giá' : `${selectedIds.size}/${filteredEmployees.length} nhân viên được chọn`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Quay lại"
                            >
                                <i className="fa-solid fa-arrow-left" />
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <i className="fa-solid fa-xmark text-xl" />
                        </button>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="px-6 pt-4 flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-2 text-sm font-medium ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}>1</span>
                        Chọn kỳ đánh giá
                    </div>
                    <div className="flex-1 h-px bg-gray-200 mx-2" />
                    <div className={`flex items-center gap-2 text-sm font-medium ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}>2</span>
                        Chọn nhân viên
                    </div>
                    <div className="flex-1 h-px bg-gray-200 mx-2" />
                    <div className={`flex items-center gap-2 text-sm font-medium ${step >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}>3</span>
                        Tạo phiếu
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 min-h-0">
                    {step === 1 && (
                        <div className="space-y-5">
                            {/* Review Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Loại đánh giá</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {REVIEW_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, reviewType: t.value }))}
                                            className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                                                formData.reviewType === t.value
                                                    ? 'border-gray-900 bg-gray-900 text-white'
                                                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Period */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Kỳ đánh giá</label>
                                <input
                                    type="text"
                                    value={formData.reviewPeriod}
                                    onChange={e => setFormData(prev => ({ ...prev, reviewPeriod: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && formData.reviewPeriod) handleSearch(formData.reviewPeriod);
                                    }}
                                    className="input w-full"
                                    placeholder="VD: Q2-2026, 06-2026, 2026"
                                    list="period-suggestions"
                                />
                                <datalist id="period-suggestions">
                                    {periodSuggestions.map(p => <option key={p} value={p} />)}
                                </datalist>
                                <p className="text-xs text-gray-400 mt-1">Nhấn Enter hoặc click "Tiếp tục" để tìm nhân viên cần đánh giá</p>
                            </div>

                            {/* Quick period chips */}
                            <div>
                                <p className="text-xs text-gray-400 mb-2">Đề xuất nhanh:</p>
                                <div className="flex flex-wrap gap-2">
                                    {periodSuggestions.slice(0, 8).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, reviewPeriod: p }))}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg font-medium transition-colors"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600">
                                        <span className="font-semibold text-gray-900">{needingReview.length}</span> nhân viên cần đánh giá
                                    </span>
                                    <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded">{formData.reviewPeriod}</span>
                                </div>
                                <button
                                    onClick={handleSelectAll}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    {selectedIds.size === filteredEmployees.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 bg-white"
                                    placeholder="Tìm theo tên, chức vụ, phòng ban..."
                                />
                            </div>

                            {/* Employee list */}
                            {loadingNeeding ? (
                                <div className="py-12 text-center text-gray-400">
                                    <i className="fa-solid fa-spinner fa-spin text-xl" />
                                </div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="py-12 text-center">
                                    <i className="fa-solid fa-users text-3xl text-gray-300 mb-3" />
                                    <p className="text-sm text-gray-500">
                                        {searchTerm ? 'Không tìm thấy nhân viên' : 'Tất cả nhân viên đã có đánh giá cho kỳ này'}
                                    </p>
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
                                    {filteredEmployees.map(emp => (
                                        <label
                                            key={emp.employeeId}
                                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(emp.employeeId)}
                                                onChange={() => handleToggle(emp.employeeId)}
                                                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                            />
                                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm shrink-0">
                                                {(emp.fullName || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 text-sm truncate">{emp.fullName}</p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {[emp.positionName, emp.departmentName].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        Hủy
                    </button>
                    <div className="flex gap-2">
                        {step === 1 && (
                            <button
                                onClick={() => handleSearch(formData.reviewPeriod)}
                                disabled={!formData.reviewPeriod}
                                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                            >
                                Tiếp tục <i className="fa-solid fa-arrow-right ml-1" />
                            </button>
                        )}
                        {step === 2 && (
                            <button
                                onClick={handleCreate}
                                disabled={selectedIds.size === 0 || bulkMutation.isPending}
                                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                            >
                                {bulkMutation.isPending ? (
                                    <><i className="fa-solid fa-spinner fa-spin mr-2" />Đang tạo...</>
                                ) : (
                                    <><i className="fa-solid fa-plus mr-1" /> Tạo {selectedIds.size} phiếu đánh giá</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
