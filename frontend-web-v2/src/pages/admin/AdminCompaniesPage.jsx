import { useState, useEffect } from 'react';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function AdminCompaniesPage() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
    const [search, setSearch] = useState('');
    const toast = useToast();

    const fetchCompanies = async (page = 0) => {
        setLoading(true);
        try {
            const response = await apiClient.get(ENDPOINTS.SYSADMIN.COMPANIES, {
                params: { page, size: pagination.size }
            });
            setCompanies(response.data.content || []);
            setPagination({
                page: response.data.number || 0,
                size: response.data.size || 20,
                totalPages: response.data.totalPages || 0,
                totalElements: response.data.totalElements || 0,
            });
        } catch (error) {
            console.error('Failed to fetch companies:', error);
            toast.error('Không thể tải danh sách Workspace');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleToggleStatus = async (companyId, currentStatus) => {
        try {
            await apiClient.put(ENDPOINTS.SYSADMIN.COMPANY_STATUS(companyId));
            setCompanies(companies.map(c => 
                c.companyId === companyId ? { ...c, isActive: !currentStatus } : c
            ));
            toast.success(!currentStatus ? 'Đã kích hoạt Workspace' : 'Đã tạm ngưng Workspace');
        } catch (error) {
            toast.error('Không thể thay đổi trạng thái');
        }
    };

    const handleDelete = async (companyId) => {
        if (!window.confirm('Bạn có chắc muốn xóa Workspace này? Hành động này không thể hoàn tác.')) return;
        try {
            await apiClient.delete(ENDPOINTS.SYSADMIN.COMPANY_DELETE(companyId));
            setCompanies(companies.filter(c => c.companyId !== companyId));
            toast.success('Đã xóa Workspace');
        } catch (error) {
            toast.error('Không thể xóa Workspace');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Workspace</h1>
                    <p className="text-gray-500 mt-1">Tổng cộng {pagination.totalElements} Workspace</p>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <div className="relative max-w-md">
                    <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm Workspace..."
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Workspace</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Địa chỉ</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="loading-spinner mx-auto" />
                                    </td>
                                </tr>
                            ) : companies.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        Chưa có Workspace nào
                                    </td>
                                </tr>
                            ) : (
                                companies.map((company) => (
                                    <tr key={company.companyId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {company.name?.charAt(0)?.toUpperCase() || 'W'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{company.name}</p>
                                                    <p className="text-sm text-gray-500">ID: {company.companyId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {company.address || 'Chưa cập nhật'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                company.isActive 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                    company.isActive ? 'bg-green-500' : 'bg-red-500'
                                                }`} />
                                                {company.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(company.companyId, company.isActive)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                        company.isActive
                                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                                >
                                                    <i className={`fa-solid ${company.isActive ? 'fa-pause' : 'fa-play'} mr-1`} />
                                                    {company.isActive ? 'Tạm ngưng' : 'Kích hoạt'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(company.companyId)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                                >
                                                    <i className="fa-solid fa-trash mr-1" />
                                                    Xóa
                                                </button>
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
                                onClick={() => fetchCompanies(pagination.page - 1)}
                                disabled={pagination.page === 0}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i className="fa-solid fa-chevron-left mr-1" />
                                Trước
                            </button>
                            <button
                                onClick={() => fetchCompanies(pagination.page + 1)}
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
