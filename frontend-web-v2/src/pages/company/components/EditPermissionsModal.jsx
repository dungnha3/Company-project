import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useToast } from '@app/providers/ToastProvider';

export default function EditPermissionsModal({ isOpen, onClose, member }) {
    const { currentWorkspace } = useWorkspaceStore();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Tách riêng state để update UI ngay lập tức khi bật/tắt (Optimistic update)
    const [permissions, setPermissions] = useState({});

    useEffect(() => {
        if (member?.permissions) {
            setPermissions(member.permissions);
        }
    }, [member]);

    const togglePermissionMutation = useMutation({
        mutationFn: async ({ permissionKey, enabled }) => {
            await apiClient.put(ENDPOINTS.COMPANIES.MEMBER_PERMISSIONS(currentWorkspace.id, member.userId), {
                permissionKey,
                enabled
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['workspace-members', currentWorkspace?.id]);
        },
        onError: (err) => {
            showToast(err.response?.data?.message || 'Không thể cập nhật quyền', 'error');
            // Revert state nếu lỗi
            if (member?.permissions) {
                setPermissions(member.permissions);
            }
        }
    });

    const handleToggle = (jsonKey, apiKey) => {
        const newValue = !permissions[jsonKey];
        setPermissions(prev => ({ ...prev, [jsonKey]: newValue })); // Update UI immediately
        togglePermissionMutation.mutate({ permissionKey: apiKey, enabled: newValue });
    };

    // Toggle all permissions in a group
    const handleToggleGroup = (group, enable) => {
        const updates = {};
        group.items.forEach(item => {
            if (permissions[item.jsonKey] !== enable) {
                updates[item.jsonKey] = enable;
            }
        });

        if (Object.keys(updates).length === 0) return;

        setPermissions(prev => ({ ...prev, ...updates }));

        // Call API for each permission
        group.items.forEach(item => {
            if (updates[item.jsonKey] !== undefined) {
                togglePermissionMutation.mutate({ permissionKey: item.apiKey, enabled: updates[item.jsonKey] });
            }
        });
    };

    // Check if all items in a group are enabled
    const isGroupAllEnabled = (group) => {
        return group.items.every(item => permissions[item.jsonKey]);
    };

    if (!isOpen || !member) return null;

    // Định nghĩa các nhóm quyền để hiển thị
    const permissionGroups = [
        {
            title: "Quản trị Hệ thống",
            items: [
                { jsonKey: 'workspaceManageMembers', apiKey: 'WORKSPACE.MANAGE_MEMBERS', label: 'Quản lý thành viên' },
                { jsonKey: 'workspaceManageRequests', apiKey: 'WORKSPACE.MANAGE_REQUESTS', label: 'Duyệt yêu cầu tham gia' },
            ]
        },
        {
            title: "Nhân sự (HR)",
            items: [
                { jsonKey: 'hrViewList', apiKey: 'HR.VIEW_LIST', label: 'Xem danh sách nhân viên' },
                { jsonKey: 'hrEditProfile', apiKey: 'HR.EDIT_PROFILE', label: 'Sửa hồ sơ nhân viên' },
                { jsonKey: 'hrCreateEmployee', apiKey: 'HR.CREATE_EMPLOYEE', label: 'Thêm nhân viên mới' },
                { jsonKey: 'hrDeleteEmployee', apiKey: 'HR.DELETE_EMPLOYEE', label: 'Xóa nhân viên' },
                { jsonKey: 'hrManageReviews', apiKey: 'HR.MANAGE_REVIEWS', label: 'Quản lý đánh giá (Legacy)' },
                { jsonKey: 'hrViewDashboard', apiKey: 'HR.VIEW_DASHBOARD', label: 'Xem thống kê HR' },
                { jsonKey: 'hrExport', apiKey: 'HR.EXPORT', label: 'Xuất dữ liệu HR' },
            ]
        },
        {
            title: "Đánh giá hiệu suất",
            items: [
                { jsonKey: 'reviewViewAll', apiKey: 'REVIEW.VIEW_ALL', label: 'Xem tất cả đánh giá' },
                { jsonKey: 'reviewCreate', apiKey: 'REVIEW.CREATE', label: 'Tạo đánh giá nhân viên' },
                { jsonKey: 'reviewApprove', apiKey: 'REVIEW.APPROVE', label: 'Phê duyệt đánh giá' },
            ]
        },
        {
            title: "Dự án & Công việc",
            items: [
                { jsonKey: 'projectCreate', apiKey: 'PROJECT.CREATE', label: 'Tạo dự án mới' },
                { jsonKey: 'projectDelete', apiKey: 'PROJECT.DELETE', label: 'Xóa dự án' },
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
            title: "Chấm công & Nghỉ phép",
            items: [
                { jsonKey: 'timetrackingLog', apiKey: 'TIMETRACKING.LOG', label: 'Log thời gian làm việc' },
                { jsonKey: 'timetrackingViewAll', apiKey: 'TIMETRACKING.VIEW_ALL', label: 'Xem Time log của mọi người' },
                { jsonKey: 'leaveApprove', apiKey: 'LEAVE.APPROVE', label: 'Duyệt đơn xin nghỉ' },
                { jsonKey: 'leaveViewAll', apiKey: 'LEAVE.VIEW_ALL', label: 'Xem toàn bộ đơn xin nghỉ' },
            ]
        },
        {
            title: "Khác",
            items: [
                { jsonKey: 'analyticsView', apiKey: 'ANALYTICS.VIEW', label: 'Xem Analytics' },
                { jsonKey: 'calendarView', apiKey: 'CALENDAR.VIEW', label: 'Xem Lịch chung' },
                { jsonKey: 'calendarManage', apiKey: 'CALENDAR.MANAGE', label: 'Quản lý sự kiện Lịch' },
            ]
        }
    ];

    const isOwner = member.role === 'OWNER';

    return (
        <div className="modal-overlay">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Chỉnh sửa Quyền</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Thành viên: <span className="font-semibold text-indigo-600">{member.fullName}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {isOwner && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex gap-3">
                            <i className="fa-solid fa-triangle-exclamation mt-0.5" />
                            <div>
                                <p className="font-bold">Người này là Chủ sở hữu (OWNER)</p>
                                <p>Chủ sở hữu luôn có toàn quyền trong Workspace. Bạn không thể tắt các quyền này.</p>
                            </div>
                        </div>
                    )}

                    {permissionGroups.map(group => (
                        <div key={group.title} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800">{group.title}</h3>
                                {!isOwner && (
                                    <button
                                        onClick={() => handleToggleGroup(group, !isGroupAllEnabled(group))}
                                        disabled={togglePermissionMutation.isPending}
                                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                            isGroupAllEnabled(group)
                                                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        } disabled:opacity-50`}
                                    >
                                        {isGroupAllEnabled(group) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                )}
                            </div>
                            <div className="divide-y divide-gray-50">
                                {group.items.map(item => (
                                    <div key={item.jsonKey} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                        <div className="text-sm text-gray-700 font-medium">{item.label}</div>
                                        <button
                                            onClick={() => handleToggle(item.jsonKey, item.apiKey)}
                                            disabled={isOwner || togglePermissionMutation.isPending}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${(isOwner || permissions[item.jsonKey]) ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(isOwner || permissions[item.jsonKey]) ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="btn-primary">Đóng</button>
                </div>
            </div>
        </div>
    );
}
