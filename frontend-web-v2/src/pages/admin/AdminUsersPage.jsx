import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { useToast } from '@app/providers/ToastProvider';

export default function AdminUsersPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Fetch users
    const { data: users = [], isLoading, error } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const res = await apiClient.get('/api/users');
            return res.data;
        },
    });

    // Toggle user active status
    const toggleUserMutation = useMutation({
        mutationFn: async (userId) => {
            return apiClient.put(`/api/users/${userId}/toggle-status`);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries(['admin-users']);
            toast.success(res.data?.message || 'Cập nhật trạng thái thành công');
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    // Force reset password
    const resetPasswordMutation = useMutation({
        mutationFn: async (userId) => {
            return apiClient.post(`/api/users/${userId}/reset-password`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-users']);
            toast.success('Đã gửi email reset password');
            setShowResetModal(false);
            setSelectedUser(null);
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    // Stats
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const systemAdmins = users.filter(u => u.isSystemAdmin).length;

    const handleToggleUser = (user) => {
        if (!confirm(`Bạn có chắc muốn ${user.isActive !== false ? 'vô hiệu hóa' : 'kích hoạt'} user "${user.username}"?`)) return;
        toggleUserMutation.mutate(user.userId);
    };

    const handleResetPassword = (user) => {
        setSelectedUser(user);
        setShowResetModal(true);
    };

    const confirmResetPassword = () => {
        if (!selectedUser) return;
        resetPasswordMutation.mutate(selectedUser.userId);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải danh sách user...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error.message}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý User</h1>
                    <p className="text-gray-500 mt-1">Danh sách tất cả users trong hệ thống (metadata only)</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <i className="fa-solid fa-users text-xl" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tổng Users</p>
                        <h3 className="text-2xl font-bold text-gray-900">{totalUsers}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                        <i className="fa-solid fa-user-check text-xl" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Active</p>
                        <h3 className="text-2xl font-bold text-gray-900">{activeUsers}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                        <i className="fa-solid fa-user-shield text-xl" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">System Admins</p>
                        <h3 className="text-2xl font-bold text-gray-900">{systemAdmins}</h3>
                    </div>
                </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <i className="fa-solid fa-shield-halved text-blue-500 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-blue-800">Chính sách bảo mật</p>
                    <p className="text-xs text-blue-600 mt-1">
                        System Admin chỉ xem được metadata (email, trạng thái). Không thể truy cập dữ liệu riêng tư của user như chat, files, salary.
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vai trò</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.userId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {user.username?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                                                <p className="text-xs text-gray-400">ID: {user.userId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.isSystemAdmin ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                <i className="fa-solid fa-crown mr-1" />
                                                System Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                User
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive !== false
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.isActive !== false ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            {!user.isSystemAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleUser(user)}
                                                        disabled={toggleUserMutation.isPending}
                                                        className={`p-2 rounded-lg transition-colors ${user.isActive !== false
                                                            ? 'text-orange-500 hover:bg-orange-50'
                                                            : 'text-green-500 hover:bg-green-50'
                                                            }`}
                                                        title={user.isActive !== false ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                    >
                                                        <i className={`fa-solid ${user.isActive !== false ? 'fa-user-slash' : 'fa-user-check'}`} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetPassword(user)}
                                                        className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                                                        title="Reset mật khẩu"
                                                    >
                                                        <i className="fa-solid fa-key" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reset Password Modal */}
            {showResetModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                            <h2 className="text-xl font-bold">Reset mật khẩu</h2>
                            <p className="text-blue-100 text-sm mt-1">{selectedUser.username}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600">
                                Hệ thống sẽ gửi email chứa link reset mật khẩu đến <strong>{selectedUser.email}</strong>.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={confirmResetPassword}
                                    disabled={resetPasswordMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {resetPasswordMutation.isPending ? 'Đang gửi...' : 'Gửi email'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
