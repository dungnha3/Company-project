import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/stores/authStore';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import { Avatar } from '@shared/components/OptimizedImage';
import useThemeStore from '@shared/stores/themeStore';

const TABS = [
    { id: 'info', icon: 'fa-user', label: 'Thông tin' },
    { id: 'security', icon: 'fa-shield-alt', label: 'Bảo mật' },
    { id: 'notifications', icon: 'fa-bell', label: 'Thông báo' },
    { id: 'preferences', icon: 'fa-sliders', label: 'Tùy chỉnh' },
    { id: 'sessions', icon: 'fa-laptop', label: 'Phiên đăng nhập' },
];

export default function ProfilePage() {
    const { user, updateUser } = useAuthStore();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => {
        const tab = searchParams.get('tab');
        return TABS.some(t => t.id === tab) ? tab : 'info';
    });
    const fileInputRef = useRef(null);

    // Sync tab with URL query param
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && TABS.some(t => t.id === tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    return (
        <div className="space-y-6">
            {/* Header with Avatar */}
            <div className="flex items-center justify-between px-6 py-5 border border-gray-200 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-3xl font-bold color-main overflow-hidden">
                            {user?.avatarUrl ? (
                                <Avatar src={user.avatarUrl} name={user.fullName} size="xl" className="w-full h-full" />
                            ) : (
                                user?.fullName?.charAt(0)?.toUpperCase() || 'U'
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:cursor-not-allowed"
                        >
                            <i className="fa-solid fa-camera text-lg text-white" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        const res = await apiClient.post(ENDPOINTS.PROFILE.UPLOAD_AVATAR, formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        updateUser({ ...user, avatarUrl: res.data.avatarUrl || res.data.url });
                                        toast.success('Cập nhật ảnh đại diện thành công');
                                    } catch (err) {
                                        toast.error('Lỗi khi tải ảnh lên');
                                        console.error(err);
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* Info */}
                    <div>
                        <h1 className="text-2xl font-black color-main">{user?.fullName || 'User'}</h1>
                        <p className="text-sm color-slate">{user?.email}</p>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs color-slate">
                                Tham gia: {formatDate(user?.createdAt || Date.now())}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'bg-white color-blue shadow-sm border border-gray-200'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className={`fa-solid ${tab.icon}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div role="dialog" aria-modal="true" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {activeTab === 'info' && <ProfileInfoTab user={user} />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'notifications' && <NotificationsTab />}
                {activeTab === 'preferences' && <PreferencesTab />}
                {activeTab === 'sessions' && <SessionsTab />}
            </div>
        </div>
    );
}

function ProfileInfoTab({ user }) {
    const toast = useToast();
    const { updateUser } = useAuthStore();
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
            const response = await apiClient.put(ENDPOINTS.PROFILE.UPDATE, formData);
            updateUser(response.data);
            toast.success('Đã cập nhật thông tin!');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
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
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2"
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
    const { logout } = useAuthStore();
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    // 2FA State
    const [twoFaStep, setTwoFaStep] = useState('idle'); // idle, setup, verify, backupCodes, disabling
    const [twoFaData, setTwoFaData] = useState(null); // { secret, qrCodeUri }
    const [twoFaCode, setTwoFaCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [disablePassword, setDisablePassword] = useState('');

    const { user } = useAuthStore();

    // Use 2FA status from authStore user object (no extra API call needed)
    const [is2faEnabled, setIs2faEnabled] = useState(user?.twoFactorEnabled || false);

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
            await apiClient.post(ENDPOINTS.PROFILE.CHANGE_PASSWORD, passwords);
            toast.success('Đã đổi mật khẩu thành công!');
            setShowChangePassword(false);
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Mật khẩu cũ không đúng');
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            toast.error('Vui lòng nhập mật khẩu xác nhận');
            return;
        }
        setDeleting(true);
        try {
            await apiClient.delete(ENDPOINTS.PROFILE.DELETE_ACCOUNT, {
                data: { password: deletePassword }
            });
            toast.success('Tài khoản đã được xóa');
            logout();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Mật khẩu không đúng');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Bảo mật tài khoản</h3>

            {/* Change Password */}
            <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <i className="fa-solid fa-key text-indigo-600" />
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
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                        >
                            Cập nhật mật khẩu
                        </button>
                    </div>
                )}
            </div>

            {/* Two-Factor Authentication */}
            <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${is2faEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <i className={`fa-solid fa-shield-halved ${is2faEnabled ? 'text-green-600' : 'text-gray-500'}`} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800">Xác thực hai yếu tố (2FA)</h4>
                            <p className="text-sm text-gray-500">
                                {is2faEnabled ? (
                                    <span className="text-green-600 font-medium"><i className="fa-solid fa-check-circle mr-1" />Đang bật</span>
                                ) : (
                                    'Bảo vệ tài khoản bằng mã xác thực từ ứng dụng Authenticator'
                                )}
                            </p>
                        </div>
                    </div>
                    {!is2faEnabled ? (
                        <button
                            onClick={async () => {
                                try {
                                    const res = await apiClient.post(ENDPOINTS.PROFILE.TWO_FACTOR_SETUP);
                                    setTwoFaData(res.data);
                                    setTwoFaStep('setup');
                                } catch (err) {
                                    toast.error(err.response?.data?.message || 'Lỗi khi thiết lập 2FA');
                                }
                            }}
                            disabled={twoFaStep !== 'idle'}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            Bật 2FA
                        </button>
                    ) : (
                        <button
                            onClick={() => setTwoFaStep(twoFaStep === 'disabling' ? 'idle' : 'disabling')}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
                        >
                            {twoFaStep === 'disabling' ? 'Hủy' : 'Tắt 2FA'}
                        </button>
                    )}
                </div>

                {/* Setup step: show QR code URI */}
                {twoFaStep === 'setup' && twoFaData && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800 font-medium mb-2">
                                <i className="fa-solid fa-info-circle mr-2" />
                                Mở Google Authenticator và quét mã hoặc nhập thủ công:
                            </p>
                            <div className="bg-white border rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-500 mb-2">Sao chép liên kết này vào app Authenticator:</p>
                                <code className="text-xs break-all text-gray-700 select-all">{twoFaData.qrCodeUri}</code>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Secret key: <code className="bg-gray-100 px-1 rounded select-all">{twoFaData.secret}</code>
                            </p>
                        </div>
                        <FormField
                            label="Nhập mã 6 số từ app Authenticator"
                            value={twoFaCode}
                            onChange={setTwoFaCode}
                            placeholder="000000"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await apiClient.post(ENDPOINTS.PROFILE.TWO_FACTOR_VERIFY, { code: twoFaCode });
                                        setBackupCodes(res.data.backupCodes || []);
                                        setTwoFaStep('backupCodes');
                                        setIs2faEnabled(true);
                                        toast.success('2FA đã được bật thành công!');
                                    } catch (err) {
                                        toast.error(err.response?.data?.message || 'Mã không đúng');
                                    }
                                }}
                                disabled={twoFaCode.length !== 6}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                Xác nhận
                            </button>
                            <button
                                onClick={() => { setTwoFaStep('idle'); setTwoFaData(null); setTwoFaCode(''); }}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}

                {/* Backup codes display */}
                {twoFaStep === 'backupCodes' && backupCodes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 font-medium mb-2">
                                <i className="fa-solid fa-triangle-exclamation mr-2" />
                                Lưu mã dự phòng — mỗi mã chỉ dùng được MỘT lần:
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {backupCodes.map((code, i) => (
                                    <code key={i} className="bg-white border rounded px-3 py-1 text-center text-sm font-mono select-all">
                                        {code}
                                    </code>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => { setTwoFaStep('idle'); setBackupCodes([]); setTwoFaCode(''); }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                        >
                            Đã lưu, đóng
                        </button>
                    </div>
                )}

                {/* Disable 2FA */}
                {twoFaStep === 'disabling' && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                        <FormField
                            label="Nhập mật khẩu để tắt 2FA"
                            type="password"
                            value={disablePassword}
                            onChange={setDisablePassword}
                            placeholder="Mật khẩu hiện tại"
                        />
                        <button
                            onClick={async () => {
                                try {
                                    await apiClient.delete(ENDPOINTS.PROFILE.TWO_FACTOR_DISABLE, {
                                        data: { password: disablePassword }
                                    });
                                    toast.success('2FA đã được tắt');
                                    setTwoFaStep('idle');
                                    setDisablePassword('');
                                    setIs2faEnabled(false);
                                } catch (err) {
                                    toast.error(err.response?.data?.message || 'Mật khẩu không đúng');
                                }
                            }}
                            disabled={!disablePassword}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            Xác nhận tắt 2FA
                        </button>
                    </div>
                )}
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
                    <button
                        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
                    >
                        {showDeleteConfirm ? 'Hủy' : 'Xóa tài khoản'}
                    </button>
                </div>

                {showDeleteConfirm && (
                    <div className="mt-4 pt-4 border-t border-red-200 space-y-4">
                        <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                            <p className="text-sm text-red-800 font-medium">
                                <i className="fa-solid fa-triangle-exclamation mr-2" />
                                Tài khoản sẽ bị vô hiệu hóa vĩnh viễn. Tất cả dữ liệu cá nhân sẽ không thể khôi phục.
                            </p>
                        </div>
                        <FormField
                            label="Nhập mật khẩu để xác nhận"
                            type="password"
                            value={deletePassword}
                            onChange={(v) => setDeletePassword(v)}
                            placeholder="Mật khẩu hiện tại"
                        />
                        <button
                            onClick={handleDeleteAccount}
                            disabled={deleting || !deletePassword}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {deleting ? (
                                <><i className="fa-solid fa-spinner fa-spin" /> Đang xử lý...</>
                            ) : (
                                <><i className="fa-solid fa-trash" /> Xác nhận xóa tài khoản</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function NotificationsTab() {
    const toast = useToast();
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['notification-settings'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROFILE.NOTIFICATION_SETTINGS);
            return res.data;
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (newSettings) => {
            const res = await apiClient.put(ENDPOINTS.PROFILE.NOTIFICATION_SETTINGS, newSettings);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['notification-settings'], data);
            toast.success('Đã lưu cài đặt thông báo');
        },
        onError: () => toast.error('Lỗi khi lưu cài đặt')
    });

    const toggleSetting = (key) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: !settings[key] };
        updateMutation.mutate(newSettings);
    };

    if (isLoading) return <div className="text-center py-6"><i className="fa-solid fa-spinner fa-spin text-indigo-600 mr-2"></i>Đang tải cài đặt...</div>;

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
                        enabled={settings?.emailNewMessage}
                        onToggle={() => toggleSetting('emailNewMessage')}
                    />
                    <NotificationRow
                        icon="fa-at"
                        title="Khi được mention"
                        desc="Nhận email khi ai đó @bạn"
                        enabled={settings?.emailMentions}
                        onToggle={() => toggleSetting('emailMentions')}
                    />
                    <NotificationRow
                        icon="fa-calendar-week"
                        title="Báo cáo tuần"
                        desc="Nhận email tổng hợp hoạt động tuần"
                        enabled={settings?.emailWeeklyDigest}
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
                        enabled={settings?.pushDesktop}
                        onToggle={() => toggleSetting('pushDesktop')}
                    />
                    <NotificationRow
                        icon="fa-mobile"
                        title="Mobile"
                        desc="Thông báo trên điện thoại"
                        enabled={settings?.pushMobile}
                        onToggle={() => toggleSetting('pushMobile')}
                    />
                    <NotificationRow
                        icon="fa-volume-high"
                        title="Âm thanh"
                        desc="Phát âm thanh khi có thông báo"
                        enabled={settings?.soundEnabled}
                        onToggle={() => toggleSetting('soundEnabled')}
                    />
                </div>
            </div>
        </div>
    );
}

function PreferencesTab() {
    const { theme, setTheme } = useThemeStore();

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Tùy chỉnh cá nhân</h3>

            <div className="border border-gray-200 rounded-xl p-5">
                <h4 className="font-semibold text-gray-800 mb-1">Giao diện</h4>
                <p className="text-sm text-gray-500 mb-4">Chọn chế độ hiển thị cho tài khoản của bạn</p>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setTheme('light')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                            theme === 'light' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'
                        }`}
                    >
                        Sáng
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                            theme === 'dark' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'
                        }`}
                    >
                        Tối
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                            theme === 'system' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'
                        }`}
                    >
                        Theo hệ thống
                    </button>
                </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5">
                <h4 className="font-semibold text-gray-800 mb-1">Lối tắt nhanh</h4>
                <p className="text-sm text-gray-500 mb-4">Đi đến các màn cài đặt và thông báo của cá nhân</p>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/app/me/profile"
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    >
                        Hồ sơ
                    </Link>
                    <Link
                        to="/app/me/profile?tab=security"
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    >
                        Bảo mật
                    </Link>
                    <Link
                        to="/app/me/profile?tab=notifications"
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    >
                        Thông báo
                    </Link>
                </div>
            </div>
        </div>
    );
}

