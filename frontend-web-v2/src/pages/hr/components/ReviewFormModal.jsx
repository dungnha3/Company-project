import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatNumber } from '@shared/utils/formatters';

export default function ReviewFormModal({ isOpen, onClose, review }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const isEdit = !!review;

    const [formData, setFormData] = useState({
        employeeId: '',
        reviewPeriod: '',
        reviewType: 'QUARTERLY',
        technicalScore: '',
        attitudeScore: '',
        teamworkScore: '',
        leadershipScore: '',
        comments: '',
        nextGoals: '',
        developmentPlan: '',
    });

    // Load employees for dropdown
    const { data: employees } = useQuery({
        queryKey: ['employees-list'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST)).data,
    });

    // Initialize form when editing
    useEffect(() => {
        if (review) {
            setFormData({
                employeeId: review.employee?.employeeId || review.employeeId || '',
                reviewPeriod: review.reviewPeriod || '',
                reviewType: review.reviewType || 'QUARTERLY',
                technicalScore: review.technicalScore ?? '',
                attitudeScore: review.attitudeScore ?? '',
                teamworkScore: review.teamworkScore ?? '',
                leadershipScore: review.leadershipScore ?? '',
                comments: review.comments || '',
                nextGoals: review.nextGoals || '',
                developmentPlan: review.developmentPlan || '',
            });
        }
    }, [review]);

    const createMutation = useMutation({
        mutationFn: (data) => apiClient.post(ENDPOINTS.REVIEWS.CREATE, data),
        onSuccess: () => {
            showToast('Tạo đánh giá thành công', 'success');
            queryClient.invalidateQueries(['reviews']);
            queryClient.invalidateQueries(['reviews-stats']);
            onClose();
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const updateMutation = useMutation({
        mutationFn: (data) => apiClient.put(ENDPOINTS.REVIEWS.UPDATE(review.reviewId || review.id), data),
        onSuccess: () => {
            showToast('Cập nhật đánh giá thành công', 'success');
            queryClient.invalidateQueries(['reviews']);
            queryClient.invalidateQueries(['reviews-stats']);
            onClose();
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            employeeId: parseInt(formData.employeeId),
            reviewPeriod: formData.reviewPeriod,
            reviewType: formData.reviewType,
            technicalScore: formData.technicalScore ? parseFloat(formData.technicalScore) : null,
            attitudeScore: formData.attitudeScore ? parseFloat(formData.attitudeScore) : null,
            teamworkScore: formData.teamworkScore ? parseFloat(formData.teamworkScore) : null,
            leadershipScore: formData.leadershipScore ? parseFloat(formData.leadershipScore) : null,
            comments: formData.comments,
            nextGoals: formData.nextGoals,
            developmentPlan: formData.developmentPlan,
        };

        if (isEdit) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;
    const employeeList = Array.isArray(employees) ? employees : employees?.content || [];

    // Calculate average score
    const scores = [formData.technicalScore, formData.attitudeScore, formData.teamworkScore, formData.leadershipScore]
        .filter(s => s !== '' && s != null)
        .map(s => parseFloat(s));
    const avgScore = scores.length > 0 ? formatNumber(scores.reduce((a, b) => a + b, 0) / scores.length, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-';

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {isEdit ? 'Chỉnh sửa đánh giá' : 'Tạo đánh giá mới'}
                            </h2>
                            <p className="text-sm text-gray-500">Đánh giá hiệu suất nhân viên</p>
                        </div>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <i className="fa-solid fa-xmark text-xl" />
                        </button>
                    </div>

                    {/* Body - scrollable */}
                    <div className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                        {/* Employee and Period */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-required">Nhân viên</label>
                                <select
                                    name="employeeId"
                                    value={formData.employeeId}
                                    onChange={handleChange}
                                    className="input w-full"
                                    required
                                    disabled={isEdit}
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employeeList.map(emp => (
                                        <option key={emp.employeeId || emp.id} value={emp.employeeId || emp.id}>
                                            {emp.fullName} ({emp.employeeCode || emp.employeeId})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label-required">Kỳ đánh giá</label>
                                <input
                                    type="text"
                                    name="reviewPeriod"
                                    value={formData.reviewPeriod}
                                    onChange={handleChange}
                                    className="input w-full"
                                    placeholder="VD: Q1-2024, 2024"
                                    required
                                />
                            </div>
                        </div>

                        {/* Review Type */}
                        <div>
                            <label className="label-required">Loại đánh giá</label>
                            <select
                                name="reviewType"
                                value={formData.reviewType}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            >
                                <option value="QUARTERLY">Theo quý</option>
                                <option value="SEMI_ANNUAL">Nửa năm</option>
                                <option value="ANNUAL">Cuối năm</option>
                                <option value="PROBATION">Thử việc</option>
                            </select>
                        </div>

                        {/* Score Grid */}
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700">Điểm đánh giá (0-10)</h3>
                                <div className="text-sm">
                                    Điểm TB: <span className={`font-bold ${avgScore >= 8 ? 'text-green-600' : avgScore >= 6 ? 'text-indigo-600' : avgScore >= 4 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                        {avgScore}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <ScoreInput
                                    label="Chuyên môn"
                                    name="technicalScore"
                                    value={formData.technicalScore}
                                    onChange={handleChange}
                                    icon="fa-code"
                                />
                                <ScoreInput
                                    label="Thái độ"
                                    name="attitudeScore"
                                    value={formData.attitudeScore}
                                    onChange={handleChange}
                                    icon="fa-heart"
                                />
                                <ScoreInput
                                    label="Làm việc nhóm"
                                    name="teamworkScore"
                                    value={formData.teamworkScore}
                                    onChange={handleChange}
                                    icon="fa-users"
                                />
                                <ScoreInput
                                    label="Năng lực lãnh đạo"
                                    name="leadershipScore"
                                    value={formData.leadershipScore}
                                    onChange={handleChange}
                                    icon="fa-star"
                                />
                            </div>
                        </div>

                        {/* Comments */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nhận xét chung</label>
                            <textarea
                                name="comments"
                                value={formData.comments}
                                onChange={handleChange}
                                className="input w-full"
                                rows="3"
                                placeholder="Nhận xét về hiệu suất làm việc..."
                            />
                        </div>

                        {/* Goals and Development */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mục tiêu tiếp theo</label>
                                <textarea
                                    name="nextGoals"
                                    value={formData.nextGoals}
                                    onChange={handleChange}
                                    className="input w-full"
                                    rows="2"
                                    placeholder="Mục tiêu cho kỳ tiếp theo..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kế hoạch phát triển</label>
                                <textarea
                                    name="developmentPlan"
                                    value={formData.developmentPlan}
                                    onChange={handleChange}
                                    className="input w-full"
                                    rows="2"
                                    placeholder="Kế hoạch đào tạo, phát triển..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                        <button type="button" onClick={onClose} className="btn-ghost">
                            Hủy
                        </button>
                        <button type="submit" disabled={isPending} className="btn-primary">
                            {isPending ? (
                                <><i className="fa-solid fa-spinner fa-spin mr-2" /> Đang xử lý...</>
                            ) : isEdit ? (
                                <><i className="fa-solid fa-save mr-2" /> Lưu thay đổi</>
                            ) : (
                                <><i className="fa-solid fa-plus mr-2" /> Tạo đánh giá</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ScoreInput({ label, name, value, onChange, icon }) {
    const numValue = value !== '' ? parseFloat(value) : null;
    let bgColor = 'bg-gray-100';
    if (numValue !== null) {
        if (numValue >= 8) bgColor = 'bg-green-100';
        else if (numValue >= 6) bgColor = 'bg-indigo-100';
        else if (numValue >= 4) bgColor = 'bg-yellow-100';
        else bgColor = 'bg-red-100';
    }

    return (
        <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
                <i className={`fa-solid ${icon} mr-1 text-gray-400`} /> {label}
            </label>
            <div className="relative">
                <input
                    type="number"
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={`input w-full pr-12 ${bgColor} border-0`}
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="0-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    /10
                </div>
            </div>
        </div>
    );
}
