import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export default function AdminUsersPage() {
    // Using mock data for now as we haven't confirmed the exact Admin User Management endpoint
    const { data: users = [], isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            // return (await apiClient.get(ENDPOINTS.ADMIN.USERS)).data;
            return [
                { id: 1, username: 'admin', email: 'admin@example.com', role: 'Owner', company: 'QLNV Demo', status: 'Active', lastLogin: '2024-03-20 10:30' },
                { id: 2, username: 'hr', email: 'hr@example.com', role: 'HR Manager', company: 'QLNV Demo', status: 'Active', lastLogin: '2024-03-19 15:45' },
                { id: 3, username: 'sysadmin', email: 'sys@System.com', role: 'System Admin', company: '-', status: 'Active', lastLogin: 'Now' },
            ];
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Người dùng (Global)</h1>
                    <p className="text-gray-500 mt-1">Danh sách toàn bộ users trong hệ thống SaaS</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">Export CSV</button>
                    <button className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" />
                        Tạo User
                    </button>
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Công ty</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.role === 'System Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-700'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {user.company}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'Active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {user.lastLogin}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-indigo-600 transition-colors mr-3">
                                            <i className="fa-solid fa-pen" />
                                        </button>
                                        <button className="text-gray-400 hover:text-red-600 transition-colors">
                                            <i className="fa-solid fa-ban" />
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
