import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import DataTable from '@shared/components/ui/DataTable';

export default function AdminUsersPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [page, setPage] = useState(0);
    const [pageSize] = useState(20);

    // Debounce keyword search
    const handleKeywordChange = (value) => {
        setKeyword(value);
        // Simple debounce
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            setDebouncedKeyword(value);
            setPage(0);
        }, 300);
    };

    const { data: pagedData, isLoading } = useQuery({
        queryKey: ['admin-users', page, pageSize, debouncedKeyword],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                size: pageSize.toString(),
            });
            if (debouncedKeyword) params.append('keyword', debouncedKeyword);

            const res = await apiClient.get(`${ENDPOINTS.SYSADMIN.USERS}?${params}`);
            return res.data;
        },
        keepPreviousData: true,
    });

    const users = pagedData?.content || [];
    const totalPages = pagedData?.totalPages || 0;
    const totalElements = pagedData?.totalElements || 0;

    const toggleStatusMutation = useMutation({
        mutationFn: (userId) => apiClient.put(`${ENDPOINTS.SYSADMIN.USERS}/${userId}/toggle-status`),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-users']);
            showToast('Đã cập nhật trạng thái', 'success');
        },
        onError: (err) => showToast(err.message, 'error'),
    });

    const resetPasswordMutation = useMutation({
        mutationFn: (userId) => apiClient.post(`${ENDPOINTS.SYSADMIN.USERS}/${userId}/reset-password`),
        onSuccess: (res) => showToast(res.data.message || 'Đã gửi email reset password', 'success'),
        onError: (err) => showToast(err.message, 'error'),
    });

    // Client-side filter for status (server handles keyword)
    const filteredUsers = filterStatus === 'ALL'
        ? users
        : users.filter(u => filterStatus === 'ACTIVE' ? u.isActive : !u.isActive);

    // Stats from current page (or use totalElements for total)
    const stats = {
        total: totalElements,
        active: users.filter(u => u.isActive).length,
        sysadmins: users.filter(u => u.isSystemAdminAccount).length,
    };

    // Table columns
    const columns = [
        {
            header: 'Người dùng',
            accessorKey: 'username',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold border border-purple-100 uppercase">
                        {row.username?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {row.username}
                            {row.isSystemAdminAccount && (
                                <span className="badge bg-purple-100 text-purple-700 text-xs">SYSADMIN</span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Công ty',
            accessorKey: 'companyName',
            cell: (row) => <span className="text-gray-600">{row.companyName || '---'}</span>
        },
        {
            header: 'Vai trò',
            accessorKey: 'roles',
            cell: (row) => (
                <div className="flex gap-1 flex-wrap max-w-[200px]">
                    {(row.roles || []).slice(0, 3).map((role) => (
                        <span key={role} className="badge bg-gray-100 text-gray-600">{role.replace('ROLE_', '')}</span>
                    ))}
                    {(row.roles || []).length > 3 && (
                        <span className="badge bg-gray-100 text-gray-400">+{row.roles.length - 3}</span>
                    )}
                </div>
            )
        },
        {
            header: 'Trạng thái',
            accessorKey: 'isActive',
            cell: (row) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!row.isSystemAdminAccount) {
                            toggleStatusMutation.mutate(row.userId);
                        }
                    }}
                    disabled={row.isSystemAdminAccount}
                    className={`${row.isActive ? 'badge-success' : 'badge-danger'} ${row.isSystemAdminAccount ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                    <i className={`fa-solid ${row.isActive ? 'fa-check' : 'fa-ban'} mr-1`} />
                    {row.isActive ? 'Hoạt động' : 'Tạm dừng'}
                </button>
            )
        },
        {
            header: 'Lần đăng nhập cuối',
            accessorKey: 'lastLoginAt',
            cell: (row) => (
                <span className="text-gray-500 text-sm">
                    {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString('vi-VN') : 'Chưa đăng nhập'}
                </span>
            )
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Gửi email reset password cho ${row.email}?`)) {
                                resetPasswordMutation.mutate(row.userId);
                            }
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Reset Password"
                    >
                        <i className="fa-solid fa-key" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
                    <p className="text-gray-500 text-sm">Quản lý tất cả người dùng trong hệ thống</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <i className="fa-solid fa-users text-indigo-600 text-xl" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tổng người dùng</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <i className="fa-solid fa-user-check text-green-600 text-xl" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Đang hoạt động</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            <i className="fa-solid fa-user-shield text-purple-600 text-xl" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">System Admins</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.sysadmins}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {[
                            { value: 'ALL', label: 'Tất cả' },
                            { value: 'ACTIVE', label: 'Hoạt động' },
                            { value: 'SUSPENDED', label: 'Tạm dừng' },
                        ].map(s => (
                            <button
                                key={s.value}
                                onClick={() => setFilterStatus(s.value)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filterStatus === s.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="input pl-10"
                                placeholder="Tìm tên, email..."
                                value={keyword}
                                onChange={(e) => handleKeywordChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <DataTable
                loading={isLoading}
                columns={columns}
                data={filteredUsers}
                totalCount={totalElements}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border rounded-lg">
                    <div className="text-sm text-gray-500">
                        Trang {page + 1} / {totalPages} ({totalElements} người dùng)
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                        >
                            <i className="fa-solid fa-chevron-left mr-1" />
                            Trước
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                        >
                            Sau
                            <i className="fa-solid fa-chevron-right ml-1" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

