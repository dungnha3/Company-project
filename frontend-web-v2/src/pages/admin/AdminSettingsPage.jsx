import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const DEFAULT_SETTINGS = {
    maintenance_mode: false,
    allow_registration: true,
    default_trial_days: 14,
    max_login_attempts: 5,
    session_timeout_hours: 24,
    require_email_verification: true,
    enable_two_factor: false,
    min_password_length: 8,
};

export default function AdminSettingsPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [localSettings, setLocalSettings] = useState(DEFAULT_SETTINGS);
    const [hasChanges, setHasChanges] = useState(false);

    const { data: settings = {}, isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SYSADMIN.SETTINGS);
            return res.data;
        },
    });

    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            setLocalSettings({ ...DEFAULT_SETTINGS, ...settings });
            setHasChanges(false);
        }
    }, [settings]);

    const updateMutation = useMutation({
        mutationFn: (newSettings) => apiClient.put(ENDPOINTS.SYSADMIN.SETTINGS, newSettings),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-settings']);
            showToast('Đã lưu cài đặt', 'success');
            setHasChanges(false);
        },
        onError: (err) => showToast(err.message, 'error'),
    });

    const handleChange = (key, value) => {
        setLocalSettings((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateMutation.mutate(localSettings);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cài đặt hệ thống</h1>
                    <p className="text-gray-500 text-sm">Cấu hình toàn bộ hệ thống</p>
                </div>
                <div className="flex gap-3 items-center">
                    {hasChanges && (
                        <span className="text-amber-600 text-sm flex items-center gap-1">
                            <i className="fa-solid fa-circle text-[6px]" /> Có thay đổi chưa lưu
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || updateMutation.isPending}
                        className="btn-primary"
                    >
                        <i className="fa-solid fa-save" />
                        {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>

            {/* General Settings */}
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <i className="fa-solid fa-cog text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Cài đặt chung</h3>
                </div>

                <div className="space-y-4">
                    <ToggleField
                        label="Chế độ bảo trì"
                        description="Khi bật, người dùng sẽ thấy trang bảo trì"
                        checked={localSettings.maintenance_mode}
                        onChange={(val) => handleChange('maintenance_mode', val)}
                        warning={localSettings.maintenance_mode ? 'Hệ thống đang ở chế độ bảo trì!' : null}
                    />

                    <div className="bg-gray-50 rounded-xl p-4">
                        <label className="label">Số ngày dùng thử mặc định</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="input w-32"
                                value={localSettings.default_trial_days}
                                onChange={(e) => handleChange('default_trial_days', parseInt(e.target.value))}
                            />
                            <span className="text-gray-500 text-sm">ngày</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <i className="fa-solid fa-shield-halved text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Bảo mật</h3>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                        <label className="label">Số lần đăng nhập sai tối đa</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="input w-32"
                                value={localSettings.max_login_attempts}
                                onChange={(e) => handleChange('max_login_attempts', parseInt(e.target.value))}
                            />
                            <span className="text-gray-500 text-sm">lần</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                        <label className="label">Thời gian hết phiên</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="input w-32"
                                value={localSettings.session_timeout_hours}
                                onChange={(e) => handleChange('session_timeout_hours', parseInt(e.target.value))}
                            />
                            <span className="text-gray-500 text-sm">giờ</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                        <label className="label">Độ dài mật khẩu tối thiểu</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="input w-32"
                                value={localSettings.min_password_length}
                                onChange={(e) => handleChange('min_password_length', parseInt(e.target.value))}
                            />
                            <span className="text-gray-500 text-sm">ký tự</span>
                        </div>
                    </div>

                    <ToggleField
                        label="Xác thực 2 lớp (2FA)"
                        description="Yêu cầu xác thực 2 lớp cho tài khoản admin"
                        checked={localSettings.enable_two_factor}
                        onChange={(val) => handleChange('enable_two_factor', val)}
                    />
                </div>
            </div>

            {/* Registration Settings */}
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <i className="fa-solid fa-user-plus text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Đăng ký</h3>
                </div>

                <div className="space-y-4">
                    <ToggleField
                        label="Cho phép đăng ký mới"
                        description="Cho phép công ty mới đăng ký tài khoản"
                        checked={localSettings.allow_registration}
                        onChange={(val) => handleChange('allow_registration', val)}
                    />

                    <ToggleField
                        label="Bắt buộc xác thực email"
                        description="Yêu cầu xác thực email trước khi sử dụng"
                        checked={localSettings.require_email_verification}
                        onChange={(val) => handleChange('require_email_verification', val)}
                    />
                </div>
            </div>
        </div>
    );
}

function ToggleField({ label, description, checked, onChange, warning }) {
    return (
        <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex-1 mr-4">
                <span className="text-sm font-medium text-gray-900">{label}</span>
                {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
                {warning && (
                    <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-triangle-exclamation" /> {warning}
                    </p>
                )}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );
}
