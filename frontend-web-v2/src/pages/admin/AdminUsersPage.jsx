import { useState, useEffect } from 'react';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
    const [search, setSearch] = useState('');
    const toast = useToast();

    const fetchUsers = async (page = 0, keyword = '') => {
        setLoading(true);
        try {
            const response = await apiClient.get(ENDPOINTS.SYSADMIN.USERS, {
                params: { page, size: pagination.size, keyword }
            });
            setUsers(response.data.content || []);
            setPagination({
                page: response.data.number || 0,
                size: response.data.size || 20,
                totalPages: response.data.totalPages || 0,
                totalElements: response.data.totalElements || 0,
            });
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(0, search);
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        try {
            await apiClient.put(`/api/sysadmin/users/${userId}/toggle-status`);
            setUsers(users.map(u => 
                u.userId === userId ? { ...u, isActive: !currentStatus } : u
            ));
            toast.success(!currentStatus ? 'Đã kích hoạt tài khoản' : 'Đã tạm ngưng tài khoản');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể thay đổi trạng thái');
        }
    };

    const handleResetPassword = async (userId) => {
        if (!window.confirm('Bạn có chắc muốn reset mật khẩu cho người dùng này?')) return;
        try {
            await apiClient.post(`/api/sysadmin/users/${userId}/reset-password`);
            toast.success('Đã gửi mật khẩu mới qua email');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể reset mật khẩu');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa có';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài khoản</h1>
                    <p className="text-gray-500 mt-1">Tổng cộng {pagination.totalElements} người dùng</p>
                </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-4">
                <div className="relative max-w-md">
                    <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, email..."
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                        Tìm
                    </button>
                </div>
            </form>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người dùng</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Vai trò</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đăng nhập cuối</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="loading-spinner mx-auto" />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Chưa có người dùng nào
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.userId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                                                    {user.username?.charAt(0)?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{user.username}</p>
                                                    <p className="text-sm text-gray-500">ID: {user.userId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.isSystemAdminAccount ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                    <i className="fa-solid fa-crown mr-1" />
                                                    System Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    User
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                user.isActive 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                    user.isActive ? 'bg-green-500' : 'bg-red-500'
                                                }`} />
                                                {user.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {formatDate(user.lastLoginAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {!user.isSystemAdminAccount && (
                                                    <>
                                                        <button
                                                            onClick={() => handleToggleStatus(user.userId, user.isActive)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                                user.isActive
                                                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            }`}
                                                        >
                                                            <i className={`fa-solid ${user.isActive ? 'fa-pause' : 'fa-play'} mr-1`} />
                                                            {user.isActive ? 'Tạm ngưng' : 'Kích hoạt'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleResetPassword(user.userId)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                                        >
                                                            <i className="fa-solid fa-key mr-1" />
                                                            Reset MK
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Trang {pagination.page + 1} / {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchUsers(pagination.page - 1, search)}
                                disabled={pagination.page === 0}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i className="fa-solid fa-chevron-left mr-1" />
                                Trước
                            </button>
                            <button
                                onClick={() => fetchUsers(pagination.page + 1, search)}
                                disabled={pagination.page >= pagination.totalPages - 1}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau
                                <i className="fa-solid fa-chevron-right ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
