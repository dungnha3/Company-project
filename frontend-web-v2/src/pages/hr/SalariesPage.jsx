import { useState, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import ExportButton from '@shared/components/ui/ExportButton';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { formatCurrency, formatNumber } from '@shared/utils/formatters';

export default function SalariesPage() {
    const { hasRole } = useWorkspaceStore();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('list');
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
    const [selectedSalary, setSelectedSalary] = useState(null);

    const { data: salaries, isLoading } = useQuery({
        queryKey: ['salaries', period],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.SALARIES.LIST, { params: { period } });
            return response.data?.content || response.data || [];
        },
    });

    const generateMutation = useMutation({
        mutationFn: () => apiClient.post(ENDPOINTS.SALARIES.GENERATE, null, { params: { period } }),
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

    const salaryList = salaries?.content || salaries || [];

    // Calculate summary stats
    const stats = {
        totalGross: salaryList.reduce((sum, s) => sum + (s.grossSalary || s.baseSalary || 0), 0),
        totalNet: salaryList.reduce((sum, s) => sum + (s.netSalary || 0), 0),
        totalTax: salaryList.reduce((sum, s) => sum + (s.tax || 0), 0),
        totalInsurance: salaryList.reduce((sum, s) => sum + (s.insurance || 0), 0),
        paidCount: salaryList.filter(s => s.status === 'PAID').length,
        pendingCount: salaryList.filter(s => s.status !== 'PAID').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bảng lương</h1>
                    <p className="text-gray-500 text-sm">Quản lý và tính lương nhân viên</p>
                </div>
                {hasRole('MANAGER_ACCOUNTING', 'OWNER') && (
                    <div className="flex gap-2 items-center">
                        <input
                            type="month"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="input"
                        />
                        <ExportButton
                            endpoint={ENDPOINTS.EXPORT.SALARY}
                            params={{
                                month: parseInt(period.split('-')[1]),
                                year: parseInt(period.split('-')[0])
                            }}
                            filename={`BangLuong_${period.replace('-', '')}.xlsx`}
                            label="Xuất Excel"
                        />
                        <button
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending}
                            className="btn-primary"
                        >
                            {generateMutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-calculator mr-2" /> Tính lương</>}
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon="fa-money-bill"
                    iconColor="text-green-600"
                    iconBg="bg-green-100"
                    label="Tổng lương gross"
                    value={formatCurrency(stats.totalGross)}
                />
                <StatCard
                    icon="fa-wallet"
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100"
                    label="Tổng thực lĩnh"
                    value={formatCurrency(stats.totalNet)}
                />
                <StatCard
                    icon="fa-landmark"
                    iconColor="text-orange-600"
                    iconBg="bg-orange-100"
                    label="Tổng thuế TNCN"
                    value={formatCurrency(stats.totalTax)}
                />
                <StatCard
                    icon="fa-shield-heart"
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100"
                    label="Tổng BHXH"
                    value={formatCurrency(stats.totalInsurance)}
                />
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')} icon="fa-list" label="Danh sách" />
                    <TabButton active={activeTab === 'chart'} onClick={() => setActiveTab('chart')} icon="fa-chart-pie" label="Biểu đồ" />
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'list' && (
                <SalaryTable
                    salaries={salaryList}
                    isLoading={isLoading}
                    onPay={(id) => payMutation.mutate(id)}
                    onViewPayslip={(salary) => setSelectedSalary(salary)}
                    hasRole={hasRole}
                />
            )}
            {activeTab === 'chart' && <SalaryCharts salaries={salaryList} stats={stats} />}

            {/* Payslip Modal */}
            {selectedSalary && (
                <PayslipModal
                    salary={selectedSalary}
                    onClose={() => setSelectedSalary(null)}
                />
            )}
        </div>
    );
}

const StatCard = memo(function StatCard({ icon, iconColor, iconBg, label, value }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
                    <i className={`fa-solid ${icon} ${iconColor}`} />
                </div>
                <div>
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="font-bold text-gray-900">{value}</div>
                </div>
            </div>
        </div>
    );
});

const TabButton = memo(function TabButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${active ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
        >
            <i className={`fa-solid ${icon}`} />
            {label}
        </button>
    );
});

