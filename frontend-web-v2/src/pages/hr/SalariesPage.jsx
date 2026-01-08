import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import { useCompanyStore } from '@shared/stores/companyStore';

export default function SalariesPage() {
    const { hasRole } = useCompanyStore();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Default to current month/year if needed, here we fetch all or filter later
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const { data: salaries, isLoading } = useQuery({
        queryKey: ['salaries', period],
        queryFn: async () => (await apiClient.get(ENDPOINTS.SALARIES.LIST, { params: { period } })).data,
    });

    const generateMutation = useMutation({
        mutationFn: () => apiClient.post(ENDPOINTS.SALARIES.GENERATE, null, { params: { period } }), // Assuming BE takes period param
        onSuccess: () => {
            showToast(`Đã tạo bảng lương tháng ${period}`, 'success');
            queryClient.invalidateQueries(['salaries']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lỗi tạo bảng lương', 'error')
    });

    const payMutation = useMutation({
        mutationFn: (id) => apiClient.post(ENDPOINTS.SALARIES.PAY(id)),
        onSuccess: () => {
            showToast('Đã xác nhận thanh toán', 'success');
            queryClient.invalidateQueries(['salaries']);
        }
    });

    const columns = [
        {
            header: 'Mã Phiếu',
            accessorKey: 'salaryId',
            cell: (row) => <span className="font-mono text-xs text-gray-500">#{row.salaryId}</span>
        },
        {
            header: 'Nhân viên',
            accessorKey: 'employeeName',
            cell: (row) => (
                <div>
                    <div className="font-semibold text-gray-900">{row.employeeName || row.employee?.fullName}</div>
                    <div className="text-xs text-gray-500">{row.employee?.employeeId}</div>
                </div>
            )
        },
        {
            header: 'Kỳ lương',
            accessorKey: 'period',
            cell: (row) => <span className="font-medium">{row.month}/{row.year}</span>
        },
        {
            header: 'Tổng lương',
            accessorKey: 'netSalary',
            cell: (row) => <span className="font-bold text-blue-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.netSalary || 0)}</span>
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => (
                <span className={`badge ${row.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {row.status === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                </span>
            )
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => hasRole('MANAGER_ACCOUNTING', 'OWNER') && (
                <div className="flex justify-end gap-2">
                    {row.status !== 'PAID' && (
                        <button
                            onClick={() => {
                                if (window.confirm('Xác nhận đã thanh toán lương cho nhân viên này?')) {
                                    payMutation.mutate(row.salaryId);
                                }
                            }}
                            className="btn-xs bg-green-500 text-white hover:bg-green-600 rounded px-2 py-1 flex items-center gap-1"
                        >
                            <i className="fa-solid fa-money-bill-wave" /> Pay
                        </button>
                    )}
                    <button className="btn-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded px-2 py-1">
                        <i className="fa-solid fa-eye" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bảng lương</h1>
                    <p className="text-gray-500 text-sm">Quản lý và tính lương nhân viên</p>
                </div>
                {hasRole('MANAGER_ACCOUNTING', 'OWNER') && (
                    <div className="flex gap-2">
                        <input
                            type="month"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="input"
                        />
                        <button
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending}
                            className="btn-primary"
                        >
                            {generateMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-calculator mr-2" /> Tính lương tháng</>}
                        </button>
                    </div>
                )}
            </div>

            <DataTable
                loading={isLoading}
                columns={columns}
                data={salaries?.content || salaries || []}
                totalCount={salaries?.totalElements || 0}
            />
        </div>
    );
}
