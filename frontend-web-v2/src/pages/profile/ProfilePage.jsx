import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/stores/authStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const TABS = [
    { id: 'info', icon: 'fa-user', label: 'Thông tin' },
    { id: 'security', icon: 'fa-shield-alt', label: 'Bảo mật' },
    { id: 'notifications', icon: 'fa-bell', label: 'Thông báo' },
    { id: 'sessions', icon: 'fa-laptop', label: 'Phiên đăng nhập' },
];

export default function ProfilePage() {
    const { user, updateUser } = useAuthStore();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('info');
    const fileInputRef = useRef(null);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header with Avatar */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative flex items-center gap-6">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-4xl font-bold overflow-hidden">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                user?.fullName?.charAt(0)?.toUpperCase() || 'U'
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                            <i className="fa-solid fa-camera text-lg" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) toast.info('Upload avatar chưa được implement');
                            }}
                        />
                    </div>

                    {/* Info */}
                    <div>
                        <h1 className="text-2xl font-bold">{user?.fullName || 'User'}</h1>
                        <p className="text-blue-200">{user?.email}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-xs">
                                {user?.role || 'Member'}
                            </span>
                            <span className="text-blue-200 text-sm">
                                Tham gia: {new Date(user?.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className={`fa-solid ${tab.icon}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {activeTab === 'info' && <ProfileInfoTab user={user} />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'notifications' && <NotificationsTab />}
                {activeTab === 'sessions' && <SessionsTab />}
            </div>
        </div>
    );
}

function ProfileInfoTab({ user }) {
    const toast = useToast();
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        bio: user?.bio || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            // await apiClient.put(ENDPOINTS.USERS.BY_ID(user.userId), formData);
            toast.success('Đã cập nhật thông tin!');
        } catch (err) {
            toast.error('Lỗi khi cập nhật');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Thông tin cá nhân</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    label="Họ và tên"
                    value={formData.fullName}
                    onChange={(v) => setFormData({ ...formData, fullName: v })}
                />
                <FormField
                    label="Email"
                    value={formData.email}
                    onChange={(v) => setFormData({ ...formData, email: v })}
                    disabled
                />
                <FormField
                    label="Số điện thoại"
                    value={formData.phone}
                    onChange={(v) => setFormData({ ...formData, phone: v })}
                    placeholder="Chưa cập nhật"
                />
                <FormField
                    label="Địa chỉ"
                    value={formData.address}
                    onChange={(v) => setFormData({ ...formData, address: v })}
                    placeholder="Chưa cập nhật"
                />
            </div>

            <FormField
                label="Giới thiệu"
                value={formData.bio}
                onChange={(v) => setFormData({ ...formData, bio: v })}
                multiline
                placeholder="Viết vài dòng giới thiệu về bản thân..."
            />

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? (
                        <><i className="fa-solid fa-spinner fa-spin" /> Đang lưu...</>
                    ) : (
                        <><i className="fa-solid fa-check" /> Lưu thay đổi</>
                    )}
                </button>
            </div>
        </div>
    );
}

function SecurityTab() {
    const toast = useToast();
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }
        if (passwords.new.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        try {
            // await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, passwords);
            toast.success('Đã đổi mật khẩu thành công!');
            setShowChangePassword(false);
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            toast.error('Mật khẩu cũ không đúng');
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Bảo mật tài khoản</h3>

            {/* Change Password */}
            <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <i className="fa-solid fa-key text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800">Mật khẩu</h4>
                            <p className="text-sm text-gray-500">Cập nhật mật khẩu đăng nhập</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowChangePassword(!showChangePassword)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
                    >
                        {showChangePassword ? 'Hủy' : 'Đổi mật khẩu'}
                    </button>
                </div>

                {showChangePassword && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                        <FormField
                            label="Mật khẩu hiện tại"
                            type="password"
                            value={passwords.current}
                            onChange={(v) => setPasswords({ ...passwords, current: v })}
                        />
                        <FormField
                            label="Mật khẩu mới"
                            type="password"
                            value={passwords.new}
                            onChange={(v) => setPasswords({ ...passwords, new: v })}
                        />
                        <FormField
                            label="Xác nhận mật khẩu"
                            type="password"
                            value={passwords.confirm}
                            onChange={(v) => setPasswords({ ...passwords, confirm: v })}
                        />
                        <button
                            onClick={handleChangePassword}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                        >
                            Cập nhật mật khẩu
                        </button>
                    </div>
                )}
            </div>

            {/* Two Factor */}
            <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <i className="fa-solid fa-shield-check text-green-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800">Xác thực 2 lớp (2FA)</h4>
                            <p className="text-sm text-gray-500">Thêm lớp bảo mật với ứng dụng authenticator</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setTwoFactorEnabled(!twoFactorEnabled);
                            toast.info(twoFactorEnabled ? '2FA đã tắt' : '2FA chưa được implement');
                        }}
                        className={`relative w-14 h-7 rounded-full transition-colors ${twoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${twoFactorEnabled ? 'left-8' : 'left-1'
                            }`} />
                    </button>
                </div>
            </div>

            {/* Delete Account */}
            <div className="border border-red-200 bg-red-50 rounded-xl p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                            <i className="fa-solid fa-trash text-red-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-red-800">Xóa tài khoản</h4>
                            <p className="text-sm text-red-600">Hành động này không thể hoàn tác</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium">
                        Xóa tài khoản
                    </button>
                </div>
            </div>
        </div>
    );
}

function NotificationsTab() {
    const [settings, setSettings] = useState({
        emailNewMessage: true,
        emailMentions: true,
        emailWeeklyDigest: false,
        pushDesktop: true,
        pushMobile: true,
        soundEnabled: true,
    });

    const toggleSetting = (key) => {
        setSettings({ ...settings, [key]: !settings[key] });
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Cài đặt thông báo</h3>

            {/* Email Notifications */}
            <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Email</h4>
                <div className="space-y-3">
                    <NotificationRow
                        icon="fa-envelope"
                        title="Tin nhắn mới"
                        desc="Nhận email khi có tin nhắn mới"
                        enabled={settings.emailNewMessage}
                        onToggle={() => toggleSetting('emailNewMessage')}
                    />
                    <NotificationRow
                        icon="fa-at"
                        title="Khi được mention"
                        desc="Nhận email khi ai đó @bạn"
                        enabled={settings.emailMentions}
                        onToggle={() => toggleSetting('emailMentions')}
                    />
                    <NotificationRow
                        icon="fa-calendar-week"
                        title="Báo cáo tuần"
                        desc="Nhận email tổng hợp hoạt động tuần"
                        enabled={settings.emailWeeklyDigest}
                        onToggle={() => toggleSetting('emailWeeklyDigest')}
                    />
                </div>
            </div>

            {/* Push Notifications */}
            <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Push</h4>
                <div className="space-y-3">
                    <NotificationRow
                        icon="fa-desktop"
                        title="Desktop"
                        desc="Thông báo trên trình duyệt"
                        enabled={settings.pushDesktop}
                        onToggle={() => toggleSetting('pushDesktop')}
                    />
                    <NotificationRow
                        icon="fa-mobile"
                        title="Mobile"
                        desc="Thông báo trên điện thoại"
                        enabled={settings.pushMobile}
                        onToggle={() => toggleSetting('pushMobile')}
                    />
                    <NotificationRow
                        icon="fa-volume-high"
                        title="Âm thanh"
                        desc="Phát âm thanh khi có thông báo"
                        enabled={settings.soundEnabled}
                        onToggle={() => toggleSetting('soundEnabled')}
                    />
                </div>
            </div>
        </div>
    );
}

function SessionsTab() {
    const toast = useToast();
    const sessions = [
        { id: 1, device: 'Chrome on Windows', location: 'Hồ Chí Minh, VN', lastActive: 'Đang hoạt động', current: true },
        { id: 2, device: 'Safari on iPhone', location: 'Hồ Chí Minh, VN', lastActive: '2 giờ trước', current: false },
        { id: 3, device: 'Firefox on MacOS', location: 'Hà Nội, VN', lastActive: '3 ngày trước', current: false },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Phiên đăng nhập</h3>
                <button
                    onClick={() => toast.info('Đăng xuất tất cả chưa implement')}
                    className="text-sm text-red-600 hover:underline"
                >
                    Đăng xuất tất cả
                </button>
            </div>

            <div className="space-y-3">
                {sessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.current ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                <i className={`fa-solid ${session.device.includes('iPhone') ? 'fa-mobile' :
                                        session.device.includes('Mac') ? 'fa-desktop' : 'fa-laptop'
                                    } ${session.current ? 'text-green-600' : 'text-gray-500'}`} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800">{session.device}</span>
                                    {session.current && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                            Phiên hiện tại
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {session.location} • {session.lastActive}
                                </div>
                            </div>
                        </div>
                        {!session.current && (
                            <button
                                onClick={() => toast.info('Đăng xuất phiên này')}
                                className="text-sm text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg"
                            >
                                Đăng xuất
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function FormField({ label, value, onChange, placeholder, disabled, multiline, type = 'text' }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                />
            )}
        </div>
    );
}

function NotificationRow({ icon, title, desc, enabled, onToggle }) {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <i className={`fa-solid ${icon} text-gray-500`} />
                </div>
                <div>
                    <div className="font-medium text-gray-800">{title}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-7' : 'left-1'
                    }`} />
            </button>
        </div>
    );
}
