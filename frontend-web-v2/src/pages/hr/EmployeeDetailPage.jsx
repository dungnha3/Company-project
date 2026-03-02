import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate } from '@shared/utils/formatters';
import { Avatar } from '@shared/components/OptimizedImage';
import PermissionSelector from './employee/components/PermissionSelector';

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch employee details
    const { data: employee, isLoading } = useQuery({
        queryKey: ['employee', id],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.BY_ID(id))).data,
    });

    // Update Permission Mutation
    const updatePermissionMutation = useMutation({
        mutationFn: ({ key, enabled }) =>
            apiClient.put(ENDPOINTS.COMPANIES.MEMBER_PERMISSIONS(employee.companyId, employee.user?.userId), {
                permissionKey: key,
                enabled: enabled
            }),
        onSuccess: () => {
            success('Cập nhật quyền thành công');
            queryClient.invalidateQueries(['employee', id]);
        },
        onError: (err) => {
            error(err.response?.data?.message || 'Lỗi khi cập nhật quyền');
        }
    });

    const handlePermissionChange = (key, enabled) => {
        if (!employee?.user?.userId) return;
        updatePermissionMutation.mutate({ key, enabled });
    };

    if (isLoading) return <div className="loading-spinner" />;
    if (!employee) return <div>Không tìm thấy nhân viên</div>;

    const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: 'fa-user' },
        { id: 'contracts', label: 'Hợp đồng', icon: 'fa-file-contract' },
        { id: 'attendance', label: 'Chấm công', icon: 'fa-clock' },
        { id: 'salary', label: 'Lương', icon: 'fa-money-bill-wave' },
        { id: 'permissions', label: 'Phân quyền (Mới)', icon: 'fa-shield-halved' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/app/hr/employees')} className="btn-secondary">
                    <i className="fa-solid fa-arrow-left" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{employee.fullName}</h1>
                    <p className="text-gray-500">{employee.jobTitle} - {employee.department?.name}</p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-sm font-medium 
                    ${employee.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {employee.status === 'ACTIVE' ? 'Đang làm việc' : 'Đã nghỉ việc'}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'border-violet-600 text-violet-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className={`fa-solid ${tab.icon}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-6">
                {activeTab === 'overview' && (
                    <EmployeeInfo employee={employee} />
                )}

                {activeTab === 'permissions' && (
                    <div>
                        <div className="mb-6 bg-indigo-50 text-indigo-700 p-4 rounded-lg flex items-start gap-3">
                            <i className="fa-solid fa-circle-info mt-1" />
                            <div>
                                <p className="font-semibold">Lưu ý về Phân quyền</p>
                                <p className="text-sm">
                                    Các quyền dưới đây được quản lý chi tiết cho từng thành viên. Bật/tắt để tùy chỉnh quyền truy cập.
                                </p>
                            </div>
                        </div>
                        <PermissionSelector
                            value={employee.permissions || {}}
                            onChange={handlePermissionChange}
                        />
                    </div>
                )}

                {activeTab === 'contracts' && (
                    <EmployeeContracts employeeId={id} />
                )}
                {activeTab === 'attendance' && (
                    <EmployeeAttendance employeeId={id} />
                )}
                {activeTab === 'salary' && (
                    <EmployeeSalary employeeId={id} />
                )}
            </div>
        </div>
    );
}

function EmployeeInfo({ employee }) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Thông tin cá nhân</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label="Họ và tên" value={employee.fullName} />
                <InfoField label="Email" value={employee.email} />
                <InfoField label="Số điện thoại" value={employee.phone} />
                <InfoField label="Địa chỉ" value={employee.address} />
                <InfoField label="Giới tính" value={employee.gender === 'MALE' ? 'Nam' : employee.gender === 'FEMALE' ? 'Nữ' : 'Khác'} />
                <InfoField label="Ngày sinh" value={formatDate(employee.dateOfBirth)} />
                <InfoField label="Chức danh" value={employee.jobTitle} />
                <InfoField label="Phòng ban" value={employee.department?.name} />
                <InfoField label="Vị trí" value={employee.position?.name} />
            </div>
        </div>
    );
}

function InfoField({ label, value }) {
    return (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="font-medium text-gray-900">{value || '—'}</p>
        </div>
    );
}

function EmployeeContracts({ employeeId }) {
    const { data: contracts = [], isLoading } = useQuery({
        queryKey: ['employee-contracts', employeeId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CONTRACTS.BY_EMPLOYEE(employeeId))).data,
    });

    if (isLoading) return <div className="text-center py-8 text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" />Đang tải...</div>;
    if (contracts.length === 0) return <div className="text-center py-8 text-gray-400"><i className="fa-solid fa-file-contract text-3xl mb-3" /><p>Chưa có hợp đồng nào</p></div>;

    return (
        <div className="space-y-3">
            {(Array.isArray(contracts) ? contracts : [contracts]).map((c, i) => (
                <div key={c.contractId || i} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <div>
                        <p className="font-medium text-gray-900">{c.contractType || 'Hợp đồng'}</p>
                        <p className="text-sm text-gray-500">{formatDate(c.startDate)} — {formatDate(c.endDate) || 'Không xác định'}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.status === 'ACTIVE' ? 'Đang hiệu lực' : c.status || 'N/A'}
                    </span>
                </div>
            ))}
        </div>
    );
}

function EmployeeAttendance({ employeeId }) {
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['employee-attendance', employeeId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ATTENDANCE.BY_EMPLOYEE(employeeId))).data,
    });

    if (isLoading) return <div className="text-center py-8 text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" />Đang tải...</div>;

    const recentRecords = Array.isArray(records) ? records.slice(0, 10) : [];
    if (recentRecords.length === 0) return <div className="text-center py-8 text-gray-400"><i className="fa-solid fa-clock text-3xl mb-3" /><p>Chưa có dữ liệu chấm công</p></div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Ngày</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Check-in</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Check-out</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Giờ làm</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {recentRecords.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{formatDate(r.date)}</td>
                            <td className="px-4 py-3 text-green-600">{r.checkInTime || '—'}</td>
                            <td className="px-4 py-3 text-red-600">{r.checkOutTime || '—'}</td>
                            <td className="px-4 py-3 font-medium">{r.workHours ? `${r.workHours}h` : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function EmployeeSalary({ employeeId }) {
    const { data: salaries = [], isLoading } = useQuery({
        queryKey: ['employee-salaries', employeeId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.SALARIES.BY_EMPLOYEE(employeeId))).data,
    });

    if (isLoading) return <div className="text-center py-8 text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2" />Đang tải...</div>;

    const salaryList = Array.isArray(salaries) ? salaries : (salaries?.content || []);
    if (salaryList.length === 0) return <div className="text-center py-8 text-gray-400"><i className="fa-solid fa-money-bill-wave text-3xl mb-3" /><p>Chưa có dữ liệu lương</p></div>;

    return (
        <div className="space-y-3">
            {salaryList.slice(0, 10).map((s, i) => (
                <div key={s.salaryId || i} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <div>
                        <p className="font-medium text-gray-900">Tháng {s.month}/{s.year}</p>
                        <p className="text-sm text-gray-500">Lương cơ bản: {(s.baseSalary || 0).toLocaleString('vi-VN')}₫</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-900">{(s.netSalary || s.totalSalary || 0).toLocaleString('vi-VN')}₫</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${s.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {s.status === 'PAID' ? 'Đã trả' : s.status === 'PENDING' ? 'Chờ duyệt' : s.status || 'N/A'}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
