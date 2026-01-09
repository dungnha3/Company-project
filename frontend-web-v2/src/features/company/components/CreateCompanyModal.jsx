import { useState } from 'react';
import { useAuthStore } from '@shared/stores/authStore';
import { useCompanyStore } from '@shared/stores/companyStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function CreateCompanyModal({ onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        taxCode: '',
        website: '',
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
    });

    const { fetchCompanyMemberships } = useAuthStore(); // Assuming this action exists or similar
    const toast = useToast();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // POST /api/companies
            await apiClient.post(ENDPOINTS.COMPANIES.CREATE, formData);
            toast.success('Tạo Workspace thành công!');

            // Refresh user memberships to show new company
            // Note: In real app, might need to call initAuth or specific refresh action
            // await fetchCompanyMemberships(); 
            window.location.reload(); // Simple refresh to reload state for now

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Create company error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo Workspace');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Tạo Workspace mới</h2>
                        <p className="text-sm text-gray-500">Thiết lập không gian làm việc của bạn</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <i className="fa-solid fa-xmark text-gray-500" />
                    </button>
                </div>

                {/* Steps Progress */}
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
                        <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-medium text-gray-500">
                        <span className={step >= 1 ? 'text-primary' : ''}>1. Thông tin chung</span>
                        <span className={step >= 2 ? 'text-primary' : ''}>2. Cấu hình ban đầu</span>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Tên Workspace <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="VD: Acme Corp"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="label">Mã số thuế</label>
                                    <input
                                        type="text"
                                        name="taxCode"
                                        value={formData.taxCode}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="VD: 0101234567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Địa chỉ</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Địa chỉ trụ sở chính"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Email liên hệ</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="contact@company.com"
                                    />
                                </div>
                                <div>
                                    <label className="label">Số điện thoại</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="0912345678"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="label">Website</label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">
                                        https://
                                    </span>
                                    <input
                                        type="text"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        className="input rounded-l-none"
                                        placeholder="www.example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Tiền tệ mặc định</label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="VND">VND (Việt Nam Đồng)</option>
                                        <option value="USD">USD (US Dollar)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Múi giờ</label>
                                    <select
                                        name="timezone"
                                        value={formData.timezone}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                                        <option value="UTC">UTC (GMT+0)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="btn-secondary"
                            disabled={loading}
                        >
                            Quay lại
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="btn-ghost"
                            disabled={loading}
                        >
                            Hủy bỏ
                        </button>
                    )}

                    {step < 2 ? (
                        <button
                            onClick={() => {
                                if (!formData.name) {
                                    toast.error('Vui lòng nhập tên Workspace');
                                    return;
                                }
                                setStep(step + 1)
                            }}
                            className="btn-primary"
                        >
                            Tiếp tục
                            <i className="fa-solid fa-arrow-right" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? (
                                <>
                                    <div className="loading-spinner w-4 h-4 border-2" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-check" />
                                    Hoàn tất
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
