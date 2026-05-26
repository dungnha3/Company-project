import React, { useState } from 'react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import { useToast } from '@app/providers/ToastProvider';
import { Avatar } from '@shared/components/OptimizedImage';
import InviteMemberModal from '@features/company/components/InviteMemberModal';
import EditPermissionsModal from './components/EditPermissionsModal';

function PermissionBadge({ label, color, active }) {
    if (!active) return null;
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
            {label}
        </span>
    );
}

function MemberPermissionBadges({ permissions }) {
    if (!permissions) return null;
    const badges = [];
    if (permissions.projectManageIssues || permissions.projectManageSprints || permissions.projectManagePhases) badges.push({ label: 'Dự án', color: 'bg-blue-50 text-blue-600' });
    if (permissions.hrViewList || permissions.hrManageReviews) badges.push({ label: 'HR', color: 'bg-purple-50 text-purple-600' });
    if (permissions.reviewCreate || permissions.reviewViewAll) badges.push({ label: 'Review', color: 'bg-emerald-50 text-emerald-600' });
    if (permissions.leaveApprove) badges.push({ label: 'Duyệt nghỉ', color: 'bg-amber-50 text-amber-600' });
    if (permissions.timetrackingViewAll) badges.push({ label: 'Time log', color: 'bg-cyan-50 text-cyan-600' });
    if (permissions.workspaceManageMembers || permissions.workspaceManageRequests) badges.push({ label: 'Admin', color: 'bg-gray-800 text-white' });
    if (permissions.analyticsView) badges.push({ label: 'Analytics', color: 'bg-rose-50 text-rose-600' });
    if (permissions.calendarManage) badges.push({ label: 'Lịch', color: 'bg-indigo-50 text-indigo-600' });
    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {badges.map((b, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.color}`}>{b.label}</span>
            ))}
            {badges.length === 0 && <span className="text-xs text-gray-400 italic">Không có quyền đặc biệt</span>}
        </div>
    );
}

export default function MembersTab() {
    const { currentWorkspace } = useWorkspaceStore();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { hasPermission } = useAccessControl();
    const canManageMembers = hasPermission('WORKSPACE.MANAGE_MEMBERS');

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const { data: members, isLoading } = useQuery({
        queryKey: ['workspace-members', currentWorkspace?.id],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.COMPANIES.MEMBERS(currentWorkspace?.id));
            return res.data;
        },
        enabled: !!currentWorkspace?.id
    });

    const removeMutation = useMutation({
        mutationFn: async (userId) => {
            await apiClient.delete(ENDPOINTS.COMPANIES.MEMBER_REMOVE(currentWorkspace.id, userId));
        },
        onSuccess: () => {
            showToast('Đã xóa thành viên', 'success');
            queryClient.invalidateQueries(['workspace-members', currentWorkspace?.id]);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lỗi khi xóa thành viên', 'error')
    });

    const handleRemove = (userId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi Workspace?')) {
            removeMutation.mutate(userId);
        }
    };

    useEffect(() => {
        const memberUserId = searchParams.get('memberUserId');
        if (!memberUserId || !members?.length) return;
        const target = members.find((m) => String(m.userId) === String(memberUserId));
        if (target) {
            setEditingMember(target);
            searchParams.delete('memberUserId');
            setSearchParams(searchParams, { replace: true });
        }
    }, [members, searchParams, setSearchParams]);

    if (isLoading) return <div className="py-8 flex justify-center"><i className="fa-solid fa-spinner fa-spin text-indigo-500 text-xl" /></div>;

    const admins = members?.filter(m => m.role === 'OWNER' || m.role === 'COMPANY_ADMIN') || [];
    const regularMembers = members?.filter(m => m.role !== 'OWNER' && m.role !== 'COMPANY_ADMIN') || [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Thành viên Workspace</h2>
                        <p className="text-sm text-gray-500">{members?.length || 0} thành viên</p>
                    </div>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="btn-primary"
                    >
                        <i className="fa-solid fa-user-plus mr-2" /> Mời thành viên
                    </button>
                </div>
            </div>

            {/* Admins section */}
            {admins.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                            <i className="fa-solid fa-shield-halved text-gray-400" />Quản trị viên
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {admins.map(member => (
                            <MemberRow
                                key={member.userId}
                                member={member}
                                onEdit={() => setEditingMember(member)}
                                onRemove={handleRemove}
                                removePending={removeMutation.isPending}
                                canManageMembers={canManageMembers}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Regular members */}
            {regularMembers.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                            <i className="fa-solid fa-users text-gray-400" />Thành viên ({regularMembers.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {regularMembers.map(member => (
                            <MemberRow
                                key={member.userId}
                                member={member}
                                onEdit={() => setEditingMember(member)}
                                onRemove={handleRemove}
                                removePending={removeMutation.isPending}
                                canManageMembers={canManageMembers}
                            />
                        ))}
                    </div>
                </div>
            )}

            {members?.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-users text-2xl text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Chưa có thành viên nào</p>
                    <button onClick={() => setIsInviteModalOpen(true)} className="btn-primary mt-4">
                        <i className="fa-solid fa-user-plus mr-2" />Mời thành viên đầu tiên
                    </button>
                </div>
            )}

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />

            {editingMember && (
                <EditPermissionsModal
                    isOpen={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    member={editingMember}
                />
            )}
        </div>
    );
}

function MemberRow({ member, onEdit, onRemove, removePending, canManageMembers }) {
    const isOwner = member.role === 'OWNER';

    return (
        <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
                <Avatar src={member.avatarUrl} name={member.fullName} size="md" />
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{member.fullName}</p>
                        {isOwner && (
                            <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
                                <i className="fa-solid fa-crown mr-1" />OWNER
                            </span>
                        )}
                        {member.role === 'COMPANY_ADMIN' && (
                            <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full shrink-0">
                                ADMIN
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    <MemberPermissionBadges permissions={member.permissions} />
                </div>
            </div>
            {canManageMembers && (
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={onEdit}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                        <i className="fa-solid fa-sliders text-xs" />
                        Phân quyền
                    </button>
                    {!isOwner && (
                        <button
                            onClick={() => onRemove(member.userId)}
                            disabled={removePending}
                            className="p-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa thành viên"
                        >
                            <i className="fa-solid fa-trash text-sm" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

