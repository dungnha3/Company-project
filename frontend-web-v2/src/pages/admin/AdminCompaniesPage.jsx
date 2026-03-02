import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import DataTable from '@shared/components/ui/DataTable';

const PLANS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

export default function AdminCompaniesPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [newPlan, setNewPlan] = useState('');

    // Filters
    const [keyword, setKeyword] = useState('');
    const [filterPlan, setFilterPlan] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const { data: companies = [], isLoading } = useQuery({
        queryKey: ['admin-companies'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.SYSADMIN.COMPANIES);
            // BE returns Page<CompanyResponse> with .content array
            return Array.isArray(res.data) ? res.data : (res.data.content || []);
        },
    });

    // Mutations
    const toggleStatusMutation = useMutation({
        mutationFn: (companyId) => apiClient.put(ENDPOINTS.SYSADMIN.COMPANY_STATUS(companyId)),
        onSuccess: (res) => {
            queryClient.invalidateQueries(['admin-companies']);
            showToast(res.data.message || 'Đã cập nhật trạng thái', 'success');
        },
        onError: (err) => showToast(err.response?.data?.message || err.message, 'error'),
    });

    const changePlanMutation = useMutation({
        mutationFn: ({ companyId, plan }) => apiClient.put(`${ENDPOINTS.SYSADMIN.COMPANY_PLAN(companyId)}?plan=${plan}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-companies']);
            showToast('Đã thay đổi gói dịch vụ', 'success');
            setShowPlanModal(false);
        },
        onError: (err) => showToast(err.response?.data?.message || err.message, 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (companyId) => apiClient.delete(ENDPOINTS.SYSADMIN.COMPANY_DELETE(companyId)),
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-companies']);
            showToast('Đã xóa workspace', 'success');
            setShowDeleteModal(false);
        },
        onError: (err) => showToast(err.response?.data?.message || err.message, 'error'),
    });

    // Filtered data
    const filteredCompanies = useMemo(() => {
        return companies.filter(c => {
            const matchSearch = c.name?.toLowerCase().includes(keyword.toLowerCase()) ||
                c.ownerName?.toLowerCase().includes(keyword.toLowerCase());
            const matchPlan = filterPlan === 'ALL' || c.plan === filterPlan;
            const matchStatus = filterStatus === 'ALL' ||
                (filterStatus === 'ACTIVE' ? c.isActive : !c.isActive);
            return matchSearch && matchPlan && matchStatus;
        });
    }, [companies, keyword, filterPlan, filterStatus]);

    // Stats
    const stats = {
        total: companies.length,
        active: companies.filter(c => c.isActive).length,
        suspended: companies.filter(c => !c.isActive).length,
    };

    // Table columns
    const columns = [
        {
            header: 'Workspace',
            accessorKey: 'name',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 uppercase">
                        {row.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{row.name}</div>
                        <div className="text-xs text-gray-500">ID: {row.companyId}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Gói dịch vụ',
            accessorKey: 'plan',
            cell: (row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); setSelectedCompany(row); setNewPlan(row.plan || 'FREE'); setShowPlanModal(true); }}
                    className={`badge cursor-pointer hover:opacity-80 ${getPlanBadgeClass(row.plan)}`}
                >
                    <i className="fa-solid fa-crown mr-1" />
                    {row.plan || 'FREE'}
                </button>
            )
        },
        {
            header: 'Trạng thái',
            accessorKey: 'isActive',
            cell: (row) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`${row.isActive ? 'Tạm dừng' : 'Kích hoạt'} workspace "${row.name}"?`)) {
                            toggleStatusMutation.mutate(row.companyId);
                        }
                    }}
                    className={row.isActive ? 'badge-success cursor-pointer' : 'badge-danger cursor-pointer'}
                >
                    <i className={`fa-solid ${row.isActive ? 'fa-check' : 'fa-ban'} mr-1`} />
                    {row.isActive ? 'Hoạt động' : 'Tạm dừng'}
                </button>
            )
        },
        {
            header: 'Chủ sở hữu',
            accessorKey: 'ownerName',
            cell: (row) => <span className="text-gray-600 dark:text-gray-400">{row.ownerName || '---'}</span>
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <Link
                        to={`/admin/companies/${row.companyId}`}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-all"
                        title="Quản lý"
                    >
                        <i className="fa-solid fa-cog" />
                    </Link>
                    <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCompany(row); setShowDeleteModal(true); }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Xóa"
                    >
                        <i className="fa-solid fa-trash" />
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
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Workspace</h1>
                    <p className="text-gray-500 text-sm">Quản lý tất cả các tenant trong hệ thống</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <i className="fa-solid fa-building text-indigo-600 text-xl" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tổng workspace</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <i className="fa-solid fa-check-circle text-green-600 text-xl" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Đang hoạt động</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                            <i className="fa-solid fa-ban text-red-600 text-xl" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tạm dừng</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Status Tabs */}
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
                        <select
                            className="input w-full md:w-48"
                            value={filterPlan}
                            onChange={(e) => setFilterPlan(e.target.value)}
                        >
                            <option value="ALL">Tất cả gói</option>
                            {PLANS.map(plan => (
                                <option key={plan} value={plan}>{plan}</option>
                            ))}
                        </select>

                        <div className="relative w-full md:w-64">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="input pl-10"
                                placeholder="Tìm workspace..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <DataTable
                loading={isLoading}
                columns={columns}
                data={filteredCompanies}
                totalCount={filteredCompanies.length}
            />

            {/* Change Plan Modal */}
            {showPlanModal && selectedCompany && (
                <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-lg font-semibold">Thay đổi gói dịch vụ</h3>
                            <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-times" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="text-gray-600 mb-4">Workspace: <strong>{selectedCompany.name}</strong></p>
                            <div className="grid grid-cols-2 gap-3">
                                {PLANS.map(plan => (
                                    <button
                                        key={plan}
                                        onClick={() => setNewPlan(plan)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${newPlan === plan
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <i className={`fa-solid fa-crown ${newPlan === plan ? 'text-indigo-500' : 'text-gray-400'}`} />
                                            <span className={`font-semibold ${newPlan === plan ? 'text-indigo-700' : 'text-gray-700'}`}>{plan}</span>
                                        </div>
                                        {plan === selectedCompany.plan && (
                                            <span className="text-xs text-gray-500 mt-1 block">Gói hiện tại</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowPlanModal(false)} className="btn-secondary">Hủy</button>
                            <button
                                onClick={() => changePlanMutation.mutate({ companyId: selectedCompany.companyId, plan: newPlan })}
                                disabled={changePlanMutation.isPending || newPlan === selectedCompany.plan}
                                className="btn-primary"
                            >
                                {changePlanMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedCompany && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="modal-header bg-red-50">
                            <h3 className="text-lg font-semibold text-red-700">
                                <i className="fa-solid fa-triangle-exclamation mr-2" />
                                Xóa workspace
                            </h3>
                            <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-times" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="text-gray-600 mb-4">
                                Bạn có chắc muốn xóa <strong>{selectedCompany.name}</strong>?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                                <p className="font-semibold mb-2">Hành động này không thể hoàn tác!</p>
                                <ul className="list-disc list-inside text-red-600 space-y-1">
                                    <li>Tất cả nhân viên và người dùng</li>
                                    <li>Tất cả dự án và công việc</li>
                                    <li>Tất cả tin nhắn và tệp tin</li>
                                </ul>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">Hủy</button>
                            <button
                                onClick={() => deleteMutation.mutate(selectedCompany.companyId)}
                                disabled={deleteMutation.isPending}
                                className="btn-danger"
                            >
                                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getPlanBadgeClass(plan) {
    const classes = {
        FREE: 'bg-gray-100 text-gray-700',
        STARTER: 'bg-indigo-100 text-indigo-700',
        PROFESSIONAL: 'bg-purple-100 text-purple-700',
        ENTERPRISE: 'bg-amber-100 text-amber-700',
    };
    return classes[plan] || classes.FREE;
}
