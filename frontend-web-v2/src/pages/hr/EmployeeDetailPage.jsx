import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('info');

    const { data: employee, isLoading, error } = useQuery({
        queryKey: ['employee', id],
        queryFn: async () => {
            const response = await apiClient.get(ENDPOINTS.EMPLOYEES.BY_ID(id));
            return response.data;
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Đang tải thông tin...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Không tìm thấy nhân viên</div>;

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/employees')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-primary hover:border-primary transition-all"
                >
                    <i className="fa-solid fa-arrow-left" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{employee.hoTen}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{employee.chucvu?.tenChucVu || 'Chưa cập nhật chức vụ'}</span>
                        <span>•</span>
                        <span>{employee.phongban?.tenPhongBan || 'Chưa cập nhật phòng ban'}</span>
                    </div>
                </div>
                <div className={`ml-auto px-3 py-1 rounded-lg text-sm font-medium 
            ${employee.trangThai === 'DANG_LAM_VIEC' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {employee.trangThai === 'DANG_LAM_VIEC' ? 'Đang làm việc' : 'Đã nghỉ việc'}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-8">
                    <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon="fa-user">Thông tin</TabButton>
                    <TabButton active={activeTab === 'contracts'} onClick={() => setActiveTab('contracts')} icon="fa-file-signature">Hợp đồng</TabButton>
                    <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon="fa-calendar-check">Chấm công</TabButton>
                    <TabButton active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} icon="fa-money-bill">Lương thưởng</TabButton>
                </div>
            </div>

            {/* Content */}
            <div className="py-4">
                {activeTab === 'info' && <EmployeeInfo employee={employee} />}
                {activeTab === 'contracts' && <Placeholder title="Hợp đồng lao động" />}
                {activeTab === 'attendance' && <Placeholder title="Lịch sử chấm công" />}
                {activeTab === 'payroll' && <Placeholder title="Thông tin lương" />}
            </div>
        </div>
    );
}

function TabButton({ children, active, onClick, icon }) {
    return (
        <button
            onClick={onClick}
            className={`pb-4 flex items-center gap-2 font-medium text-sm transition-all relative
            ${active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}
         `}
        >
            <i className={`fa-solid ${icon}`}></i>
            {children}
            {active && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
        </button>
    );
}

function EmployeeInfo({ employee }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Avatar & Contact */}
            <div className="card space-y-6">
                <div className="text-center">
                    {employee.avatarUrl ? (
                        <img src={employee.avatarUrl} alt={employee.hoTen} className="w-32 h-32 rounded-full object-cover mx-auto" />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-4xl font-bold mx-auto border-4 border-blue-100">
                            {employee.hoTen?.charAt(0)}
                        </div>
                    )}
                    <div className="mt-4 font-mono text-sm text-gray-500">{employee.maNhanVien || `ID: ${employee.nhanvienId}`}</div>
                </div>

                <div className="space-y-4">
                    <InfoItem icon="fa-envelope" label="Email" value={employee.email} />
                    <InfoItem icon="fa-phone" label="Điện thoại" value={employee.soDienThoai} />
                    <InfoItem icon="fa-location-dot" label="Địa chỉ" value={employee.diaChi} />
                </div>
            </div>

            {/* Right Column - Detailed Info */}
            <div className="md:col-span-2 card space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Thông tin cá nhân</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField label="Họ và tên" value={employee.hoTen} />
                    <InfoField label="Giới tính" value={employee.gioiTinh} />
                    <InfoField label="Ngày sinh" value={employee.ngaySinh ? new Date(employee.ngaySinh).toLocaleDateString('vi-VN') : '-'} />
                    <InfoField label="CCCD/CMND" value={employee.cccd} />
                </div>

                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 pt-4">Thông tin công việc</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField label="Phòng ban" value={employee.phongban?.tenPhongBan} />
                    <InfoField label="Chức vụ" value={employee.chucvu?.tenChucVu} />
                    <InfoField label="Ngày vào làm" value={employee.ngayVaoLam ? new Date(employee.ngayVaoLam).toLocaleDateString('vi-VN') : '-'} />
                    <InfoField label="Loại nhân viên" value="Chính thức" />
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
