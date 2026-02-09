import { useState } from 'react';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function CreateCompanyModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const toast = useToast();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên Workspace');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post(ENDPOINTS.COMPANIES.CREATE, formData);
            toast.success('Tạo Workspace thành công!');
            window.location.reload();
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Tạo Workspace mới</h2>
                        <p className="text-sm text-gray-500">Bắt đầu không gian làm việc của bạn</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <i className="fa-solid fa-xmark text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="label">Tên Workspace <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="input"
                            placeholder="VD: Công ty ABC, Team Marketing..."
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="label">Mô tả <span className="text-gray-400">(tùy chọn)</span></label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="input min-h-[80px] resize-none"
                            placeholder="Mô tả ngắn về workspace..."
                            rows={3}
                        />
                    </div>

                    <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                        <i className="fa-solid fa-circle-info mr-2" />
                        Bạn có thể thêm thông tin chi tiết (địa chỉ, email...) sau trong phần <strong>Cài đặt</strong>.
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="btn-ghost"
                        disabled={loading}
                    >
                        Hủy bỏ
                    </button>
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
                                <i className="fa-solid fa-plus mr-1" />
                                Tạo Workspace
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
