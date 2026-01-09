import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { fetchWorkspaces, selectWorkspace } = useWorkspaceStore();
    const toast = useToast();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        size: '1-10',
        industry: 'technology',
        phoneNumber: '',
        address: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Vui lòng nhập tên Workspace');
            return;
        }

        setLoading(true);
        try {
            // 1. Create Company/Workspace
            const response = await apiClient.post(ENDPOINTS.COMPANIES.CREATE, {
                name: formData.name,
            });

            if (response.data) {
                toast.success('Tạo Workspace thành công!');
                // 2. Refresh workspaces and select the new one
                await fetchWorkspaces();
                selectWorkspace(response.data);
                navigate('/app', { replace: true });
            }
        } catch (error) {
            console.error('Setup failed:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Side - Visual */}
            <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative overflow-hidden items-center justify-center p-12 text-white">
                <div className="absolute inset-0 bg-pattern opacity-10" />
                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-bold mb-6">Bắt đầu hành trình quản trị số hóa</h2>
                    <ul className="space-y-4 text-indigo-100 text-lg">
                        <li className="flex items-center gap-3">
                            <i className="fa-solid fa-check-circle" />
                            <span>Quản lý nhân sự tập trung</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <i className="fa-solid fa-check-circle" />
                            <span>Theo dõi dự án realtime</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <i className="fa-solid fa-check-circle" />
                            <span>Tự động hóa tính lương</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-indigo-600 text-xl">
                            <i className="fa-solid fa-rocket" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Thiết lập Workspace</h1>
                        <p className="text-gray-500 mt-2">Tạo không gian làm việc đầu tiên cho doanh nghiệp của bạn</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên doanh nghiệp / Tổ chức
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                placeholder="Ví dụ: Tech Global Corp"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quy mô
                                </label>
                                <select
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 transition-colors bg-white"
                                    value={formData.size}
                                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                                >
                                    <option value="1-10">1-10 nhân sự</option>
                                    <option value="11-50">11-50 nhân sự</option>
                                    <option value="51-200">51-200 nhân sự</option>
                                    <option value="201+">Trên 200 nhân sự</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Lĩnh vực
                                </label>
                                <select
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 transition-colors bg-white"
                                    value={formData.industry}
                                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                >
                                    <option value="technology">Công nghệ</option>
                                    <option value="retail">Bán lẻ</option>
                                    <option value="manufacturing">Sản xuất</option>
                                    <option value="education">Giáo dục</option>
                                    <option value="other">Khác</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Đang khởi tạo...
                                </>
                            ) : (
                                <>
                                    Hoàn tất thiết lập
                                    <i className="fa-solid fa-arrow-right" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
