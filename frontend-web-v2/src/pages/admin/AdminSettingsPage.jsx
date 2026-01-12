import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { useToast } from '@app/providers/ToastProvider';

export default function AdminSettingsPage() {
    const queryClient = useQueryClient();
    const toast = useToast();

    // Fetch global settings from API (or use defaults)
    const { data: settings, isLoading } = useQuery({
        queryKey: ['admin-global-settings'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/api/admin/settings');
                return response.data;
            } catch {
                // Return defaults if endpoint doesn't exist yet
                return {
                    allowRegistration: true,
                    maintenanceMode: false,
                    maxCompaniesPerUser: 5,
                    defaultTrialDays: 14,
                    emailVerificationRequired: false,
                    selfSignupEnabled: true,
                    defaultPlan: 'FREE',
                    gracePeriodDays: 7,
                };
            }
        }
    });

    const [formData, setFormData] = useState(null);

    // Initialize form when data loads
    if (settings && !formData) {
        setFormData(settings);
    }

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            return apiClient.put('/api/admin/settings', data);
        },
        onSuccess: () => {
            toast.success('Đã lưu cài đặt thành công');
            queryClient.invalidateQueries(['admin-global-settings']);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Không thể lưu cài đặt');
        }
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        saveMutation.mutate(formData);
    };

    if (isLoading || !formData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cài đặt Hệ thống</h1>
                    <p className="text-gray-500 text-sm mt-1">Quản lý cấu hình toàn cầu cho nền tảng SaaS</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="btn-primary"
                >
                    {saveMutation.isPending ? (
                        <>
                            <div className="loading-spinner w-4 h-4 border-2" />
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-save mr-2" />
                            Lưu thay đổi
                        </>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Registration & Access */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <i className="fa-solid fa-user-plus text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Đăng ký & Truy cập</h3>
                                <p className="text-xs text-gray-500">Kiểm soát cách người dùng đăng ký</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        <ToggleSetting
                            label="Cho phép đăng ký mới"
                            description="Người dùng có thể tự tạo tài khoản"
                            checked={formData.allowRegistration}
                            onChange={(v) => handleChange('allowRegistration', v)}
                        />
                        <ToggleSetting
                            label="Yêu cầu xác minh Email"
                            description="Bắt buộc xác thực email trước khi sử dụng"
                            checked={formData.emailVerificationRequired}
                            onChange={(v) => handleChange('emailVerificationRequired', v)}
                        />
                        <ToggleSetting
                            label="Chế độ bảo trì"
                            description="Tạm ngưng truy cập (trừ System Admin)"
                            checked={formData.maintenanceMode}
                            onChange={(v) => handleChange('maintenanceMode', v)}
                            danger
                        />
                    </div>
                </div>

                {/* Plan & Subscription */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                <i className="fa-solid fa-crown text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Gói & Subscription</h3>
                                <p className="text-xs text-gray-500">Cấu hình mặc định cho người dùng mới</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="label">Gói mặc định cho Workspace mới</label>
                            <select
                                className="input"
                                value={formData.defaultPlan}
                                onChange={(e) => handleChange('defaultPlan', e.target.value)}
                            >
                                <option value="FREE">Free</option>
                                <option value="STARTER">Starter</option>
                                <option value="PROFESSIONAL">Professional</option>
                                <option value="ENTERPRISE">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Số ngày dùng thử</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="input w-24"
                                    value={formData.defaultTrialDays}
                                    onChange={(e) => handleChange('defaultTrialDays', parseInt(e.target.value) || 0)}
                                    min={0}
                                    max={90}
                                />
                                <span className="text-gray-500 text-sm">ngày</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Thời gian dùng thử trước khi cần nâng cấp</p>
                        </div>
                        <div>
                            <label className="label">Grace Period khi hết hạn</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="input w-24"
                                    value={formData.gracePeriodDays}
                                    onChange={(e) => handleChange('gracePeriodDays', parseInt(e.target.value) || 0)}
                                    min={0}
                                    max={30}
                                />
                                <span className="text-gray-500 text-sm">ngày</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Thời gian ân hạn trước khi tắt tính năng</p>
                        </div>
                    </div>
                </div>

                {/* Limits */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                <i className="fa-solid fa-gauge-high text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Giới hạn Hệ thống</h3>
                                <p className="text-xs text-gray-500">Quota và giới hạn mặc định</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="label">Số Workspace tối đa / User</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.maxCompaniesPerUser}
                                onChange={(e) => handleChange('maxCompaniesPerUser', parseInt(e.target.value) || 1)}
                                min={1}
                                max={50}
                            />
                            <p className="text-xs text-gray-400 mt-1">Số công ty/workspace một người có thể tham gia</p>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-red-100 bg-gradient-to-r from-red-50 to-pink-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                <i className="fa-solid fa-triangle-exclamation text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-800">Danger Zone</h3>
                                <p className="text-xs text-red-500">Các thao tác nguy hiểm</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                            <div>
                                <div className="font-medium text-red-800">Xóa Cache Hệ thống</div>
                                <p className="text-xs text-red-600">Xóa toàn bộ cache, có thể gây chậm tạm thời</p>
                            </div>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                                Xóa Cache
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                            <div>
                                <div className="font-medium text-red-800">Reset Demo Data</div>
                                <p className="text-xs text-red-600">Xóa tất cả dữ liệu demo và test</p>
                            </div>
                            <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToggleSetting({ label, description, checked, onChange, danger = false }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <label className={`font-medium ${danger ? 'text-red-700' : 'text-gray-700'}`}>{label}</label>
                <p className={`text-sm ${danger ? 'text-red-500' : 'text-gray-500'}`}>{description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={() => onChange(!checked)}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${danger ? 'peer-checked:bg-red-600' : 'peer-checked:bg-indigo-600'}`}></div>
            </label>
        </div>
    );
}
