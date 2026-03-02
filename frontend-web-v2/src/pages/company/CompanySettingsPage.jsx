import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import InviteMemberModal from '@features/company/components/InviteMemberModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
                        </>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="py-4">
                {activeTab === 'general' && <GeneralSettings workspace={currentWorkspace} />}
                {activeTab === 'members' && !isPersonal && <MembersSettings />}
                {activeTab === 'modules' && !isPersonal && <ModulesSettings workspace={currentWorkspace} />}

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
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoPreview, setLogoPreview] = useState(workspace.logoUrl || null);

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

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh (JPG, PNG)');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File quá lớn. Tối đa 2MB');
            return;
        }

        setUploadingLogo(true);
        try {
            // Upload file to storage
            const uploadForm = new FormData();
            uploadForm.append('file', file);
            const uploadRes = await apiClient.post('/api/storage/files/upload', uploadForm, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const logoUrl = uploadRes.data.downloadUrl;

            // Update company with new logoUrl
            await apiClient.put(ENDPOINTS.COMPANIES.UPDATE(workspace.id), { logoUrl });
            setLogoPreview(logoUrl);
            toast.success('Cập nhật logo thành công');
        } catch (error) {
            toast.error('Lỗi tải logo: ' + (error.response?.data?.message || error.message));
        } finally {
            setUploadingLogo(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Logo */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold overflow-hidden">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            workspace.name?.charAt(0)
                        )}
                    </div>
                    <div>
                        <label className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer inline-flex items-center gap-2">
                            {uploadingLogo ? (
                                <><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</>
                            ) : (
                                <><i className="fa-solid fa-camera" /> Thay đổi logo</>
                            )}
                            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleLogoChange} disabled={uploadingLogo} />
                        </label>
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
    const [expandedMemberId, setExpandedMemberId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const toast = useToast();
    const queryClient = useQueryClient();
    const companyId = currentWorkspace?.id;

    // Fetch members with permissions from CompanyMemberController
    const { data: members = [], isLoading: loading } = useQuery({
        queryKey: ['company-members', companyId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.COMPANIES.MEMBERS(companyId))).data || [],
        enabled: !!companyId
    });

    const filteredMembers = members.filter(m =>
        !searchQuery || (m.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Delete member mutation
    const deleteMutation = useMutation({
        mutationFn: async (userId) => {
            return apiClient.delete(`${ENDPOINTS.COMPANIES.MEMBERS(companyId)}/${userId}`);
        },
        onSuccess: () => {
            toast.success('Đã xóa thành viên!');
            queryClient.invalidateQueries(['company-members', companyId]);
        },
        onError: (err) => {
            toast.error('Lỗi xóa thành viên: ' + (err.response?.data?.message || err.message));
        }
    });

    // Permission update mutation
    const permissionMutation = useMutation({
        mutationFn: async ({ userId, permissionKey, enabled }) => {
            return apiClient.put(ENDPOINTS.COMPANIES.MEMBER_PERMISSIONS(companyId, userId), {
                permissionKey,
                enabled,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['company-members', companyId]);
        },
        onError: (err) => {
            toast.error('Lỗi cập nhật quyền: ' + (err.response?.data?.message || err.message));
        }
    });

    const handleRemove = async (userId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này? Hành động này sẽ xóa nhân viên khỏi Workspace.')) return;
        deleteMutation.mutate(userId);
    };

    const handleTogglePermission = (userId, permissionKey, currentValue) => {
        permissionMutation.mutate({ userId, permissionKey, enabled: !currentValue });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="w-full max-w-sm relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Tìm kiếm thành viên..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" />Đang tải...</td></tr>
                        ) : filteredMembers.length === 0 ? (
                            <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">Không tìm thấy thành viên nào</td></tr>
                        ) : (
                            filteredMembers.map(member => (
                                <MemberRow
                                    key={member.userId}
                                    member={member}
                                    isExpanded={expandedMemberId === member.userId}
                                    onToggleExpand={() => setExpandedMemberId(expandedMemberId === member.userId ? null : member.userId)}
                                    onRemove={() => handleRemove(member.userId)}
                                    onTogglePermission={(key, val) => handleTogglePermission(member.userId, key, val)}
                                    isUpdating={permissionMutation.isPending}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <InviteMemberModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries(['company-members', companyId]);
                }}
            />
        </div>
    );
}

function MemberRow({ member, isExpanded, onToggleExpand, onRemove, onTogglePermission, isUpdating }) {
    return (
        <>
            <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-indigo-50/50' : ''}`}>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {member.fullName?.charAt(0) || 'U'}
                        </div>
                        <span className="font-medium text-gray-900">{member.fullName}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-gray-600 font-mono text-xs">{member.email}</td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={onToggleExpand}
                            className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${isExpanded ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                            title="Phân quyền"
                        >
                            <i className="fa-solid fa-shield-halved text-xs" />
                            <span className="hidden sm:inline">Phân quyền</span>
                            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px]`} />
                        </button>
                        {member.role !== 'OWNER' && (
                            <button
                                onClick={onRemove}
                                className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                                title="Xóa thành viên"
                            >
                                <i className="fa-regular fa-trash-can" />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr>
                    <td colSpan="3" className="px-6 py-4 bg-gray-50/80">
                        <MemberPermissionEditor
                            permissions={member.permissions || {}}
                            onToggle={onTogglePermission}
                            isUpdating={isUpdating}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}


const PERMISSION_GROUPS = [
    {
        key: 'hr', label: 'Nhân sự (HR)', icon: 'fa-users', color: 'text-indigo-500',
        permissions: [
            { key: 'HR.VIEW_LIST', field: 'hrViewList', label: 'Xem danh sách' },
            { key: 'HR.EDIT_PROFILE', field: 'hrEditProfile', label: 'Sửa hồ sơ' },
            { key: 'HR.CREATE_EMPLOYEE', field: 'hrCreateEmployee', label: 'Tạo nhân viên' },
            { key: 'HR.DELETE_EMPLOYEE', field: 'hrDeleteEmployee', label: 'Xóa nhân viên' },
            { key: 'HR.MANAGE_CONTRACTS', field: 'hrManageContracts', label: 'Quản lý hợp đồng' },
            { key: 'HR.MANAGE_REVIEWS', field: 'hrManageReviews', label: 'Quản lý đánh giá' },
            { key: 'HR.VIEW_DEPARTMENTS', field: 'hrViewDepartments', label: 'Xem phòng ban' },
            { key: 'HR.MANAGE_DEPARTMENTS', field: 'hrManageDepartments', label: 'Quản lý phòng ban' },
            { key: 'HR.VIEW_POSITIONS', field: 'hrViewPositions', label: 'Xem chức vụ' },
            { key: 'HR.MANAGE_POSITIONS', field: 'hrManagePositions', label: 'Quản lý chức vụ' },
            { key: 'HR.VIEW_DASHBOARD', field: 'hrViewDashboard', label: 'Xem dashboard' },
            { key: 'HR.EXPORT', field: 'hrExport', label: 'Xuất báo cáo' },
        ]
    },
    {
        key: 'project', label: 'Dự án', icon: 'fa-folder-open', color: 'text-blue-500',
        permissions: [
            { key: 'PROJECT.CREATE', field: 'projectCreate', label: 'Tạo dự án' },
            { key: 'PROJECT.DELETE', field: 'projectDelete', label: 'Xóa dự án' },
            { key: 'PROJECT.MANAGE_ALL', field: 'projectManageAll', label: 'Quản lý tất cả' },
            { key: 'PROJECT.MANAGE_ISSUES', field: 'projectManageIssues', label: 'Quản lý issues' },
            { key: 'PROJECT.MANAGE_SPRINTS', field: 'projectManageSprints', label: 'Quản lý sprints' },
            { key: 'PROJECT.VIEW_DASHBOARD', field: 'projectViewDashboard', label: 'Xem dashboard' },
            { key: 'PROJECT.EXPORT', field: 'projectExport', label: 'Xuất báo cáo' },
            { key: 'PROJECT.MANAGE_PHASES', field: 'projectManagePhases', label: 'Quản lý phases' },
            { key: 'PROJECT.RESOURCE_PLANNING', field: 'projectResourcePlanning', label: 'Phân bổ nguồn lực' },
        ]
    },
    {
        key: 'salary', label: 'Lương', icon: 'fa-money-bill-wave', color: 'text-emerald-500',
        permissions: [
            { key: 'SALARY.VIEW', field: 'salaryView', label: 'Xem lương' },
            { key: 'SALARY.CALCULATE', field: 'salaryCalculate', label: 'Tính lương' },
            { key: 'SALARY.APPROVE', field: 'salaryApprove', label: 'Duyệt lương' },
            { key: 'SALARY.EXPORT', field: 'salaryExport', label: 'Xuất báo cáo' },
        ]
    },
    {
        key: 'contract', label: 'Hợp đồng', icon: 'fa-file-contract', color: 'text-orange-500',
        permissions: [
            { key: 'CONTRACT.VIEW', field: 'contractView', label: 'Xem hợp đồng' },
            { key: 'CONTRACT.CREATE', field: 'contractCreate', label: 'Tạo hợp đồng' },
            { key: 'CONTRACT.EDIT', field: 'contractEdit', label: 'Sửa hợp đồng' },
            { key: 'CONTRACT.DELETE', field: 'contractDelete', label: 'Xóa hợp đồng' },
            { key: 'CONTRACT.RENEW', field: 'contractRenew', label: 'Gia hạn' },
        ]
    },
    {
        key: 'leave', label: 'Nghỉ phép', icon: 'fa-calendar-check', color: 'text-teal-500',
        permissions: [
            { key: 'LEAVE.APPROVE', field: 'leaveApprove', label: 'Duyệt nghỉ phép' },
            { key: 'LEAVE.VIEW_ALL', field: 'leaveViewAll', label: 'Xem tất cả' },
        ]
    },
    {
        key: 'attendance', label: 'Chấm công', icon: 'fa-clock', color: 'text-cyan-500',
        permissions: [
            { key: 'ATTENDANCE.VIEW_ALL', field: 'attendanceViewAll', label: 'Xem tất cả' },
            { key: 'ATTENDANCE.EDIT', field: 'attendanceEdit', label: 'Chỉnh sửa' },
        ]
    },
    {
        key: 'review', label: 'Đánh giá', icon: 'fa-star', color: 'text-yellow-500',
        permissions: [
            { key: 'REVIEW.VIEW_ALL', field: 'reviewViewAll', label: 'Xem tất cả' },
            { key: 'REVIEW.CREATE', field: 'reviewCreate', label: 'Tạo đánh giá' },
            { key: 'REVIEW.APPROVE', field: 'reviewApprove', label: 'Duyệt đánh giá' },
        ]
    },
    {
        key: 'calendar', label: 'Lịch', icon: 'fa-calendar-days', color: 'text-purple-500',
        permissions: [
            { key: 'CALENDAR.VIEW', field: 'calendarView', label: 'Xem lịch' },
            { key: 'CALENDAR.MANAGE', field: 'calendarManage', label: 'Quản lý sự kiện' },
        ]
    },
    {
        key: 'chat', label: 'Chat', icon: 'fa-comments', color: 'text-green-500',
        permissions: [
            { key: 'CHAT.CREATE_GROUP', field: 'chatCreateGroup', label: 'Tạo nhóm' },
            { key: 'CHAT.SEND_MESSAGE', field: 'chatSendMessage', label: 'Gửi tin nhắn' },
            { key: 'CHAT.SHARE_FILE', field: 'chatShareFile', label: 'Chia sẻ file' },
        ]
    },
    {
        key: 'storage', label: 'Lưu trữ', icon: 'fa-folder', color: 'text-amber-500',
        permissions: [
            { key: 'STORAGE.UPLOAD', field: 'storageUpload', label: 'Upload file' },
            { key: 'STORAGE.DELETE', field: 'storageDelete', label: 'Xóa file' },
            { key: 'STORAGE.SHARE', field: 'storageShare', label: 'Chia sẻ' },
            { key: 'STORAGE.MANAGE_FOLDERS', field: 'storageManageFolders', label: 'Quản lý thư mục' },
        ]
    },
    {
        key: 'timetracking', label: 'Time Tracking', icon: 'fa-stopwatch', color: 'text-cyan-600',
        permissions: [
            { key: 'TIMETRACKING.LOG', field: 'timetrackingLog', label: 'Log time' },
            { key: 'TIMETRACKING.VIEW_ALL', field: 'timetrackingViewAll', label: 'Xem tất cả' },
        ]
    },
    {
        key: 'other', label: 'Khác', icon: 'fa-puzzle-piece', color: 'text-gray-500',
        permissions: [
            { key: 'OKR.MANAGE', field: 'okrManage', label: 'Quản lý OKR' },
            { key: 'ONBOARDING.MANAGE', field: 'onboardingManage', label: 'Quản lý Onboarding' },
            { key: 'ANALYTICS.VIEW', field: 'analyticsView', label: 'Xem Analytics' },
            { key: 'AI.CHAT', field: 'aiChat', label: 'Chat với AI' },
            { key: 'AI.CREATE_ISSUES', field: 'aiCreateIssues', label: 'AI tạo Issues' },
        ]
    },
];

function MemberPermissionEditor({ permissions, onToggle, isUpdating }) {
    const [openGroup, setOpenGroup] = useState(null);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
                <i className="fa-solid fa-shield-halved text-indigo-500" />
                <h4 className="font-semibold text-gray-800 text-sm">Phân quyền chi tiết</h4>
                <span className="text-xs text-gray-400">— Click vào module để mở/đóng</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {PERMISSION_GROUPS.map(group => {
                    const isOpen = openGroup === group.key;
                    const enabledCount = group.permissions.filter(p => permissions[p.field]).length;
                    const totalCount = group.permissions.length;

                    return (
                        <div key={group.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {/* Group Header */}
                            <button
                                onClick={() => setOpenGroup(isOpen ? null : group.key)}
                                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <i className={`fa-solid ${group.icon} ${group.color} text-sm`} />
                                    <span className="font-medium text-gray-800 text-sm">{group.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${enabledCount === totalCount ? 'bg-green-100 text-green-700' :
                                        enabledCount === 0 ? 'bg-gray-100 text-gray-500' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                        {enabledCount}/{totalCount}
                                    </span>
                                    <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-[10px] text-gray-400`} />
                                </div>
                            </button>

                            {/* Permissions List */}
                            {isOpen && (
                                <div className="border-t border-gray-100 divide-y divide-gray-50">
                                    {group.permissions.map(perm => (
                                        <div key={perm.key} className="flex items-center justify-between px-3 py-2">
                                            <span className="text-xs text-gray-700">{perm.label}</span>
                                            <button
                                                onClick={() => onToggle(perm.key, permissions[perm.field])}
                                                disabled={isUpdating}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${permissions[perm.field] ? 'bg-indigo-600' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${permissions[perm.field] ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                                    }`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
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
