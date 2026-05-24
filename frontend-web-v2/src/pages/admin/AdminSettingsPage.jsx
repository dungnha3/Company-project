import { useState, useEffect } from 'react';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState({
        maxUsersPerCompany: 50,
        maxProjectsPerCompany: 20,
        defaultTrialDays: 14,
        enableRegistration: true,
        enableGoogleAuth: true,
        maintenanceMode: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(ENDPOINTS.SYSADMIN.SETTINGS);
            if (response.data) {
                setSettings(prev => ({ ...prev, ...response.data }));
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.put(ENDPOINTS.SYSADMIN.SETTINGS, settings);
            toast.success('Đã lưu cài đặt thành công');
        } catch (error) {
            toast.error('Không thể lưu cài đặt');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cấu hình Global</h1>
                    <p className="text-gray-500 mt-1">Thiết lập các thông số hệ thống</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-save" />
                            Lưu thay đổi
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-6">
                {/* Quotas Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <i className="fa-solid fa-layer-group text-indigo-600" />
                        Giới hạn & quotas
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Số user tối đa / Workspace
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={settings.maxUsersPerCompany}
                                onChange={(e) => setSettings(prev => ({ ...prev, maxUsersPerCompany: parseInt(e.target.value) || 1 }))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Số dự án tối đa / Workspace
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={settings.maxProjectsPerCompany}
                                onChange={(e) => setSettings(prev => ({ ...prev, maxProjectsPerCompany: parseInt(e.target.value) || 1 }))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Số ngày dùng thử mặc định
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.defaultTrialDays}
                                onChange={(e) => setSettings(prev => ({ ...prev, defaultTrialDays: parseInt(e.target.value) || 0 }))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Authentication Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved text-indigo-600" />
                        Xác thực
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div>
                                <p className="font-medium text-gray-900">Cho phép đăng ký</p>
                                <p className="text-sm text-gray-500">Người dùng mới có thể tự tạo tài khoản</p>
                            </div>
                            <button
                                onClick={() => handleToggle('enableRegistration')}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    settings.enableRegistration ? 'bg-indigo-600' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    settings.enableRegistration ? 'left-7' : 'left-1'
                                }`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="font-medium text-gray-900">Đăng nhập Google</p>
                                <p className="text-sm text-gray-500">Cho phép đăng nhập bằng tài khoản Google</p>
                            </div>
                            <button
                                onClick={() => handleToggle('enableGoogleAuth')}
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                    settings.enableGoogleAuth ? 'bg-indigo-600' : 'bg-gray-300'
                                }`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    settings.enableGoogleAuth ? 'left-7' : 'left-1'
                                }`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* System Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <i className="fa-solid fa-server text-indigo-600" />
                        Hệ thống
                    </h2>
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="font-medium text-gray-900">Chế độ bảo trì</p>
                            <p className="text-sm text-gray-500">Tạm khóa truy cập người dùng (chỉ admin được vào)</p>
                        </div>
                        <button
                            onClick={() => handleToggle('maintenanceMode')}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-300'
                            }`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.maintenanceMode ? 'left-7' : 'left-1'
                            }`} />
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                    <h2 className="text-lg font-semibold text-red-600 mb-6 flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation" />
                        Vùng nguy hiểm
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-red-100">
                            <div>
                                <p className="font-medium text-gray-900">Xóa toàn bộ dữ liệu</p>
                                <p className="text-sm text-gray-500">Xóa tất cả data (không thể khôi phục)</p>
                            </div>
                            <button
                                onClick={() => window.confirm('Chức năng này đã bị vô hiệu hóa vì lý do bảo mật')}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                                Vô hiệu hóa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
