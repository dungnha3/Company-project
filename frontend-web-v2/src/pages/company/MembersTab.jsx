import React, { useState } from 'react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { useToast } from '@app/providers/ToastProvider';
import { Avatar } from '@shared/components/OptimizedImage';
import InviteMemberModal from '@features/company/components/InviteMemberModal';
import EditPermissionsModal from './components/EditPermissionsModal';

export default function MembersTab() {
    const { currentWorkspace } = useWorkspaceStore();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

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

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Thành viên Workspace</h2>
                    <p className="text-sm text-gray-500">Quản lý những người có quyền truy cập vào Workspace này</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="btn-primary"
                >
                    <i className="fa-solid fa-user-plus mr-2" /> Mời thành viên
                </button>
            </div>

            <div className="space-y-3">
                {members?.map(member => (
                    <div key={member.userId} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <Avatar src={member.avatarUrl} name={member.fullName} size="md" />
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">
                                    {member.fullName} 
                                    {member.role === 'OWNER' && <span className="ml-2 text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Chủ sở hữu</span>}
                                    {member.role === 'COMPANY_ADMIN' && <span className="ml-2 text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Quản trị viên</span>}
                                </p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Nút sửa quyền (Mở modal) */}
                            <button
                                onClick={() => setEditingMember(member)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                <i className="fa-solid fa-sliders mr-1" /> Sửa quyền
                            </button>

                            {/* Nút xóa */}
                            {member.role !== 'OWNER' && (
                                <button
                                    onClick={() => handleRemove(member.userId)}
                                    disabled={removeMutation.isPending}
                                    className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <i className="fa-solid fa-trash" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

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
