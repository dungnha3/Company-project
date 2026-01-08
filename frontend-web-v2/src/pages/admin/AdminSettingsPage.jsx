import { useState } from 'react';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState({
        allowRegistration: true,
        maintenanceMode: false,
        maxCompaniesPerUser: 5,
        defaultTrialDays: 14
    });

    return (
        <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Cấu hình Global</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                {/* General Settings */}
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Thiết lập chung</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="font-medium text-gray-700">Cho phép đăng ký mới</label>
                                <p className="text-sm text-gray-500">Người dùng có thể tự tạo tài khoản mới</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={settings.allowRegistration} onChange={() => setSettings({ ...settings, allowRegistration: !settings.allowRegistration })} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="font-medium text-gray-700">Chế độ bảo trì</label>
                                <p className="text-sm text-gray-500">Tạm ngưng truy cập cho toàn bộ users (trừ Admin)</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={settings.maintenanceMode} onChange={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Limits */}
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Giới hạn & Mặc định</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="label">Số công ty tối đa / User</label>
                            <input type="number" className="input" value={settings.maxCompaniesPerUser} onChange={(e) => setSettings({ ...settings, maxCompaniesPerUser: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="label">Số ngày dùng thử mặc định</label>
                            <input type="number" className="input" value={settings.defaultTrialDays} onChange={(e) => setSettings({ ...settings, defaultTrialDays: parseInt(e.target.value) })} />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 flex justify-end">
                    <button className="btn-primary">Lưu thay đổi</button>
                </div>
            </div>
        </div>
    );
}
