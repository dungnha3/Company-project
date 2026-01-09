import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

const PLANS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

export default function AdminCompaniesPage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [newPlan, setNewPlan] = useState('');

    const { data: companies = [], isLoading, error } = useQuery({
        queryKey: ['admin-companies'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ADMIN.COMPANIES);
            return res.data;
        },
    });

    // Toggle status mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async (companyId) => {
            return apiClient.put(`/api/companies/admin/${companyId}/status`);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries(['admin-companies']);
            toast.success(res.data.message);
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    // Change plan mutation
    const changePlanMutation = useMutation({
        mutationFn: async ({ companyId, plan }) => {
            return apiClient.put(`/api/companies/admin/${companyId}/plan?plan=${plan}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-companies']);
            toast.success('Đổi plan thành công!');
            setShowPlanModal(false);
            setSelectedCompany(null);
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    // Delete company mutation
    const deleteMutation = useMutation({
        mutationFn: async (companyId) => {
            return apiClient.delete(`/api/companies/admin/${companyId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-companies']);
            toast.success('Đã xóa công ty thành công');
            setShowDeleteModal(false);
            setSelectedCompany(null);
        },
        onError: (err) => {
            toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
        },
    });

    // Stats
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(c => c.isActive).length;
    const suspendedCompanies = totalCompanies - activeCompanies;
    const planStats = PLANS.reduce((acc, plan) => {
        acc[plan] = companies.filter(c => c.plan === plan).length;
        return acc;
    }, {});

    const handleToggleStatus = (company) => {
        if (!confirm(`Bạn có chắc muốn ${company.isActive ? 'tạm ngưng' : 'kích hoạt'} công ty "${company.name}"?`)) return;
        toggleStatusMutation.mutate(company.companyId);
    };

    const handleChangePlan = (company) => {
        setSelectedCompany(company);
        setNewPlan(company.plan || 'FREE');
        setShowPlanModal(true);
    };

    const handleDelete = (company) => {
        setSelectedCompany(company);
        setShowDeleteModal(true);
    };

    const confirmChangePlan = () => {
        if (!selectedCompany) return;
        changePlanMutation.mutate({ companyId: selectedCompany.companyId, plan: newPlan });
    };

    const confirmDelete = () => {
        if (!selectedCompany) return;
        deleteMutation.mutate(selectedCompany.companyId);
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi không thể tải dữ liệu: {error.message}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Công ty (Tenant)</h1>
                    <p className="text-gray-500 mt-1">Danh sách các công ty đang sử dụng hệ thống</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Tổng</p>
                    <h3 className="text-2xl font-bold text-gray-900">{totalCompanies}</h3>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-green-200 bg-green-50">
                    <p className="text-xs text-green-600 font-medium">Active</p>
                    <h3 className="text-2xl font-bold text-green-700">{activeCompanies}</h3>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border border-orange-200 bg-orange-50">
                    <p className="text-xs text-orange-600 font-medium">Suspended</p>
                    <h3 className="text-2xl font-bold text-orange-700">{suspendedCompanies}</h3>
                </div>
                {PLANS.map(plan => (
                    <div key={plan} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">{plan}</p>
                        <h3 className="text-2xl font-bold text-indigo-600">{planStats[plan]}</h3>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Công ty</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gói (Plan)</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {companies.map((company) => (
                                <tr key={company.companyId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                                                {company.logoUrl ? (
                                                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    company.name?.charAt(0) || 'C'
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{company.name}</p>
                                                <p className="text-xs text-gray-400">ID: {company.companyId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleChangePlan(company)}
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors cursor-pointer"
                                        >
                                            {company.plan || 'FREE'}
                                            <i className="fa-solid fa-pen-to-square ml-1.5 text-[10px]" />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleStatus(company)}
                                            disabled={toggleStatusMutation.isPending}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${company.isActive
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                }`}
                                        >
                                            <i className={`fa-solid ${company.isActive ? 'fa-check-circle' : 'fa-ban'} mr-1`} />
                                            {company.isActive ? 'Active' : 'Suspended'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {company.ownerName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(company)}
                                            className="text-gray-400 hover:text-red-600 transition-colors p-2"
                                            title="Xóa công ty"
                                        >
                                            <i className="fa-solid fa-trash" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {companies.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        Chưa có công ty nào trong hệ thống
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Change Plan Modal */}
            {showPlanModal && selectedCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                            <h2 className="text-xl font-bold">Đổi Plan</h2>
                            <p className="text-indigo-100 text-sm mt-1">{selectedCompany.name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Plan mới</label>
                                <select
                                    value={newPlan}
                                    onChange={(e) => setNewPlan(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    {PLANS.map(plan => (
                                        <option key={plan} value={plan}>{plan}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowPlanModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={confirmChangePlan}
                                    disabled={changePlanMutation.isPending}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {changePlanMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                            <h2 className="text-xl font-bold">⚠️ Xóa công ty</h2>
                            <p className="text-red-100 text-sm mt-1">Hành động này không thể hoàn tác!</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600">
                                Bạn có chắc muốn xóa công ty <strong>{selectedCompany.name}</strong>?
                            </p>
                            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                <i className="fa-solid fa-exclamation-triangle mr-2" />
                                Tất cả dữ liệu của công ty sẽ bị xóa vĩnh viễn: nhân viên, dự án, chat, files...
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleteMutation.isPending}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
