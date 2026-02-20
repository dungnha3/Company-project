import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import InviteMemberModal from '@features/company/components/InviteMemberModal';
import IntegrationsSettings from '@features/company/components/IntegrationsSettings';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function CompanySettingsPage() {
    const { currentWorkspace } = useWorkspaceStore();
    const [activeTab, setActiveTab] = useState('general');

    if (!currentWorkspace) return null;

    const isPersonal = currentWorkspace.type === 'PERSONAL';

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Cài đặt Workspace</h1>
                    <p className="text-gray-500">Quản lý thông tin và cài đặt cho {currentWorkspace.name}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-6">
                    <TabButton
                        active={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        icon="fa-building"
                    >
                        Thông tin chung
                    </TabButton>
                    {!isPersonal && (
                        <>
                            <TabButton
                                active={activeTab === 'members'}
                                onClick={() => setActiveTab('members')}
                                icon="fa-users"
                            >
                                Thành viên
                            </TabButton>
                            <TabButton
                                active={activeTab === 'modules'}
                                onClick={() => setActiveTab('modules')}
                                icon="fa-puzzle-piece"
                            >
                                Modules
                            </TabButton>
                            <TabButton
                                active={activeTab === 'integrations'}
                                onClick={() => setActiveTab('integrations')}
                                icon="fa-link"
                            >
                                Integrations
                            </TabButton>
                        </>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="py-4">
                {activeTab === 'general' && <GeneralSettings workspace={currentWorkspace} />}
                {activeTab === 'members' && !isPersonal && <MembersSettings />}
                {activeTab === 'modules' && !isPersonal && <ModulesSettings workspace={currentWorkspace} />}
                {activeTab === 'integrations' && !isPersonal && <IntegrationsSettings workspace={currentWorkspace} />}
            </div>
        </div>
    );
}

function TabButton({ children, active, onClick, icon }) {
    return (
        <button
            onClick={onClick}
            className={`pb-3 px-1 flex items-center gap-2 transition-all font-medium text-sm relative
        ${active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}
      `}
        >
            <i className={`fa-solid ${icon}`} />
            {children}
            {active && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
            )}
        </button>
    );
}

function GeneralSettings({ workspace }) {
    const [formData, setFormData] = useState({
        name: workspace.name || '',
    });
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiClient.put(ENDPOINTS.COMPANIES.UPDATE(workspace.id), formData);
            toast.success('Cập nhật thông tin thành công');
        } catch (error) {
            toast.error('Lỗi: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Logo */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                        {workspace.name?.charAt(0)}
                    </div>
                    <div>
                        <button type="button" className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                            Thay đổi logo
                        </button>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG tối đa 2MB</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên Workspace</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <i className="fa-solid fa-crown text-amber-500" />
                    <div>
                        <p className="text-sm font-medium text-gray-900">Plan: {workspace.plan || 'FREE'}</p>
                        <p className="text-xs text-gray-500">Liên hệ System Admin để nâng cấp plan</p>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700" disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function MembersSettings() {
    const { currentWorkspace } = useWorkspaceStore();
    const [showInviteModal, setShowInviteModal] = useState(false);
    const toast = useToast();
    const queryClient = useQueryClient();

    // Fetch members from API
    const { data: members = [], isLoading: loading } = useQuery({
        queryKey: ['company-members', currentWorkspace?.id],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST)).data?.content || [],
        enabled: !!currentWorkspace?.id
    });

    // Delete member mutation
    const deleteMutation = useMutation({
        mutationFn: async (userId) => {
            // Assuming endpoint to remove member from company exists, using employee delete for now
            // Adjust endpoint if strictly removing from company vs deleting employee record
            return apiClient.delete(ENDPOINTS.EMPLOYEES.DELETE(userId));
        },
        onSuccess: () => {
            toast.success('Đã xóa thành viên!');
            queryClient.invalidateQueries(['company-members', currentWorkspace?.id]);
        },
        onError: (err) => {
            toast.error('Lỗi xóa thành viên: ' + (err.response?.data?.message || err.message));
        }
    });

    const handleRemove = async (userId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này? Hành động này sẽ xóa nhân viên khỏi Workspace.')) return;
        deleteMutation.mutate(userId);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="w-full max-w-sm relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Tìm kiếm thành viên..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl" />
                </div>
                <button onClick={() => setShowInviteModal(true)} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2">
                    <i className="fa-solid fa-user-plus" />
                    Mời thành viên
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Thành viên</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" />Đang tải...</td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Chưa có thành viên nào. Hãy mời thêm!</td></tr>
                        ) : (
                            members.map(member => (
                                <tr key={member.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {member.fullName?.charAt(0) || 'U'}
                                            </div>
                                            <span className="font-medium text-gray-900">{member.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{member.email}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200">
                                            {member.position?.title || 'Thành viên'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRemove(member.id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                                            title="Xóa thành viên"
                                        >
                                            <i className="fa-regular fa-trash-can" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <InviteMemberModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries(['company-members', currentWorkspace?.id]);
                }}
            />
        </div>
    );
}

function ModulesSettings({ workspace }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState(workspace.settings || {});

    // Update settings mutation
    const updateMutation = useMutation({
        mutationFn: async (newSettings) => {
            return apiClient.put(ENDPOINTS.COMPANIES.SETTINGS(workspace.id), newSettings);
        },
        onSuccess: () => {
            toast.success('Cập nhật cài đặt thành công');
            queryClient.invalidateQueries(['workspace']);
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const handleToggle = (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        updateMutation.mutate(newSettings);
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Info banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                <i className="fa-solid fa-info-circle text-indigo-500 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-indigo-800">Cài đặt Module</p>
                    <p className="text-xs text-indigo-600 mt-1">
                        Bật/tắt các tính năng cho workspace của bạn. Tính năng bị tắt sẽ ẩn khỏi menu và không thể truy cập.
                    </p>
                </div>
            </div>

            {/* Module Toggles */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Modules chính</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    <ToggleRow
                        icon="fa-users"
                        iconColor="text-indigo-500"
                        title="Module Nhân sự (HR)"
                        description="Quản lý nhân viên, phòng ban, chức vụ"
                        enabled={settings.hrModuleEnabled !== false}
                        onToggle={() => handleToggle('hrModuleEnabled')}
                        disabled={updateMutation.isPending}
                    />
                    <ToggleRow
                        icon="fa-folder-open"
                        iconColor="text-indigo-500"
                        title="Module Dự án (Project)"
                        description="Quản lý dự án, tasks, Kanban board"
                        enabled={settings.projectModuleEnabled !== false}
                        onToggle={() => handleToggle('projectModuleEnabled')}
                        disabled={updateMutation.isPending}
                    />
                    <ToggleRow
                        icon="fa-comments"
                        iconColor="text-green-500"
                        title="Module Chat"
                        description="Trò chuyện nội bộ giữa các thành viên"
                        enabled={settings.chatModuleEnabled !== false}
                        onToggle={() => handleToggle('chatModuleEnabled')}
                        disabled={updateMutation.isPending}
                    />
                    <ToggleRow
                        icon="fa-folder"
                        iconColor="text-amber-500"
                        title="Module Lưu trữ (Storage)"
                        description="Quản lý files và tài liệu"
                        enabled={settings.storageModuleEnabled !== false}
                        onToggle={() => handleToggle('storageModuleEnabled')}
                        disabled={updateMutation.isPending}
                    />
                </div>
            </div>

            {/* HR Sub-features */}
            {settings.hrModuleEnabled !== false && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Tính năng HR</h3>
                        <p className="text-xs text-gray-500 mt-1">Bật/tắt các tính năng con trong module Nhân sự</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        <ToggleRow
                            icon="fa-clock"
                            iconColor="text-cyan-500"
                            title="Chấm công"
                            description="Quản lý giờ làm việc, check-in/out"
                            enabled={settings.attendanceEnabled !== false}
                            onToggle={() => handleToggle('attendanceEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-calendar-check"
                            iconColor="text-teal-500"
                            title="Nghỉ phép"
                            description="Quản lý đơn xin nghỉ phép"
                            enabled={settings.leaveEnabled !== false}
                            onToggle={() => handleToggle('leaveEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-money-bill-wave"
                            iconColor="text-emerald-500"
                            title="Bảng lương"
                            description="Quản lý lương và thanh toán"
                            enabled={settings.salaryEnabled !== false}
                            onToggle={() => handleToggle('salaryEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-file-contract"
                            iconColor="text-orange-500"
                            title="Hợp đồng"
                            description="Quản lý hợp đồng lao động"
                            enabled={settings.contractEnabled !== false}
                            onToggle={() => handleToggle('contractEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-star"
                            iconColor="text-yellow-500"
                            title="Đánh giá năng lực"
                            description="Review định kỳ, đánh giá 360 độ"
                            enabled={settings.reviewEnabled !== false}
                            onToggle={() => handleToggle('reviewEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-bullseye"
                            iconColor="text-red-500"
                            title="OKR / KPI"
                            description="Quản lý mục tiêu và kết quả then chốt"
                            enabled={settings.okrEnabled !== false}
                            onToggle={() => handleToggle('okrEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-layer-group"
                            iconColor="text-purple-500"
                            title="Ma trận kỹ năng"
                            description="Quản lý skills và levels của nhân viên"
                            enabled={settings.skillsMatrixEnabled !== false}
                            onToggle={() => handleToggle('skillsMatrixEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-user-graduate"
                            iconColor="text-pink-500"
                            title="Onboarding"
                            description="Quy trình tuyển dụng và hội nhập"
                            enabled={settings.onboardingEnabled !== false}
                            onToggle={() => handleToggle('onboardingEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-people-arrows"
                            iconColor="text-indigo-600"
                            title="Quản lý nguồn lực"
                            description="Resource Planning & Allocation"
                            enabled={settings.resourcePlanningEnabled !== false}
                            onToggle={() => handleToggle('resourcePlanningEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-sitemap"
                            iconColor="text-indigo-600"
                            title="Sơ đồ tổ chức"
                            description="Hiển thị cây cấu trúc Workspace"
                            enabled={settings.orgChartEnabled !== false}
                            onToggle={() => handleToggle('orgChartEnabled')}
                            disabled={updateMutation.isPending}
                        />
                    </div>
                </div>
            )}

            {/* Project Sub-features */}
            {settings.projectModuleEnabled !== false && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Tính năng Dự án</h3>
                        <p className="text-xs text-gray-500 mt-1">Bật/tắt các tính năng nâng cao trong module Dự án</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        <ToggleRow
                            icon="fa-stopwatch"
                            iconColor="text-cyan-500"
                            title="Time Tracking"
                            description="Log time làm việc cho từng issue"
                            enabled={settings.timeTrackingEnabled !== false}
                            onToggle={() => handleToggle('timeTrackingEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-chart-line"
                            iconColor="text-indigo-500"
                            title="Analytics"
                            description="Biểu đồ burndown, velocity, status"
                            enabled={settings.analyticsEnabled !== false}
                            onToggle={() => handleToggle('analyticsEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-calendar-days"
                            iconColor="text-indigo-500"
                            title="Lịch"
                            description="Quản lý sự kiện, cuộc họp"
                            enabled={settings.calendarEnabled !== false}
                            onToggle={() => handleToggle('calendarEnabled')}
                            disabled={updateMutation.isPending}
                        />
                        <ToggleRow
                            icon="fa-link"
                            iconColor="text-indigo-500"
                            title="Webhook Integration"
                            description="Kết nối với hệ thống bên ngoài (Slack, Discord, etc.)"
                            enabled={settings.webhookEnabled === true}
                            onToggle={() => handleToggle('webhookEnabled')}
                            disabled={updateMutation.isPending}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function ToggleRow({ icon, iconColor, title, description, enabled, onToggle, disabled }) {
    return (
        <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${iconColor}`}>
                    <i className={`fa-solid ${icon}`} />
                </div>
                <div>
                    <p className="font-medium text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
}
