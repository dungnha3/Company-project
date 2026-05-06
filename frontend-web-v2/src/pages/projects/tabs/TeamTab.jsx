import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

const STATUS_LABELS = {
    ACTIVE: { label: 'Đang làm', color: 'bg-green-100 text-green-700' },
    INACTIVE: { label: 'Tạm ngừng', color: 'bg-gray-100 text-gray-500' },
    PENDING: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700' },
};

const ROLE_LABELS = {
    OWNER: { label: 'Owner', color: 'bg-purple-100 text-purple-700' },
    MANAGER: { label: 'Manager', color: 'bg-blue-100 text-blue-700' },
    MEMBER: { label: 'Member', color: 'bg-gray-100 text-gray-600' },
};

function AllocationBar({ value }) {
    const pct = Math.min(100, Math.max(0, value || 0));
    const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-500';
    return (
        <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-semibold ${pct > 90 ? 'text-red-600' : 'text-gray-600'}`}>{pct}%</span>
            {pct > 100 && <i className="fa-solid fa-triangle-exclamation text-xs text-red-500" title="Overload!" />}
        </div>
    );
}

function EditMemberModal({ member, projectId, onClose }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        position: member.position || '',
        allocationRate: member.allocationRate ?? 100,
        memberStatus: member.memberStatus || 'ACTIVE',
        yearsOfExperience: member.yearsOfExperience ?? '',
        billingRate: member.billingRate ?? '',
        skillNotes: member.skillNotes || '',
        joinDate: member.joinDate || '',
        leaveDate: member.leaveDate || '',
    });

    const updateMutation = useMutation({
        mutationFn: (data) =>
            apiClient.patch(`/api/projects/${projectId}/members/${member.userId}/info`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
            onClose();
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            allocationRate: form.allocationRate ? Number(form.allocationRate) : null,
            yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
            billingRate: form.billingRate ? Number(form.billingRate) : null,
            joinDate: form.joinDate || null,
            leaveDate: form.leaveDate || null,
        };
        updateMutation.mutate(payload);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.username} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                {(member.fullName || member.username || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{member.fullName || member.username}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-xmark text-lg" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
                            <input
                                type="text"
                                className="input-field w-full"
                                placeholder="Frontend Dev, BA, QC..."
                                value={form.position}
                                onChange={(e) => setForm({ ...form, position: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                            <select
                                className="input-field w-full"
                                value={form.memberStatus}
                                onChange={(e) => setForm({ ...form, memberStatus: e.target.value })}
                            >
                                <option value="ACTIVE">Đang làm</option>
                                <option value="INACTIVE">Tạm ngừng</option>
                                <option value="PENDING">Chờ xác nhận</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Allocation (%)
                            </label>
                            <input
                                type="number" min="0" max="100"
                                className="input-field w-full"
                                value={form.allocationRate}
                                onChange={(e) => setForm({ ...form, allocationRate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Năm KN</label>
                            <input
                                type="number" min="0"
                                className="input-field w-full"
                                value={form.yearsOfExperience}
                                onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày vào dự án</label>
                            <input
                                type="date"
                                className="input-field w-full"
                                value={form.joinDate}
                                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Billing rate (VNĐ/h)</label>
                            <input
                                type="number" min="0"
                                className="input-field w-full"
                                placeholder="0"
                                value={form.billingRate}
                                onChange={(e) => setForm({ ...form, billingRate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú kỹ năng</label>
                        <textarea
                            className="input-field w-full resize-none"
                            rows={3}
                            placeholder="React, TypeScript, CI/CD..."
                            value={form.skillNotes}
                            onChange={(e) => setForm({ ...form, skillNotes: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="btn-primary flex-1"
                        >
                            {updateMutation.isPending ? (
                                <><i className="fa-solid fa-spinner fa-spin mr-2" />Đang lưu...</>
                            ) : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function MemberCard({ member, projectId, canManage }) {
    const [editing, setEditing] = useState(false);
    const status = STATUS_LABELS[member.memberStatus] || STATUS_LABELS.ACTIVE;
    const role = ROLE_LABELS[member.role] || ROLE_LABELS.MEMBER;

    const completionRate = member.totalIssues > 0
        ? Math.round((member.completedIssues / member.totalIssues) * 100)
        : 0;

    return (
        <>
            <div className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.username} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow" />
                        ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                {(member.fullName || member.username || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                                {member.fullName || member.username}
                            </p>
                            <p className="text-xs text-gray-500">{member.position || member.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.color}`}>{role.label}</span>
                        {canManage && (
                            <button
                                onClick={() => setEditing(true)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600"
                                title="Chỉnh sửa thông tin"
                            >
                                <i className="fa-solid fa-pen-to-square text-sm" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Status + Allocation */}
                <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                        {member.yearsOfExperience != null && (
                            <span className="text-gray-400">{member.yearsOfExperience} năm KN</span>
                        )}
                    </div>
                    {member.allocationRate != null && (
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Allocation</p>
                            <AllocationBar value={member.allocationRate} />
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{member.completedIssues ?? 0}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">Hoàn thành</p>
                    </div>
                    <div className="text-center border-x border-gray-200 dark:border-gray-600">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{member.totalIssues ?? 0}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">Tổng task</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {member.totalLoggedHours != null ? Number(member.totalLoggedHours).toFixed(1) : '—'}
                        </p>
                        <p className="text-[10px] text-gray-500 leading-tight">Giờ làm</p>
                    </div>
                </div>

                {/* Completion bar */}
                {(member.totalIssues ?? 0) > 0 && (
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Tiến độ task</span>
                            <span>{completionRate}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all"
                                style={{ width: `${completionRate}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Skill notes */}
                {member.skillNotes && (
                    <p className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-2 line-clamp-2">
                        <i className="fa-solid fa-tag mr-1 text-indigo-400" />
                        {member.skillNotes}
                    </p>
                )}
            </div>

            {editing && (
                <EditMemberModal
                    member={member}
                    projectId={projectId}
                    onClose={() => setEditing(false)}
                />
            )}
        </>
    );
}

export default function TeamTab({ projectId }) {
    const { hasPermission } = useWorkspaceStore();
    const canManage = hasPermission('projectManageAll');

    const { data: members = [], isLoading } = useQuery({
        queryKey: ['project-members', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(projectId))).data,
        staleTime: 30_000,
    });

    // Stats summary
    const totalAllocation = members.reduce((s, m) => s + (m.allocationRate || 0), 0);
    const overloaded = members.filter((m) => (m.allocationRate || 0) > 100);
    const avgCompletion = members.length > 0
        ? Math.round(members.reduce((s, m) => {
            const r = m.totalIssues > 0 ? (m.completedIssues / m.totalIssues) * 100 : 0;
            return s + r;
        }, 0) / members.length)
        : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{members.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Thành viên</p>
                </div>
                <div className={`card p-4 text-center ${totalAllocation > 400 ? 'ring-1 ring-red-300' : ''}`}>
                    <p className={`text-2xl font-bold ${totalAllocation > 400 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {totalAllocation}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Tổng allocation</p>
                </div>
                <div className="card p-4 text-center">
                    <p className={`text-2xl font-bold ${overloaded.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {overloaded.length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Overloaded</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{avgCompletion}%</p>
                    <p className="text-xs text-gray-500 mt-1">Tiến độ TB</p>
                </div>
            </div>

            {/* Overload warning */}
            {overloaded.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5" />
                    <div>
                        <p className="font-semibold">Cảnh báo overload</p>
                        <p className="text-amber-700 mt-0.5">
                            {overloaded.map((m) => m.fullName || m.username).join(', ')} đang có allocation &gt; 100%.
                            Cân nhắc điều chỉnh phân công.
                        </p>
                    </div>
                </div>
            )}

            {/* Member grid */}
            {members.length === 0 ? (
                <div className="card p-12 text-center">
                    <i className="fa-solid fa-users text-4xl text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">Chưa có thành viên nào</p>
                    <p className="text-gray-400 text-sm mt-1">Thêm thành viên để bắt đầu cộng tác</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {members.map((m) => (
                        <MemberCard
                            key={m.id}
                            member={m}
                            projectId={projectId}
                            canManage={canManage}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
