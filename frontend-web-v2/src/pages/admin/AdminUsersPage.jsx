import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import useAuthStore from '@shared/stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function AdminUsersPage() {
    const { login } = useAuthStore();
    const navigate = useNavigate();
    const [isImpersonating, setIsImpersonating] = useState(false);

    // Fetch real users data
    const { data: users = [], isLoading, error } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const res = await apiClient.get('/api/users'); // Use standard users endpoint which supports System Admin
            return res.data;
        },
    });

    const handleImpersonate = async (userId, username) => {
        if (!window.confirm(`Bạn có chắc muốn đăng nhập dưới danh nghĩa user: ${username}?`)) return;

        try {
            setIsImpersonating(true);
            const res = await apiClient.post(ENDPOINTS.AUTH.IMPERSONATE(userId));
            const authData = res.data;

            // Login as the target user
            login(authData);

            // Force reload to clear all states and redirect to user dashboard
            window.location.href = '/';
        } catch (err) {
            alert('Lỗi: ' + (err.response?.data?.message || err.message));
            setIsImpersonating(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải danh sách user...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error.message}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý User Global</h1>
                    <p className="text-gray-500 mt-1">Danh sách {users.length} users trong hệ thống SaaS</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">Export CSV</button>
                    {/* <button className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" />
                        Tạo User
                    </button> */}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vai trò</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.userId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {user.username?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                                                <p className="text-xs text-gray-500">ID: {user.userId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {user.isSystemAdmin ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                System Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                User
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        {!user.isSystemAdmin && (
                                            <button
                                                onClick={() => handleImpersonate(user.userId, user.username)}
                                                disabled={isImpersonating}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                                                title="Đăng nhập dưới danh nghĩa user này"
                                            >
                                                <i className="fa-solid fa-user-secret mr-1" />
                                                Login As
                                            </button>
                                        )}
                                        <button className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                                            <i className="fa-solid fa-pen" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