function SalaryTable({ salaries, isLoading, onPay, onViewPayslip, hasRole }) {
    const columns = [
        {
            header: 'Nhân viên',
            accessorKey: 'employeeName',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                        {(row.employeeName || row.employee?.fullName)?.charAt(0)}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{row.employeeName || row.employee?.fullName}</div>
                        <div className="text-xs text-gray-500">{row.employee?.position?.name || 'N/A'}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Lương gross',
            accessorKey: 'grossSalary',
            cell: (row) => <span className="text-gray-600">{formatCurrency(row.grossSalary || row.baseSalary)}</span>
        },
        {
            header: 'Thuế TNCN',
            accessorKey: 'tax',
            cell: (row) => <span className="text-orange-600">-{formatCurrency(row.tax || 0)}</span>
        },
        {
            header: 'BHXH',
            accessorKey: 'insurance',
            cell: (row) => <span className="text-purple-600">-{formatCurrency(row.insurance || 0)}</span>
        },
        {
            header: 'Thực lĩnh',
            accessorKey: 'netSalary',
            cell: (row) => <span className="font-bold text-green-600">{formatCurrency(row.netSalary)}</span>
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {row.status === 'PAID' ? '✓ Đã trả' : '○ Chờ trả'}
                </span>
            )
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => onViewPayslip(row)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                        title="Xem phiếu lương"
                    >
                        <i className="fa-solid fa-file-invoice-dollar" />
                    </button>
                    {hasRole('MANAGER_ACCOUNTING', 'OWNER') && row.status !== 'PAID' && (
                        <button
                            onClick={() => {
                                if (window.confirm('Xác nhận đã thanh toán?')) onPay(row.salaryId);
                            }}
                            className="px-3 py-1.5 bg-green-500 text-white hover:bg-green-600 rounded-lg text-sm font-medium"
                        >
                            <i className="fa-solid fa-check mr-1" /> Trả
                        </button>
                    )}
                </div>
            )
        }
    ];

    return <DataTable loading={isLoading} columns={columns} data={salaries} />;
}