function SessionsTab() {
    const toast = useToast();
    const { logout } = useAuthStore();
    const queryClient = useQueryClient();

    const { data: sessions = [], isLoading } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.PROFILE.SESSIONS);
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const logoutAllMutation = useMutation({
        mutationFn: async () => await apiClient.post(ENDPOINTS.AUTH.LOGOUT_ALL),
        onSuccess: () => {
            toast.success('Đã đăng xuất khỏi tất cả các thiết bị khác');
            logout();
        },
        onError: () => toast.error('Lỗi khi đăng xuất tất cả')
    });

    const revokeSessionMutation = useMutation({
        mutationFn: async (id) => await apiClient.delete(ENDPOINTS.PROFILE.REVOKE_SESSION(id)),
        onSuccess: () => {
            toast.success('Đã đăng xuất phiên bản này');
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
        onError: () => toast.error('Lỗi khi đăng xuất phiên')
    });

    if (isLoading) return <div className="text-center py-6"><i className="fa-solid fa-spinner fa-spin text-indigo-600 mr-2"></i>Đang tải dữ liệu phiên đăng nhập...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Phiên đăng nhập</h3>
                <button
                    onClick={() => logoutAllMutation.mutate()}
                    disabled={logoutAllMutation.isPending}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                    {logoutAllMutation.isPending ? 'Đang xử lý...' : 'Đăng xuất tất cả'}
                </button>
            </div>

            {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <i className="fa-solid fa-laptop text-3xl mb-2" />
                    <p>Không có phiên đăng nhập nào</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map(session => (
                        <div key={session.sessionId} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
                                    <i className={`fa-solid ${session.device?.includes('iPhone') ? 'fa-mobile' :
                                        session.device?.includes('Mac') ? 'fa-desktop' : 'fa-laptop'
                                        } text-gray-500`} />
                                </div>
                                <div>
                                    <span className="font-medium text-gray-800">{session.device || 'Unknown'}</span>
                                    <div className="text-sm text-gray-500">
                                        IP: {session.ipAddress || 'N/A'} • Hoạt động: {session.lastActive ? formatDate(session.lastActive) : 'N/A'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => revokeSessionMutation.mutate(session.sessionId)}
                                disabled={revokeSessionMutation.isPending}
                                className="text-sm text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg disabled:opacity-50"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    ))}
                </div>
            )}
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-500"
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
                className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-indigo-500' : 'bg-gray-300'
                    }`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-7' : 'left-1'
                    }`} />
            </button>
        </div>
    );
}
