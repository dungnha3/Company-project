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
            <div className="bg-white rounded-xl border border-gray-100 p-6">
                {activeTab === 'overview' && (
                    <EmployeeInfo employee={employee} />
                )}

                {activeTab === 'permissions' && (
                    <div>
                        <div className="mb-6 bg-blue-50 text-blue-700 p-4 rounded-lg flex items-start gap-3">
                            <i className="fa-solid fa-circle-info mt-1" />
                            <div>
                                <p className="font-semibold">Lưu ý về Phân quyền</p>
                                <p className="text-sm">
                                    Các quyền dưới đây sẽ được áp dụng bổ sung hoặc ghi đè (nếu bị tắt) lên quyền mặc định của Vai trò hiện tại ({employee.role}).
                                </p>
                            </div>
                        </div>
                        <PermissionSelector
                            value={employee.permissions || {}}
                            onChange={handlePermissionChange}
                        />
                    </div>
                )}

                {(activeTab === 'contracts' || activeTab === 'attendance' || activeTab === 'salary') && (
                    <Placeholder title={tabs.find(t => t.id === activeTab)?.label} />
                )}
            </div>
        </div>
    );
}

function EmployeeInfo({ employee }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Avatar & Contact */}
            <div className="space-y-6">
                <div className="text-center">
                    <Avatar src={employee.avatarUrl} name={employee.fullName} size="xl" className="w-32 h-32 mx-auto" />
                    <div className="mt-4 font-mono text-sm text-gray-500">{employee.employeeCode}</div>
                </div>

                <div className="space-y-4">
                    <InfoItem icon="fa-envelope" label="Email" value={employee.email} />
                    <InfoItem icon="fa-phone" label="Điện thoại" value={employee.phone} />
                    <InfoItem icon="fa-location-dot" label="Địa chỉ" value={employee.address} />
                </div>
            </div>

            {/* Right Column - Detailed Info */}
            <div className="md:col-span-2 space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Thông tin cá nhân</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField label="Họ và tên" value={employee.fullName} />
                    <InfoField label="Giới tính" value={employee.gender === 'MALE' ? 'Nam' : employee.gender === 'FEMALE' ? 'Nữ' : 'Khác'} />
                    <InfoField label="Ngày sinh" value={formatDate(employee.dateOfBirth)} />
                    <InfoField label="CCCD/CMND" value={employee.identityNumber} />
                </div>

                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 pt-4">Thông tin công việc</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField label="Phòng ban" value={employee.department?.name} />
                    <InfoField label="Chức vụ" value={employee.position?.name} />
                    <InfoField label="Ngày vào làm" value={formatDate(employee.joinDate)} />
                    <InfoField label="Loại nhân viên" value={employee.type} />
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div>
                <div className="text-gray-500 text-xs">{label}</div>
                <div className="text-gray-900 font-medium break-all">{value}</div>
            </div>
        </div>
    );
}

function InfoField({ label, value }) {
    return (
        <div>
            <div className="text-gray-500 text-xs mb-1 uppercase tracking-wider">{label}</div>
            <div className="text-gray-900 font-medium border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/50">
                {value || '---'}
            </div>
        </div>
    );
}

function Placeholder({ title }) {
    return (
        <div className="card py-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <i className="fa-solid fa-person-digging text-2xl"></i>
            </div>
            <h3 className="text-gray-900 font-medium text-lg mb-2">Tính năng đang phát triển</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
                Phần quản lý {title.toLowerCase()} sẽ được cập nhật trong bản phát hành tiếp theo.
            </p>
        </div>
    );
}
