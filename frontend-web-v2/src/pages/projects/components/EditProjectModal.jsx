import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useAccessControl } from '@shared/hooks/useAccessControl';

const STATUS_OPTIONS = [
    { value: 'PLANNING', label: 'Lập kế hoạch', color: 'bg-gray-100 text-gray-700' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'ON_HOLD', label: 'Tạm dừng', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'COMPLETED', label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
    { value: 'CANCELLED', label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
];

export default function EditProjectModal({ project, onClose, onSuccess }) {
    const [activeTab, setActiveTab] = useState('info'); // info | members
    const [form, setForm] = useState({
        name: '',
        keyProject: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'PLANNING',
        budget: '',
    });
    const [memberEmail, setMemberEmail] = useState('');
    const [searchError, setSearchError] = useState('');
    const toast = useToast();
    const queryClient = useQueryClient();
    const { hasPermission } = useAccessControl();
    const canManageAll = hasPermission('PROJECT.MANAGE_ALL');

    // Initialize form with project data
    useEffect(() => {
        if (project) {
            setForm({
                name: project.name || '',
                keyProject: project.keyProject || '',
                description: project.description || '',
                startDate: project.startDate?.split('T')[0] || '',
                endDate: project.endDate?.split('T')[0] || '',
                status: project.status || 'PLANNING',
                budget: project.budget || '',
            });
        }
    }, [project]);

    // Fetch project members
    const { data: members = [], refetch: refetchMembers } = useQuery({
        queryKey: ['projectMembers', project?.projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.PROJECTS.MEMBERS(project.projectId))).data,
        enabled: !!project?.projectId,
    });

    // Update project mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            return (await apiClient.put(ENDPOINTS.PROJECTS.BY_ID(project.projectId), data)).data;
        },
        onSuccess: () => {
            toast.success('Cập nhật dự án thành công!');
            queryClient.invalidateQueries({ queryKey: ['project', project.projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            onSuccess?.();
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    // Add member mutation
    const addMemberMutation = useMutation({
        mutationFn: async ({ userId, role }) => {
            return apiClient.post(ENDPOINTS.PROJECTS.ADD_MEMBER(project.projectId), { userId, role });
        },
        onSuccess: () => {
            toast.success('Đã thêm thành viên!');
            refetchMembers();
            setMemberEmail('');
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    // Remove member mutation
    const removeMemberMutation = useMutation({
        mutationFn: async (userId) => {
            return apiClient.delete(ENDPOINTS.PROJECTS.REMOVE_MEMBER(project.projectId, userId));
        },
        onSuccess: () => {
            toast.success('Đã xóa thành viên!');
            refetchMembers();
        },
    });

    const handleSearchMember = async () => {
        if (!memberEmail.trim()) return;
        setSearchError('');

        try {
            const res = await apiClient.get(ENDPOINTS.USERS.SEARCH, { params: { query: memberEmail } });
            const users = res.data;
            const user = users.find(u => u.email?.toLowerCase() === memberEmail.toLowerCase());

            if (user) {
                if (members.find(m => m.userId === user.userId)) {
                    setSearchError('Thành viên này đã trong dự án');
                } else {
                    addMemberMutation.mutate({ userId: user.userId, role: 'MEMBER' });
                }
            } else {
                setSearchError('Không tìm thấy user với email này');
            }
        } catch (err) {
            setSearchError('Lỗi tìm kiếm: ' + err.message);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Vui lòng nhập tên dự án');
            return;
        }
        updateMutation.mutate(form);
    };

    if (!project) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-pink-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">Chỉnh sửa dự án</h2>
                        <p className="text-purple-100 text-sm">{project.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center"
                    >
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors
                            ${activeTab === 'info'
                                ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="fa-solid fa-info-circle" />
                        Thông tin
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors
                            ${activeTab === 'members'
                                ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="fa-solid fa-users" />
                        Thành viên ({members.length})
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                    {activeTab === 'info' && (
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tên dự án <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã dự án</label>
                                    <input
                                        type="text"
                                        value={form.keyProject}
                                        disabled
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Không thể thay đổi mã dự án</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách (VND)</label>
                                    <input
                                        type="number"
                                        value={form.budget}
                                        onChange={(e) => setForm({ ...form, budget: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={!canManageAll || updateMutation.isPending}
                                    className={`px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 ${!canManageAll ? 'cursor-not-allowed' : ''}`}
                                >
                                    {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'members' && (
                        <div className="p-6 space-y-4">
                            {/* Add member */}
                            {canManageAll && (
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={memberEmail}
                                        onChange={(e) => { setMemberEmail(e.target.value); setSearchError(''); }}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchMember())}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="Nhập email để thêm thành viên"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSearchMember}
                                    disabled={addMemberMutation.isPending}
                                    className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                >
                                    <i className="fa-solid fa-plus mr-2" />
                                    Thêm
                                </button>
                            </div>
                            )}
                            {searchError && <p className="text-sm text-red-500">{searchError}</p>}

                            {/* Members list */}
                            <div className="space-y-2">
                                {members.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">Chưa có thành viên nào</p>
                                ) : (
                                    members.map(member => (
                                        <div
                                            key={member.userId}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                                                    {member.username?.charAt(0).toUpperCase() || member.fullName?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{member.username || member.fullName}</div>
                                                    <div className="text-xs text-gray-500">{member.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium
                                                    ${member.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                                                        member.role === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' :
                                                            'bg-gray-100 text-gray-700'}`}
                                                >
                                                    {member.role === 'OWNER' ? 'Chủ dự án' :
                                                        member.role === 'MANAGER' ? 'Quản lý' : 'Thành viên'}
                                                </span>
                                                {canManageAll && member.role !== 'OWNER' && (
                                                    <button
                                                        onClick={() => removeMemberMutation.mutate(member.userId)}
                                                        disabled={removeMemberMutation.isPending}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Xóa thành viên"
                                                    >
                                                        <i className="fa-solid fa-trash text-sm" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
