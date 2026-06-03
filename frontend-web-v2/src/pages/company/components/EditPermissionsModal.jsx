import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useToast } from '@app/providers/ToastProvider';

const PERMISSION_MODULES = ['HR', 'REVIEW', 'PROJECT', 'TIMETRACKING', 'STORAGE', 'ANALYTICS', 'CALENDAR', 'WORKSPACE'];

export default function EditPermissionsModal({ isOpen, onClose, member }) {
    const { currentWorkspace } = useWorkspaceStore();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const [permissions, setPermissions] = useState({});
    const [activeSection, setActiveSection] = useState('presets');

    useEffect(() => {
        if (member?.permissions) {
            setPermissions(member.permissions);
        }
    }, [member]);

    // ── Single permission toggle ─────────────────────────────────────────
    const toggleMutation = useMutation({
        mutationFn: async ({ permissionKey, enabled }) => {
            await apiClient.put(ENDPOINTS.COMPANIES.MEMBER_PERMISSIONS(currentWorkspace.id, member.userId), {
                permissionKey, enabled
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['workspace-members', currentWorkspace?.id]);
        },
        onError: (err) => {
            showToast(err.response?.data?.message || 'Không thể cập nhật quyền', 'error');
            if (member?.permissions) setPermissions(member.permissions);
        }
    });

    // ── Batch module toggle (uses single endpoint per key) ───────────────
    const batchMutation = useMutation({
        mutationFn: async ({ module, enabled }) => {
            await apiClient.put(ENDPOINTS.COMPANIES.MEMBER_PERMISSIONS_BATCH(currentWorkspace.id, member.userId), {
                module, enabled
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['workspace-members', currentWorkspace?.id]);
            showToast('Đã cập nhật quyền module', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.message || 'Lỗi khi cập nhật module quyền', 'error');
        }
    });

    const handleToggle = (jsonKey, apiKey) => {
        const newValue = !permissions[jsonKey];
        setPermissions(prev => ({ ...prev, [jsonKey]: newValue }));
        toggleMutation.mutate({ permissionKey: apiKey, enabled: newValue });
    };

    const handleBatchToggle = (module, enabled) => {
        setPermissions(prev => {
            const next = { ...prev };
            MODULE_PERMISSION_MAP[module]?.forEach(({ jsonKey }) => {
                next[jsonKey] = enabled;
            });
            return next;
        });
        batchMutation.mutate({ module, enabled });
    };

    const handlePreset = (preset) => {
        setPermissions({ ...preset });
        const updates = Object.entries(preset);
        updates.forEach(([jsonKey, enabled]) => {
            const apiKey = ALL_PERMISSION_ITEMS.find(i => i.jsonKey === jsonKey)?.apiKey;
            if (apiKey) {
                toggleMutation.mutate({ permissionKey: apiKey, enabled });
            }
        });
    };

    if (!isOpen || !member) return null;

    const isOwner = member.role === 'OWNER';
    const isAdmin = member.role === 'COMPANY_ADMIN';

    return (
        <div className="modal-overlay">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Phân quyền Thành viên</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                {member.fullName?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-600 font-medium">{member.fullName}</span>
                            {isOwner && <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">OWNER</span>}
                            {isAdmin && <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">ADMIN</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                {/* Section tabs */}
                <div className="px-6 pt-4 bg-white">
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                        <button
                            onClick={() => setActiveSection('presets')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'presets' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fa-solid fa-bolt mr-1.5" />Gợi ý vai trò
                        </button>
                        <button
                            onClick={() => setActiveSection('modules')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'modules' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fa-solid fa-layer-group mr-1.5" />Theo Module
                        </button>
                        <button
                            onClick={() => setActiveSection('details')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'details' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <i className="fa-solid fa-sliders mr-1.5" />Chi tiết
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* ── PRESETS SECTION ──────────────────────────────────────── */}
                    {activeSection === 'presets' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 mb-4">Chọn một vai trò có sẵn để nhanh chóng thiết lập quyền. Có thể tùy chỉnh thêm ở tab "Chi tiết".</p>
                            {ROLE_PRESETS.map(preset => (
                                <div
                                    key={preset.id}
                                    className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer"
                                    onClick={() => !isOwner && handlePreset(preset.permissions)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg ${preset.color}`}>
                                                <i className={`fa-solid ${preset.icon}`} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{preset.name}</h3>
                                                <p className="text-sm text-gray-500 mt-0.5">{preset.description}</p>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {preset.tags.map(tag => (
                                                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {!isOwner && (
                                            <button className="btn-primary text-sm px-3 py-1.5">
                                                Áp dụng
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── MODULES SECTION ──────────────────────────────────────── */}
                    {activeSection === 'modules' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 mb-4">Bật/tắt nhanh tất cả quyền trong một module chỉ bằng một click.</p>
                            {MODULE_PERMISSION_MAP && PERMISSION_MODULES.map(module => {
                                const items = MODULE_PERMISSION_MAP[module] || [];
                                const enabledCount = items.filter(i => permissions[i.jsonKey]).length;
                                const total = items.length;
                                const allEnabled = enabledCount === total && total > 0;

                                return (
                                    <div key={module} className="border border-gray-100 rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${MODULE_COLORS[module] || 'bg-gray-400'}`}>
                                                    <i className={`fa-solid ${MODULE_ICONS[module] || 'fa-circle'}`} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-800">{MODULE_LABELS[module] || module}</div>
                                                    <div className="text-xs text-gray-500">{enabledCount}/{total} quyền đang bật</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: total > 0 ? `${(enabledCount / total) * 100}%` : '0%' }} />
                                                </div>
                                                {!isOwner && (
                                                    <button
                                                        onClick={() => handleBatchToggle(module, !allEnabled)}
                                                        disabled={batchMutation.isPending}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${allEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {items.length > 0 && (
                                            <div className="divide-y divide-gray-50">
                                                {items.map(item => (
                                                    <div key={item.jsonKey} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                                                        <span className="text-sm text-gray-700">{item.label}</span>
                                                        <button
                                                            onClick={() => !isOwner && handleToggle(item.jsonKey, item.apiKey)}
                                                            disabled={isOwner || toggleMutation.isPending}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${permissions[item.jsonKey] ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                        >
                                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${permissions[item.jsonKey] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── DETAILS SECTION ──────────────────────────────────────── */}
                    {activeSection === 'details' && (
                        <div className="space-y-5">
                            {isOwner && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex gap-3">
                                    <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold">Người này là Chủ sở hữu (OWNER)</p>
                                        <p>Chủ sở hữu luôn có toàn quyền trong Workspace. Bạn không thể tắt các quyền này.</p>
                                    </div>
                                </div>
                            )}
                            {PERMISSION_GROUPS.map(group => {
                                const allEnabled = group.items.every(i => permissions[i.jsonKey]);
                                const someEnabled = group.items.some(i => permissions[i.jsonKey]);

                                return (
                                    <div key={group.title} className="border border-gray-100 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <i className={`fa-solid ${group.icon} text-gray-400`} />
                                                <h3 className="font-semibold text-gray-800">{group.title}</h3>
                                            </div>
                                            {!isOwner && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => group.items.forEach(item => !permissions[item.jsonKey] && handleToggle(item.jsonKey, item.apiKey))}
                                                        disabled={allEnabled || toggleMutation.isPending}
                                                        className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                                                    >
                                                        Chọn tất cả
                                                    </button>
                                                    <button
                                                        onClick={() => group.items.forEach(item => permissions[item.jsonKey] && handleToggle(item.jsonKey, item.apiKey))}
                                                        disabled={!someEnabled || toggleMutation.isPending}
                                                        className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                                    >
                                                        Bỏ tất cả
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {group.items.map(item => (
                                                <div key={item.jsonKey} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                                    <div>
                                                        <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                                                        {item.badge && (
                                                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${item.badge.color}`}>{item.badge.text}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => !isOwner && handleToggle(item.jsonKey, item.apiKey)}
                                                        disabled={isOwner || toggleMutation.isPending}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${permissions[item.jsonKey] ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permissions[item.jsonKey] ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="btn-primary">
                        <i className="fa-solid fa-check mr-2" />Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Data definitions ───────────────────────────────────────────────────────

const MODULE_LABELS = {
    HR: 'Nhân sự (HR)',
    REVIEW: 'Đánh giá hiệu suất',
    PROJECT: 'Dự án & Công việc',
    TIMETRACKING: 'Chấm công & Nghỉ phép',
    STORAGE: 'Lưu trữ tài liệu',
    ANALYTICS: 'Phân tích',
    CALENDAR: 'Lịch & Sự kiện',
    WORKSPACE: 'Quản trị Workspace',
};

const MODULE_ICONS = {
    HR: 'fa-users',
    REVIEW: 'fa-chart-line',
    PROJECT: 'fa-diagram-project',
    TIMETRACKING: 'fa-clock',
    STORAGE: 'fa-hard-drive',
    ANALYTICS: 'fa-chart-bar',
    CALENDAR: 'fa-calendar',
    WORKSPACE: 'fa-gear',
};

const MODULE_COLORS = {
    HR: 'bg-purple-500',
    REVIEW: 'bg-emerald-500',
    PROJECT: 'bg-blue-500',
    TIMETRACKING: 'bg-amber-500',
    STORAGE: 'bg-blue-600',
    ANALYTICS: 'bg-rose-500',
    CALENDAR: 'bg-cyan-500',
    WORKSPACE: 'bg-gray-500',
};

const MODULE_PERMISSION_MAP = {
    HR: [
        { jsonKey: 'hrViewList', apiKey: 'HR.VIEW_LIST', label: 'Xem danh sách nhân viên' },
        { jsonKey: 'hrEditProfile', apiKey: 'HR.EDIT_PROFILE', label: 'Sửa hồ sơ nhân viên' },
        { jsonKey: 'hrCreateEmployee', apiKey: 'HR.CREATE_EMPLOYEE', label: 'Thêm nhân viên mới' },
        { jsonKey: 'hrDeleteEmployee', apiKey: 'HR.DELETE_EMPLOYEE', label: 'Xóa nhân viên' },
        { jsonKey: 'hrManageReviews', apiKey: 'HR.MANAGE_REVIEWS', label: 'Quản lý đánh giá' },
        { jsonKey: 'hrViewDashboard', apiKey: 'HR.VIEW_DASHBOARD', label: 'Xem thống kê HR' },
        { jsonKey: 'hrExport', apiKey: 'HR.EXPORT', label: 'Xuất dữ liệu HR' },
    ],
    REVIEW: [
        { jsonKey: 'reviewViewAll', apiKey: 'REVIEW.VIEW_ALL', label: 'Xem tất cả đánh giá' },
        { jsonKey: 'reviewCreate', apiKey: 'REVIEW.CREATE', label: 'Tạo đánh giá nhân viên' },
        { jsonKey: 'reviewApprove', apiKey: 'REVIEW.APPROVE', label: 'Phê duyệt đánh giá' },
    ],
    PROJECT: [
        { jsonKey: 'projectCreate', apiKey: 'PROJECT.CREATE', label: 'Tạo dự án mới' },
        { jsonKey: 'projectDelete', apiKey: 'PROJECT.DELETE', label: 'Xóa dự án' },
        { jsonKey: 'projectManageAll', apiKey: 'PROJECT.MANAGE_ALL', label: 'Quản lý toàn bộ dự án' },
        { jsonKey: 'projectManageIssues', apiKey: 'PROJECT.MANAGE_ISSUES', label: 'Quản lý công việc (Issues)' },
        { jsonKey: 'projectManageSprints', apiKey: 'PROJECT.MANAGE_SPRINTS', label: 'Quản lý Sprint' },
        { jsonKey: 'projectManagePhases', apiKey: 'PROJECT.MANAGE_PHASES', label: 'Quản lý giai đoạn (Phases)' },
        { jsonKey: 'projectResourcePlanning', apiKey: 'PROJECT.RESOURCE_PLANNING', label: 'Phân bổ nguồn lực' },
        { jsonKey: 'projectViewDashboard', apiKey: 'PROJECT.VIEW_DASHBOARD', label: 'Xem Dashboard Dự án' },
        { jsonKey: 'projectExport', apiKey: 'PROJECT.EXPORT', label: 'Xuất dữ liệu Dự án' },
    ],
    TIMETRACKING: [
        { jsonKey: 'timetrackingLog', apiKey: 'TIMETRACKING.LOG', label: 'Log thời gian làm việc' },
        { jsonKey: 'timetrackingViewAll', apiKey: 'TIMETRACKING.VIEW_ALL', label: 'Xem Time log của mọi người' },
        { jsonKey: 'leaveApprove', apiKey: 'LEAVE.APPROVE', label: 'Duyệt đơn xin nghỉ' },
        { jsonKey: 'leaveViewAll', apiKey: 'LEAVE.VIEW_ALL', label: 'Xem toàn bộ đơn xin nghỉ' },
    ],
    STORAGE: [
        { jsonKey: 'storageView', apiKey: 'STORAGE.VIEW', label: 'Xem danh sách file & tải xuống' },
        { jsonKey: 'storageUpload', apiKey: 'STORAGE.UPLOAD', label: 'Upload file & tạo thư mục' },
        { jsonKey: 'storageDelete', apiKey: 'STORAGE.DELETE', label: 'Xóa file / thư mục' },
        { jsonKey: 'storageManageAll', apiKey: 'STORAGE.MANAGE_ALL', label: 'Quản lý lưu trữ (ngắt Drive)' },
    ],
    ANALYTICS: [
        { jsonKey: 'analyticsView', apiKey: 'ANALYTICS.VIEW', label: 'Xem Analytics' },
    ],
    CALENDAR: [
        { jsonKey: 'calendarView', apiKey: 'CALENDAR.VIEW', label: 'Xem Lịch chung' },
        { jsonKey: 'calendarManage', apiKey: 'CALENDAR.MANAGE', label: 'Quản lý sự kiện Lịch' },
    ],
    WORKSPACE: [
        { jsonKey: 'workspaceManageMembers', apiKey: 'WORKSPACE.MANAGE_MEMBERS', label: 'Quản lý thành viên' },
        { jsonKey: 'workspaceManageRequests', apiKey: 'WORKSPACE.MANAGE_REQUESTS', label: 'Duyệt yêu cầu gia nhập' },
    ],
};

const PERMISSION_GROUPS = [
    {
        title: 'Quản trị Workspace',
        icon: 'fa-gear',
        items: [
            { jsonKey: 'workspaceManageMembers', apiKey: 'WORKSPACE.MANAGE_MEMBERS', label: 'Quản lý thành viên' },
            { jsonKey: 'workspaceManageRequests', apiKey: 'WORKSPACE.MANAGE_REQUESTS', label: 'Duyệt yêu cầu tham gia' },
        ]
    },
    {
        title: 'Nhân sự (HR)',
        icon: 'fa-users',
        items: [
            { jsonKey: 'hrViewList', apiKey: 'HR.VIEW_LIST', label: 'Xem danh sách nhân viên' },
            { jsonKey: 'hrEditProfile', apiKey: 'HR.EDIT_PROFILE', label: 'Sửa hồ sơ nhân viên' },
            { jsonKey: 'hrCreateEmployee', apiKey: 'HR.CREATE_EMPLOYEE', label: 'Thêm nhân viên mới', badge: { text: 'Nhạy cảm', color: 'bg-red-50 text-red-600' } },
            { jsonKey: 'hrDeleteEmployee', apiKey: 'HR.DELETE_EMPLOYEE', label: 'Xóa nhân viên', badge: { text: 'Nhạy cảm', color: 'bg-red-50 text-red-600' } },
            { jsonKey: 'hrManageReviews', apiKey: 'HR.MANAGE_REVIEWS', label: 'Quản lý đánh giá (Legacy)' },
            { jsonKey: 'hrViewDashboard', apiKey: 'HR.VIEW_DASHBOARD', label: 'Xem thống kê HR' },
            { jsonKey: 'hrExport', apiKey: 'HR.EXPORT', label: 'Xuất dữ liệu HR' },
        ]
    },
    {
        title: 'Đánh giá hiệu suất',
        icon: 'fa-chart-line',
        items: [
            { jsonKey: 'reviewViewAll', apiKey: 'REVIEW.VIEW_ALL', label: 'Xem tất cả đánh giá' },
            { jsonKey: 'reviewCreate', apiKey: 'REVIEW.CREATE', label: 'Tạo đánh giá nhân viên' },
            { jsonKey: 'reviewApprove', apiKey: 'REVIEW.APPROVE', label: 'Phê duyệt đánh giá' },
        ]
    },
    {
        title: 'Dự án & Công việc',
        icon: 'fa-diagram-project',
        items: [
            { jsonKey: 'projectCreate', apiKey: 'PROJECT.CREATE', label: 'Tạo dự án mới' },
            { jsonKey: 'projectDelete', apiKey: 'PROJECT.DELETE', label: 'Xóa dự án', badge: { text: 'Nhạy cảm', color: 'bg-red-50 text-red-600' } },
            { jsonKey: 'projectManageAll', apiKey: 'PROJECT.MANAGE_ALL', label: 'Quản lý toàn bộ dự án' },
            { jsonKey: 'projectManageIssues', apiKey: 'PROJECT.MANAGE_ISSUES', label: 'Quản lý công việc (Issues)' },
            { jsonKey: 'projectManageSprints', apiKey: 'PROJECT.MANAGE_SPRINTS', label: 'Quản lý Sprint' },
            { jsonKey: 'projectManagePhases', apiKey: 'PROJECT.MANAGE_PHASES', label: 'Quản lý giai đoạn (Phases)' },
            { jsonKey: 'projectResourcePlanning', apiKey: 'PROJECT.RESOURCE_PLANNING', label: 'Phân bổ nguồn lực' },
            { jsonKey: 'projectViewDashboard', apiKey: 'PROJECT.VIEW_DASHBOARD', label: 'Xem Dashboard Dự án' },
            { jsonKey: 'projectExport', apiKey: 'PROJECT.EXPORT', label: 'Xuất dữ liệu Dự án' },
        ]
    },
    {
        title: 'Chấm công & Nghỉ phép',
        icon: 'fa-clock',
        items: [
            { jsonKey: 'timetrackingLog', apiKey: 'TIMETRACKING.LOG', label: 'Log thời gian làm việc' },
            { jsonKey: 'timetrackingViewAll', apiKey: 'TIMETRACKING.VIEW_ALL', label: 'Xem Time log của mọi người' },
            { jsonKey: 'leaveApprove', apiKey: 'LEAVE.APPROVE', label: 'Duyệt đơn xin nghỉ' },
            { jsonKey: 'leaveViewAll', apiKey: 'LEAVE.VIEW_ALL', label: 'Xem toàn bộ đơn xin nghỉ' },
        ]
    },
    {
        title: 'Khác',
        icon: 'fa-ellipsis-h',
        items: [
            { jsonKey: 'analyticsView', apiKey: 'ANALYTICS.VIEW', label: 'Xem Analytics' },
            { jsonKey: 'calendarView', apiKey: 'CALENDAR.VIEW', label: 'Xem Lịch chung' },
            { jsonKey: 'calendarManage', apiKey: 'CALENDAR.MANAGE', label: 'Quản lý sự kiện Lịch' },
            { jsonKey: 'storageView', apiKey: 'STORAGE.VIEW', label: 'Xem & tải file' },
            { jsonKey: 'storageUpload', apiKey: 'STORAGE.UPLOAD', label: 'Upload file & tạo thư mục' },
            { jsonKey: 'storageDelete', apiKey: 'STORAGE.DELETE', label: 'Xóa file' },
            { jsonKey: 'storageManageAll', apiKey: 'STORAGE.MANAGE_ALL', label: 'Quản lý lưu trữ' },
        ]
    },
];

const ROLE_PRESETS = [
    {
        id: 'developer',
        name: 'Developer',
        description: 'Thành viên tham gia dự án, tạo issues, log thời gian. Không có quyền quản lý.',
        icon: 'fa-code',
        color: 'bg-blue-500',
        tags: ['Issues', 'Sprints', 'Time Log'],
        permissions: {
            projectManageIssues: true,
            projectManageSprints: false,
            projectManagePhases: false,
            projectManageAll: false,
            projectCreate: false,
            projectDelete: false,
            projectResourcePlanning: false,
            projectViewDashboard: false,
            projectExport: false,
            timetrackingLog: true,
            timetrackingViewAll: false,
            leaveApprove: false,
            leaveViewAll: false,
            hrViewList: false,
            hrEditProfile: false,
            hrCreateEmployee: false,
            hrDeleteEmployee: false,
            hrManageReviews: false,
            hrViewDashboard: false,
            hrExport: false,
            reviewViewAll: false,
            reviewCreate: false,
            reviewApprove: false,
            analyticsView: false,
            calendarView: true,
            calendarManage: false,
            workspaceManageMembers: false,
            workspaceManageRequests: false,
            storageView: true,
            storageUpload: true,
            storageDelete: false,
            storageManageAll: false,
        }
    },
    {
        id: 'project_manager',
        name: 'Project Manager',
        description: 'Quản lý dự án toàn diện: sprints, issues, phases, resource planning.',
        icon: 'fa-clipboard-list',
        color: 'bg-indigo-500',
        tags: ['Sprints', 'Issues', 'Phases', 'Resource', 'Time Log'],
        permissions: {
            projectManageIssues: true,
            projectManageSprints: true,
            projectManagePhases: true,
            projectManageAll: false,
            projectCreate: true,
            projectDelete: false,
            projectResourcePlanning: true,
            projectViewDashboard: true,
            projectExport: true,
            timetrackingLog: true,
            timetrackingViewAll: true,
            leaveApprove: true,
            leaveViewAll: true,
            hrViewList: false,
            hrEditProfile: false,
            hrCreateEmployee: false,
            hrDeleteEmployee: false,
            hrManageReviews: false,
            hrViewDashboard: false,
            hrExport: false,
            reviewViewAll: true,
            reviewCreate: true,
            reviewApprove: true,
            analyticsView: true,
            calendarView: true,
            calendarManage: true,
            workspaceManageMembers: false,
            workspaceManageRequests: false,
            storageView: true,
            storageUpload: true,
            storageDelete: true,
            storageManageAll: false,
        }
    },
    {
        id: 'hr_manager',
        name: 'HR Manager',
        description: 'Quản lý nhân sự, đánh giá, phê duyệt nghỉ phép. Không tham gia kỹ thuật.',
        icon: 'fa-user-tie',
        color: 'bg-purple-500',
        tags: ['HR', 'Reviews', 'Leave', 'Analytics'],
        permissions: {
            projectManageIssues: false,
            projectManageSprints: false,
            projectManagePhases: false,
            projectManageAll: false,
            projectCreate: false,
            projectDelete: false,
            projectResourcePlanning: false,
            projectViewDashboard: false,
            projectExport: false,
            timetrackingLog: false,
            timetrackingViewAll: true,
            leaveApprove: true,
            leaveViewAll: true,
            hrViewList: true,
            hrEditProfile: true,
            hrCreateEmployee: true,
            hrDeleteEmployee: true,
            hrManageReviews: true,
            hrViewDashboard: true,
            hrExport: true,
            reviewViewAll: true,
            reviewCreate: true,
            reviewApprove: true,
            analyticsView: true,
            calendarView: true,
            calendarManage: false,
            workspaceManageMembers: false,
            workspaceManageRequests: false,
            storageView: true,
            storageUpload: false,
            storageDelete: false,
            storageManageAll: false,
        }
    },
    {
        id: 'viewer',
        name: 'Viewer (Chỉ xem)',
        description: 'Xem thông tin dự án, lịch, phân tích. Không có quyền tạo hoặc sửa.',
        icon: 'fa-eye',
        color: 'bg-gray-400',
        tags: ['Read-only'],
        permissions: {
            projectManageIssues: false,
            projectManageSprints: false,
            projectManagePhases: false,
            projectManageAll: false,
            projectCreate: false,
            projectDelete: false,
            projectResourcePlanning: false,
            projectViewDashboard: true,
            projectExport: false,
            timetrackingLog: false,
            timetrackingViewAll: false,
            leaveApprove: false,
            leaveViewAll: false,
            hrViewList: false,
            hrEditProfile: false,
            hrCreateEmployee: false,
            hrDeleteEmployee: false,
            hrManageReviews: false,
            hrViewDashboard: false,
            hrExport: false,
            reviewViewAll: false,
            reviewCreate: false,
            reviewApprove: false,
            analyticsView: true,
            calendarView: true,
            calendarManage: false,
            workspaceManageMembers: false,
            workspaceManageRequests: false,
            storageView: true,
            storageUpload: false,
            storageDelete: false,
            storageManageAll: false,
        }
    },
];

// Flat list for preset matching
const ALL_PERMISSION_ITEMS = Object.values(MODULE_PERMISSION_MAP).flat();