function SalaryCharts({ salaries, stats }) {
    // Salary distribution by department
    const deptData = {};
    salaries.forEach(s => {
        const dept = s.employee?.department?.name || 'Khác';
        deptData[dept] = (deptData[dept] || 0) + (s.netSalary || 0);
    });

    const departments = Object.entries(deptData).sort((a, b) => b[1] - a[1]);
    const maxDeptValue = Math.max(...departments.map(d => d[1]));

    // Payment status pie chart mock
    const paidPercent = stats.paidCount / (stats.paidCount + stats.pendingCount) * 100 || 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Salary by Department */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Chi phí lương theo phòng ban</h3>
                <div className="space-y-4">
                    {departments.map(([dept, value]) => (
                        <div key={dept}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{dept}</span>
                                <span className="font-medium text-gray-900">{formatCurrency(value)}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                    style={{ width: `${(value / maxDeptValue) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tax Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Cơ cấu khấu trừ</h3>
                <div className="flex items-center justify-center gap-8">
                    {/* Donut Chart */}
                    <div className="relative w-40 h-40">
                        <svg viewBox="0 0 36 36" className="w-full h-full">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="3"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="3"
                                strokeDasharray={`${(stats.totalTax / (stats.totalTax + stats.totalInsurance + stats.totalNet)) * 100}, 100`}
                                strokeLinecap="round"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="3"
                                strokeDasharray={`${(stats.totalInsurance / (stats.totalTax + stats.totalInsurance + stats.totalNet)) * 100}, 100`}
                                strokeDashoffset={`-${(stats.totalTax / (stats.totalTax + stats.totalInsurance + stats.totalNet)) * 100}`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-gray-900">{salaries.length}</span>
                            <span className="text-xs text-gray-500">phiếu lương</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-gray-600">Thực lĩnh</span>
                            <span className="text-sm font-medium ml-auto">{formatCurrency(stats.totalNet)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span className="text-sm text-gray-600">Thuế TNCN</span>
                            <span className="text-sm font-medium ml-auto">{formatCurrency(stats.totalTax)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-sm text-gray-600">BHXH</span>
                            <span className="text-sm font-medium ml-auto">{formatCurrency(stats.totalInsurance)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Trạng thái thanh toán</h3>
                <div className="flex items-center gap-8">
                    <div className="flex-1">
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-green-500"
                                style={{ width: `${paidPercent}%` }}
                            />
                            <div
                                className="h-full bg-yellow-400"
                                style={{ width: `${100 - paidPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-sm">
                            <span className="text-green-600 font-medium">{stats.paidCount} đã trả</span>
                            <span className="text-yellow-600 font-medium">{stats.pendingCount} chờ trả</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">{formatNumber(paidPercent, { maximumFractionDigits: 0 })}%</div>
                        <div className="text-sm text-gray-500">hoàn thành</div>
                    </div>
                </div>
            </div>

            {/* Tax Rate Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Biểu thuế TNCN</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-500 text-left">
                            <th className="pb-2 font-medium">Mức thu nhập</th>
                            <th className="pb-2 font-medium text-right">Thuế suất</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr><td className="py-2">Đến 5 triệu</td><td className="text-right font-mono">5%</td></tr>
                        <tr><td className="py-2">5 - 10 triệu</td><td className="text-right font-mono">10%</td></tr>
                        <tr><td className="py-2">10 - 18 triệu</td><td className="text-right font-mono">15%</td></tr>
                        <tr><td className="py-2">18 - 32 triệu</td><td className="text-right font-mono">20%</td></tr>
                        <tr><td className="py-2">32 - 52 triệu</td><td className="text-right font-mono">25%</td></tr>
                        <tr><td className="py-2">52 - 80 triệu</td><td className="text-right font-mono">30%</td></tr>
                        <tr><td className="py-2">Trên 80 triệu</td><td className="text-right font-mono">35%</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PayslipModal({ salary, onClose }) {
    const gross = salary.grossSalary || salary.baseSalary || 0;
    const tax = salary.tax || 0;
    const insurance = salary.insurance || 0;
    const bonus = salary.bonus || 0;
    const deductions = salary.deductions || 0;
    const net = salary.netSalary || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-bold">Phiếu lương</h2>
                        <p className="text-blue-200 text-sm">Tháng {salary.month}/{salary.year}</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white">
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                {/* Employee Info */}
                <div className="px-6 py-4 bg-gray-50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                        {(salary.employeeName || salary.employee?.fullName)?.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900">{salary.employeeName || salary.employee?.fullName}</div>
                        <div className="text-sm text-gray-500">{salary.employee?.position?.name} • {salary.employee?.department?.name}</div>
                    </div>
                </div>

                {/* Payslip Details */}
                <div className="px-6 py-4 space-y-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chi tiết lương</h4>

                    <div className="space-y-2">
                        <PayslipRow label="Lương cơ bản" value={gross} positive />
                        {bonus > 0 && <PayslipRow label="Thưởng" value={bonus} positive />}
                        <div className="border-t border-gray-100 my-2" />
                        <PayslipRow label="Thuế TNCN" value={tax} />
                        <PayslipRow label="BHXH (10.5%)" value={insurance} />
                        {deductions > 0 && <PayslipRow label="Khấu trừ khác" value={deductions} />}
                    </div>

                    {/* Net Salary */}
                    <div className="bg-green-50 rounded-xl p-4 flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Thực lĩnh</span>
                        <span className="text-2xl font-bold text-green-600">{formatCurrency(net)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
                    <button className="text-gray-500 hover:text-gray-700 flex items-center gap-2">
                        <i className="fa-solid fa-print" /> In phiếu
                    </button>
                    <button className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
                        <i className="fa-solid fa-download" /> Tải PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

const PayslipRow = memo(function PayslipRow({ label, value, positive }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-gray-600">{label}</span>
            <span className={`font-mono font-medium ${positive ? 'text-gray-900' : 'text-red-500'}`}>
                {positive ? '' : '- '}{formatCurrency(value)}
            </span>
        </div>
    );
});


