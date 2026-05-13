import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Đang hoạt động' },
    { value: 'PLANNING', label: 'Lập kế hoạch' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'ON_HOLD', label: 'Tạm dừng' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

export default function CreateProjectModal({ isOpen, onClose, onSuccess }) {
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
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchError, setSearchError] = useState('');
    const toast = useToast();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await apiClient.post(ENDPOINTS.PROJECTS.LIST, data);
            return res.data;
        },
        onSuccess: async (project) => {
            // Add selected members
            for (const member of selectedMembers) {
                try {
                    await apiClient.post(ENDPOINTS.PROJECTS.ADD_MEMBER(project.projectId), {
                        userId: member.userId,
                        role: member.role,
                    });
                } catch (e) {
                    // Skip if already exists
                }
            }

            toast.success('Tạo dự án thành công!');
            queryClient.invalidateQueries(['projects']);
            onSuccess?.(project);
            handleClose();
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));

        // Auto-generate key from name
        if (name === 'name' && !form.keyProject) {
            const key = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
            setForm(prev => ({ ...prev, keyProject: key }));
        }
    };

    const handleSearchMember = async () => {
        if (!memberEmail.trim()) return;
        setSearchError('');

        try {
            const res = await apiClient.get(ENDPOINTS.USERS.SEARCH, { params: { query: memberEmail } });
            const users = res.data;
            const user = users.find(u => u.email?.toLowerCase() === memberEmail.toLowerCase());

            if (user) {
                if (selectedMembers.find(m => m.userId === user.userId)) {
                    setSearchError('Thành viên này đã được thêm');
                } else {
                    setSelectedMembers(prev => [...prev, {
                        userId: user.userId,
                        username: user.username || user.fullName,
                        email: user.email,
                        role: 'MEMBER',
                    }]);
                    setMemberEmail('');
                }
            } else {
                setSearchError('Không tìm thấy user với email này');
            }
        } catch (err) {
            setSearchError('Lỗi tìm kiếm: ' + err.message);
        }
    };

    const removeMember = (userId) => {
        setSelectedMembers(prev => prev.filter(m => m.userId !== userId));
    };

    const updateMemberRole = (userId, role) => {
        setSelectedMembers(prev => prev.map(m =>
            m.userId === userId ? { ...m, role } : m
        ));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name || !form.keyProject) {
            toast.error('Vui lòng điền tên và mã dự án');
            return;
        }
        // Clean payload: convert empty strings to null for date fields
        const payload = {
            name: form.name,
            keyProject: form.keyProject,
            description: form.description || null,
            startDate: form.startDate || null,
            endDate: form.endDate || null,
            budget: form.budget ? parseFloat(form.budget) : null,
        };
        createMutation.mutate(payload);
    };

    const handleClose = () => {
        setForm({
            name: '',
            keyProject: '',
            description: '',
            startDate: '',
            endDate: '',
            status: 'PLANNING',
            budget: '',
        });
        setMemberEmail('');
        setSelectedMembers([]);
        setSearchError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">Tạo Dự Án Mới</h2>
                        <p className="text-indigo-100 text-sm">Điền thông tin để bắt đầu dự án</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center"
                    >
                        <i className="fa-solid fa-times" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="p-6 space-y-6">
                        {/* Project Info Section */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-folder text-indigo-500" />
                                Thông tin dự án
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tên dự án <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                                        placeholder="VD: Website Redesign"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mã dự án <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="keyProject"
                                        value={form.keyProject}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                                        placeholder="VD: WEB01"
                                        maxLength={10}
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Mã ngắn gọn cho issue (VD: WEB01-123)</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    placeholder="Mô tả ngắn về dự án..."
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={form.startDate}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={form.endDate}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách (VND)</label>
                                    <input
                                        type="number"
                                        name="budget"
                                        value={form.budget}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                                    >
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Members Section */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <i className="fa-solid fa-users text-purple-500" />
                                Thêm thành viên
                            </h3>

                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-700">
                                <i className="fa-solid fa-info-circle mr-2" />
                                Bạn sẽ tự động là <strong>Chủ dự án</strong> với đầy đủ quyền.
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={memberEmail}
                                        onChange={(e) => { setMemberEmail(e.target.value); setSearchError(''); }}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchMember())}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-800 dark:text-gray-100 dark:border-gray-600"
                                        placeholder="Nhập email thành viên"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSearchMember}
                                    className="btn-primary"
                                >
                                    <i className="fa-solid fa-plus mr-2" />
                                    Thêm
                                </button>
                            </div>
                            {searchError && (
                                <p className="text-sm text-red-500">{searchError}</p>
                            )}

                            {/* Selected Members */}
                            {selectedMembers.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500">Thành viên đã chọn ({selectedMembers.length})</p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {selectedMembers.map(member => (
                                            <div
                                                key={member.userId}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                                        {member.username?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 text-sm">{member.username}</div>
                                                        <div className="text-xs text-gray-500">{member.email}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => updateMemberRole(member.userId, e.target.value)}
                                                        className="text-sm px-2 py-1 border border-gray-200 rounded-md"
                                                    >
                                                        <option value="MEMBER">Thành viên</option>
                                                        <option value="MANAGER">Quản lý</option>
                                                        <option value="VIEWER">Người xem</option>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMember(member.userId)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    >
                                                        <i className="fa-solid fa-trash text-sm" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={createMutation.isPending}
                            className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-plus" />
                                    Tạo dự án
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
