import { useState, useEffect } from 'react';
import { commonStyles } from '@/shared/utils';
import { colors, typography, spacing } from '@/shared/styles/theme';
import { SharedProfilePage } from '@/shared/components/profile';
import { SharedPayrollPage } from '@/shared/components/payroll';
import { SharedAttendancePage } from '@/shared/components/attendance';
import { SharedContractsPage } from '@/shared/components/contracts';
import { SharedLeaveRequestPage } from '@/shared/components/leave-request';

const TABS = [
  { id: 'info', label: 'Thông tin', icon: '👤' },
  { id: 'contracts', label: 'Hợp đồng', icon: '📄' },
  { id: 'attendance', label: 'Chấm công', icon: '🕐' },
  { id: 'payroll', label: 'Bảng lương', icon: '💰' },
  { id: 'leave', label: 'Nghỉ phép', icon: '📋' }
];

export default function EmployeeDetailPage({ employeeId, onBack }) {
  const [activeTab, setActiveTab] = useState('info');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock employee data
      setEmployee({
        nhanvien_id: employeeId,
        hoTen: 'Nguyễn Văn A',
        email: 'nguyenvana@company.com',
        soDienThoai: '0912345678',
        ngaySinh: '1990-05-15',
        gioiTinh: 'Nam',
        diaChi: '123 Đường ABC, Quận 1, TP.HCM',
        chucVu: { tenChucVu: 'Senior Developer', chucvu_id: 1 },
        phongBan: { tenPhongBan: 'IT Department', phongban_id: 1 },
        luongCoBan: 18000000,
        phuCap: 2500000,
        trangThai: 'DANG_LAM_VIEC',
        ngayVaoLam: '2020-03-10',
        cccd: '079090001234',
        noiCapCCCD: 'TP. Hồ Chí Minh',
        ngayCapCCCD: '2020-01-01'
      });

      setLoading(false);
    } catch (err) {
      // Handle error silently or use error handler
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  if (loading) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
          <div style={{ fontSize: typography.xl, color: colors.textSecondary }}>
            Đang tải thông tin nhân viên...
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
          <div style={{ fontSize: typography.xl, color: colors.error, marginBottom: spacing.lg }}>
            ❌ Không tìm thấy nhân viên
          </div>
          <button
            onClick={handleBack}
            style={{
              padding: `${spacing.md} ${spacing.xl}`,
              background: colors.gradientPrimary,
              color: colors.white,
              border: 'none',
              borderRadius: spacing.lg,
              fontSize: typography.sm,
              fontWeight: typography.semibold,
              cursor: 'pointer'
            }}
          >
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <SharedProfilePage
            title={`Nhân viên #${employee.nhanvien_id} - ${employee.hoTen}`}
            breadcrumb={`HR / Nhân viên / ${employee.hoTen}`}
            allowEdit={true}
            userRole="HR Manager"
          />
        );

      case 'contracts':
        return (
          <SharedContractsPage
            title="Hợp đồng lao động"
            breadcrumb={`HR / Nhân viên / ${employee.hoTen} / Hợp đồng`}
            viewMode="personal"
            employeeId={employee.nhanvien_id}
          />
        );

      case 'attendance':
        return (
          <SharedAttendancePage
            title="Lịch sử chấm công"
            breadcrumb={`HR / Nhân viên / ${employee.hoTen} / Chấm công`}
            viewMode="personal"
            employeeId={employee.nhanvien_id}
          />
        );

      case 'payroll':
        return (
          <SharedPayrollPage
            title="Bảng lương"
            breadcrumb={`HR / Nhân viên / ${employee.hoTen} / Bảng lương`}
            viewMode="personal"
            employeeId={employee.nhanvien_id}
          />
        );

      case 'leave':
        return (
          <SharedLeaveRequestPage
            title="Đơn nghỉ phép"
            breadcrumb={`HR / Nhân viên / ${employee.hoTen} / Nghỉ phép`}
            viewMode="personal"
            employeeId={employee.nhanvien_id}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      fontFamily: typography.fontFamily
    }}>
      {/* Header with Back Button */}
      <div style={{
        background: colors.white,
        borderBottom: `1px solid ${colors.borderLight}`,
        padding: spacing['2xl'],
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg }}>
          <button
            onClick={handleBack}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: spacing.lg,
              border: `1px solid ${colors.border}`,
              background: colors.white,
              color: colors.textPrimary,
              fontSize: typography.xl,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ ...commonStyles.heading1, margin: 0, marginBottom: spacing.xs }}>
              {employee.hoTen}
            </h1>
            <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
              {employee.chucVu.tenChucVu} - {employee.phongBan.tenPhongBan}
            </div>
          </div>
          <div style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            background: employee.trangThai === 'DANG_LAM_VIEC' ? '#f0fdf4' : '#fef2f2',
            color: employee.trangThai === 'DANG_LAM_VIEC' ? '#15803d' : '#b91c1c',
            borderRadius: spacing.lg,
            fontSize: typography.sm,
            fontWeight: typography.bold
          }}>
            {employee.trangThai === 'DANG_LAM_VIEC' ? '✅ Đang làm việc' : '❌ Đã nghỉ'}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div style={{
          display: 'flex',
          gap: spacing.sm,
          borderBottom: `2px solid ${colors.borderLight}`,
          marginTop: spacing.xl
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                background: 'none',
                border: 'none',
                borderBottom: `3px solid ${activeTab === tab.id ? colors.primary : 'transparent'}`,
                color: activeTab === tab.id ? colors.primary : colors.textSecondary,
                fontSize: typography.sm,
                fontWeight: activeTab === tab.id ? typography.bold : typography.medium,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                marginBottom: '-2px'
              }}
            >
              <span style={{ fontSize: typography.lg }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
}
