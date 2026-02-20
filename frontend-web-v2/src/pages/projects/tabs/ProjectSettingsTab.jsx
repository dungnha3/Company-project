import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = [
    { value: 'PLANNING', label: 'Lập kế hoạch' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'ON_HOLD', label: 'Tạm dừng' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

export default function ProjectSettingsTab({ project }) {
    const [form, setForm] = useState({
        name: '',
        keyProject: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'PLANNING',
    });
    const [memberEmail, setMemberEmail] = useState('');
    const [searchError, setSearchError] = useState('');
    const toast = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Initialize form
    useEffect(() => {
        if (project) {
            setForm({
                name: project.name || '',
                keyProject: project.keyProject || '',
                description: project.description || '',
                startDate: project.startDate?.split('T')[0] || '',
                endDate: project.endDate?.split('T')[0] || '',
                status: project.status || 'PLANNING',
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
            queryClient.invalidateQueries(['project', project.projectId]);
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

    // Delete Project Mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            return apiClient.delete(ENDPOINTS.PROJECTS.BY_ID(project.projectId));
        },
        onSuccess: () => {
            toast.success('Đã xóa dự án');
            navigate('/app/projects');
        },
        onError: (err) => toast.error('Lỗi khi xóa dự án: ' + err.message)
    });

    const handleSearchMember = async () => {
        if (!memberEmail.trim()) return;
        setSearchError('');

        try {
            const res = await apiClient.get(ENDPOINTS.USERS.SEARCH, { params: { q: memberEmail } });
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
        updateMutation.mutate(form);
    };

    const handleDelete = () => {
        if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa dự án này? Hành động này không thể hoàn tác!')) {
            if (window.confirm('Hãy xác nhận lại lần nữa. Xóa dự án?')) {
                deleteMutation.mutate();
            }
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-10">
            {/* General Info Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Thông tin chung</h3>
                    <p className="text-sm text-gray-500">Cập nhật thông tin cơ bản của dự án</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Tên dự án</label>
                            <input
                                type="text"
                                className="input"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Mã dự án (Key)</label>
                            <input
                                type="text"
                                className="input bg-gray-50 text-gray-500"
                                value={form.keyProject}
                                disabled
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Mô tả</label>
                        <textarea
                            className="input resize-none"
                            rows={3}
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="label">Ngày bắt đầu</label>
                            <input
                                type="date"
                                className="input"
                                value={form.startDate}
                                onChange={e => setForm({ ...form, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Ngày kết thúc</label>
                            <input
                                type="date"
                                className="input"
                                value={form.endDate}
                                onChange={e => setForm({ ...form, endDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Trạng thái</label>
                            <select
                                className="input"
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Members Section */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Thành viên</h3>
                        <p className="text-sm text-gray-500">Quản lý thành viên trong dự án</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="Email thành viên..."
                            className="input w-64 text-sm"
                            value={memberEmail}
                            onChange={e => { setMemberEmail(e.target.value); setSearchError('') }}
                            onKeyDown={e => e.key === 'Enter' && handleSearchMember()}
                        />
                        <button onClick={handleSearchMember} disabled={addMemberMutation.isPending} className="btn-primary">
                            Thêm
                        </button>
                    </div>
                </div>
                {searchError && <div className="px-6 pt-2 text-sm text-red-500">{searchError}</div>}

                <div className="p-6">
                    <div className="space-y-2">
                        {members.map(member => (
                            <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                        {member.fullName?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{member.fullName}</div>
                                        <div className="text-xs text-gray-500">{member.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`badge ${member.role === 'OWNER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {member.role}
                                    </span>
                                    {member.role !== 'OWNER' && (
                                        <button
                                            onClick={() => removeMemberMutation.mutate(member.userId)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded"
                                            title="Xóa thành viên"
                                        >
                                            <i className="fa-solid fa-trash" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {members.length === 0 && <p className="text-center text-gray-400">Chưa có thành viên</p>}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
                <div className="p-6 border-b border-red-100">
                    <h3 className="text-lg font-bold text-red-700">Danger Zone</h3>
                </div>
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <p className="font-medium text-red-900">Xóa dự án</p>
                        <p className="text-sm text-red-600">Hành động này sẽ xóa vĩnh viễn dự án và tất cả dữ liệu liên quan. Không thể hoàn tác.</p>
                    </div>
                    <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                        Xóa dự án
                    </button>
                </div>
            </div>
        </div>
    );
}
