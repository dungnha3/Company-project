import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';

export default function AdminCompaniesPage() {
    const { data: companies = [], isLoading, error } = useQuery({
        queryKey: ['admin-companies'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ADMIN.COMPANIES);
            return res.data;
        },
    });

    // Compute real stats from data
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(c => c.isActive).length;
    const suspendedCompanies = totalCompanies - activeCompanies;

    if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Lỗi không thể tải dữ liệu: {error.message}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Công ty (Tenant)</h1>
                    <p className="text-gray-500 mt-1">Danh sách các công ty đang sử dụng hệ thống</p>
                </div>
                {/* <button className="btn-primary">
                    <i className="fa-solid fa-plus mr-2" />
                    Thêm công ty mới
                </button> */}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <i className="fa-solid fa-building text-xl" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Tổng số Công ty</p>
                        <h3 className="text-2xl font-bold text-gray-900">{totalCompanies}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                        <i className="fa-solid fa-check-circle text-xl" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Đang hoạt động</p>
                        <h3 className="text-2xl font-bold text-gray-900">{activeCompanies}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                        <i className="fa-solid fa-ban text-xl" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Đang tạm ngưng</p>
                        <h3 className="text-2xl font-bold text-gray-900">{suspendedCompanies}</h3>
                    </div>
                </div>
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Địa chỉ</th>
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
                                                {/* <p className="text-xs text-gray-500">ID: {company.companyId}</p> */}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-gray-200 text-xs font-medium bg-gray-50 text-gray-800">
                                            {company.plan || 'FREE'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${company.isActive
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {company.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {company.address || 'Chưa cập nhật'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-indigo-600 transition-colors mr-3" title="Chỉnh sửa">
                                            <i className="fa-solid fa-pen-to-square" />
                                        </button>
                                        <button className="text-gray-400 hover:text-red-600 transition-colors" title="Xóa">
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
        </div>
    );
}
