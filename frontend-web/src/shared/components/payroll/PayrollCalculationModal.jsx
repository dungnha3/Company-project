import { useState } from 'react';
import { commonStyles } from '@/shared/utils';
import { colors, typography, spacing } from '@/shared/styles/theme';

export default function PayrollCalculationModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  employees = [],
  attendanceData = []
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedEmployee = employees.find(emp => emp.nhanvien_id === selectedEmployeeId);

  // Calculate preview
  const handlePreview = async () => {
    if (!selectedEmployeeId) {
      setError('Vui lòng chọn nhân viên');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Simulate API call - in real app, fetch from backend
      await new Promise(resolve => setTimeout(resolve, 800));

      const employee = selectedEmployee;
      
      // Find attendance data for this employee and month
      const empAttendance = attendanceData.filter(att => 
        att.nhanvien_id === selectedEmployeeId &&
        att.thang === month &&
        att.nam === year
      );

      // Calculate attendance stats
      const soNgayLam = empAttendance.length;
      const tongGioLam = empAttendance.reduce((sum, att) => sum + (att.tongGio || 0), 0);
      const gioLamChuan = 176; // Standard hours per month (22 days * 8 hours)

      // Calculate salary
      const luongCoBan = employee.luongCoBan || 15000000;
      const phuCap = employee.phuCap || 2000000;
      const thuong = 0; // No bonus by default
      
      const tongCong = luongCoBan + phuCap + thuong;

      // Calculate deductions (Vietnamese standard)
      const bhxh = Math.round(tongCong * 0.08); // 8%
      const bhyt = Math.round(tongCong * 0.015); // 1.5%
      const bhtn = Math.round(tongCong * 0.01); // 1%
      
      // Simple progressive tax calculation (TNCN)
      const taxableIncome = tongCong - bhxh - bhyt - bhtn - 11000000; // 11M personal deduction
      let thueTNCN = 0;
      
      if (taxableIncome > 0) {
        if (taxableIncome <= 5000000) {
          thueTNCN = Math.round(taxableIncome * 0.05);
        } else if (taxableIncome <= 10000000) {
          thueTNCN = Math.round(250000 + (taxableIncome - 5000000) * 0.10);
        } else if (taxableIncome <= 18000000) {
          thueTNCN = Math.round(750000 + (taxableIncome - 10000000) * 0.15);
        } else if (taxableIncome <= 32000000) {
          thueTNCN = Math.round(1950000 + (taxableIncome - 18000000) * 0.20);
        } else {
          thueTNCN = Math.round(4750000 + (taxableIncome - 32000000) * 0.25);
        }
      }

      const tongKhauTru = bhxh + bhyt + bhtn + thueTNCN;
      const thucLinh = tongCong - tongKhauTru;

      setPreview({
        employee: {
          hoTen: employee.hoTen || employee.ho_ten,
          chucVu: employee.chucVu?.tenChucVu || employee.chucVu || 'N/A',
          phongBan: employee.phongBan?.tenPhongBan || employee.phongBan || 'N/A'
        },
        attendance: {
          soNgayLam,
          tongGioLam: tongGioLam.toFixed(1),
          gioLamChuan
        },
        salary: {
          luongCoBan,
          phuCap,
          thuong,
          tongCong,
          bhxh,
          bhyt,
          bhtn,
          thueTNCN,
          tongKhauTru,
          thucLinh
        }
      });

      setShowPreview(true);
    } catch (err) {
      setError('Lỗi khi tính toán lương: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;

    try {
      setLoading(true);
      await onConfirm({
        nhanvien_id: selectedEmployeeId,
        thang: month,
        nam: year,
        ...preview.salary
      });
      
      // Reset and close
      setShowPreview(false);
      setPreview(null);
      setSelectedEmployeeId(null);
      onClose();
    } catch (err) {
      setError('Lỗi khi tạo bảng lương: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value || 0);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: spacing.xl
    }}
    onClick={onClose}
    >
      <div 
        style={{
          background: colors.white,
          borderRadius: spacing.xl,
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: colors.white,
          borderBottom: `1px solid ${colors.borderLight}`,
          padding: spacing['2xl'],
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1
        }}>
          <h3 style={{ ...commonStyles.heading2, margin: 0 }}>
            ⚡ Tính lương tự động
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: typography['3xl'],
              color: colors.textSecondary,
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: spacing['2xl'], display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: spacing.lg,
              borderRadius: spacing.lg,
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing.md
            }}>
              <span style={{ fontSize: typography.xl }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Employee Selection */}
          <div>
            <label style={{ display: 'block', fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.sm }}>
              👤 Chọn nhân viên
            </label>
            <select
              value={selectedEmployeeId || ''}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value ? Number(e.target.value) : null);
                setShowPreview(false);
                setError(null);
              }}
              style={{
                ...commonStyles.inputBase,
                padding: spacing.lg
              }}
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.map(emp => (
                <option key={emp.nhanvien_id} value={emp.nhanvien_id}>
                  {emp.hoTen || emp.ho_ten} - {emp.email}
                </option>
              ))}
            </select>
          </div>

          {/* Month & Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
            <div>
              <label style={{ display: 'block', fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.sm }}>
                📅 Tháng
              </label>
              <select
                value={month}
                onChange={(e) => {
                  setMonth(Number(e.target.value));
                  setShowPreview(false);
                }}
                style={{
                  ...commonStyles.inputBase,
                  padding: spacing.lg
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.sm }}>
                📆 Năm
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                  setShowPreview(false);
                }}
                style={{
                  ...commonStyles.inputBase,
                  padding: spacing.lg
                }}
              />
            </div>
          </div>

          {/* Preview Section */}
          {showPreview && preview && (
            <div style={{
              background: colors.background,
              borderRadius: spacing.xl,
              padding: spacing['2xl'],
              border: `1px solid ${colors.borderLight}`,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.xl
            }}>
              <h4 style={{ ...commonStyles.heading3, margin: 0, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span>📊</span> Xem trước kết quả
              </h4>

              {/* Employee Info */}
              <div style={{
                ...commonStyles.cardBase,
                padding: spacing.lg,
                background: colors.white
              }}>
                <div style={{ fontWeight: typography.bold, fontSize: typography.lg, color: colors.textPrimary, marginBottom: spacing.xs }}>
                  {preview.employee.hoTen}
                </div>
                <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
                  {preview.employee.chucVu} - {preview.employee.phongBan}
                </div>
              </div>

              {/* Attendance */}
              <div style={{
                ...commonStyles.cardBase,
                padding: spacing.lg,
                background: colors.white
              }}>
                <h5 style={{ fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.md }}>
                  ⏰ Chấm công
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing.lg, fontSize: typography.sm }}>
                  <div>
                    <div style={{ color: colors.textSecondary, marginBottom: spacing.xs }}>Số ngày làm</div>
                    <div style={{ fontWeight: typography.bold, fontSize: typography.xl }}>{preview.attendance.soNgayLam} ngày</div>
                  </div>
                  <div>
                    <div style={{ color: colors.textSecondary, marginBottom: spacing.xs }}>Tổng giờ làm</div>
                    <div style={{ fontWeight: typography.bold, fontSize: typography.xl }}>{preview.attendance.tongGioLam} giờ</div>
                  </div>
                  <div>
                    <div style={{ color: colors.textSecondary, marginBottom: spacing.xs }}>Giờ chuẩn</div>
                    <div style={{ fontWeight: typography.bold, fontSize: typography.xl }}>{preview.attendance.gioLamChuan} giờ</div>
                  </div>
                </div>
              </div>

              {/* Salary Details */}
              <div style={{
                ...commonStyles.cardBase,
                padding: spacing.lg,
                background: colors.white
              }}>
                <h5 style={{ fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.lg }}>
                  💰 Chi tiết lương
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, fontSize: typography.sm }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textSecondary }}>Lương cơ bản</span>
                    <span style={{ fontWeight: typography.semibold }}>{formatCurrency(preview.salary.luongCoBan)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textSecondary }}>Phụ cấp</span>
                    <span style={{ fontWeight: typography.semibold, color: colors.success }}>+{formatCurrency(preview.salary.phuCap)}</span>
                  </div>
                  {preview.salary.thuong > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.textSecondary }}>Thưởng</span>
                      <span style={{ fontWeight: typography.semibold, color: colors.success }}>+{formatCurrency(preview.salary.thuong)}</span>
                    </div>
                  )}
                  <div style={{ 
                    borderTop: `1px solid ${colors.borderLight}`, 
                    paddingTop: spacing.sm,
                    marginTop: spacing.sm,
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontWeight: typography.bold
                  }}>
                    <span>Tổng cộng</span>
                    <span style={{ color: colors.info }}>{formatCurrency(preview.salary.tongCong)}</span>
                  </div>
                  
                  {/* Deductions */}
                  <div style={{ 
                    borderTop: `1px solid ${colors.borderLight}`, 
                    paddingTop: spacing.md,
                    marginTop: spacing.md,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing.xs,
                    fontSize: typography.xs,
                    color: colors.textMuted
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>BHXH (8%)</span>
                      <span>-{formatCurrency(preview.salary.bhxh)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>BHYT (1.5%)</span>
                      <span>-{formatCurrency(preview.salary.bhyt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>BHTN (1%)</span>
                      <span>-{formatCurrency(preview.salary.bhtn)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Thuế TNCN</span>
                      <span>-{formatCurrency(preview.salary.thueTNCN)}</span>
                    </div>
                  </div>

                  {/* Final Amount */}
                  <div style={{ 
                    borderTop: `2px solid ${colors.borderLight}`, 
                    paddingTop: spacing.md,
                    marginTop: spacing.md,
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontWeight: typography.bold,
                    fontSize: typography.xl
                  }}>
                    <span>Thực lĩnh</span>
                    <span style={{ color: colors.success }}>{formatCurrency(preview.salary.thucLinh)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: colors.background,
          borderTop: `1px solid ${colors.borderLight}`,
          padding: spacing['2xl'],
          display: 'flex',
          justifyContent: 'flex-end',
          gap: spacing.md,
          zIndex: 1
        }}>
          <button
            onClick={onClose}
            style={{
              padding: `${spacing.md} ${spacing.xl}`,
              border: `1px solid ${colors.border}`,
              borderRadius: spacing.lg,
              background: colors.white,
              color: colors.textPrimary,
              fontSize: typography.sm,
              fontWeight: typography.semibold,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Hủy
          </button>
          
          {!showPreview ? (
            <button
              onClick={handlePreview}
              disabled={!selectedEmployeeId || loading}
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                border: 'none',
                borderRadius: spacing.lg,
                background: loading ? colors.textMuted : colors.info,
                color: colors.white,
                fontSize: typography.sm,
                fontWeight: typography.semibold,
                cursor: loading || !selectedEmployeeId ? 'not-allowed' : 'pointer',
                opacity: loading || !selectedEmployeeId ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              {loading ? '⏳ Đang tải...' : '👁️ Xem trước'}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                border: 'none',
                borderRadius: spacing.lg,
                background: loading ? colors.textMuted : colors.success,
                color: colors.white,
                fontSize: typography.sm,
                fontWeight: typography.semibold,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              {loading ? '⏳ Đang xử lý...' : '✅ Xác nhận tạo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
