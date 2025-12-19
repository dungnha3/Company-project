import { useState, useEffect } from 'react';
import { commonStyles } from '@/shared/utils';
import { colors, typography, spacing } from '@/shared/styles/theme';

export default function DepartmentDetailPage({ departmentId, onBack }) {
  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (departmentId) {
      loadDepartmentData();
    }
  }, [departmentId]);

  const loadDepartmentData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock department data
      setDepartment({
        phongban_id: departmentId,
        tenPhongBan: 'Phòng IT',
        diaDiem: 'Tầng 3, Tòa nhà A',
        moTa: 'Phòng công nghệ thông tin, phụ trách phát triển và bảo trì hệ thống',
        truongPhong: 'Trần Văn B',
        ngayThanhLap: '2020-01-15',
        soLuongNhanVien: 12
      });
      
      // Mock employees in this department
      setEmployees([
        {
          nhanvien_id: 1,
          hoTen: 'Nguyễn Văn A',
          email: 'nguyenvana@company.com',
          soDienThoai: '0912345678',
          chucVu: { tenChucVu: 'Senior Developer' },
          luongCoBan: 18000000,
          trangThai: 'DANG_LAM_VIEC',
          ngayVaoLam: '2020-03-10'
        },
        {
          nhanvien_id: 2,
          hoTen: 'Trần Thị B',
          email: 'tranthib@company.com',
          soDienThoai: '0923456789',
          chucVu: { tenChucVu: 'Frontend Developer' },
          luongCoBan: 15000000,
          trangThai: 'DANG_LAM_VIEC',
          ngayVaoLam: '2021-06-20'
        },
        {
          nhanvien_id: 3,
          hoTen: 'Lê Văn C',
          email: 'levanc@company.com',
          soDienThoai: '0934567890',
          chucVu: { tenChucVu: 'Backend Developer' },
          luongCoBan: 16000000,
          trangThai: 'DANG_LAM_VIEC',
          ngayVaoLam: '2021-08-15'
        },
        {
          nhanvien_id: 4,
          hoTen: 'Phạm Thị D',
          email: 'phamthid@company.com',
          soDienThoai: '0945678901',
          chucVu: { tenChucVu: 'QA Engineer' },
          luongCoBan: 14000000,
          trangThai: 'DANG_LAM_VIEC',
          ngayVaoLam: '2022-01-10'
        },
        {
          nhanvien_id: 5,
          hoTen: 'Hoàng Văn E',
          email: 'hoangvane@company.com',
          soDienThoai: '0956789012',
          chucVu: { tenChucVu: 'DevOps Engineer' },
          luongCoBan: 17000000,
          trangThai: 'DANG_LAM_VIEC',
          ngayVaoLam: '2021-11-05'
        }
      ]);
      
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

  const filteredEmployees = employees.filter(emp =>
    emp.hoTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.chucVu.tenChucVu.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const avgSalary = employees.length > 0 
    ? Math.round(employees.reduce((sum, emp) => sum + emp.luongCoBan, 0) / employees.length)
    : 0;

  const positionCounts = employees.reduce((acc, emp) => {
    const position = emp.chucVu.tenChucVu;
    acc[position] = (acc[position] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
          <div style={{ fontSize: typography.xl, color: colors.textSecondary }}>
            Đang tải thông tin phòng ban...
          </div>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
          <div style={{ fontSize: typography.xl, color: colors.error, marginBottom: spacing.lg }}>
            ❌ Không tìm thấy phòng ban
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

  return (
    <div style={commonStyles.pageContainer}>
      {/* Header with Back Button */}
      <div style={{ marginBottom: spacing['2xl'] }}>
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
            <div style={{ fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: typography.semibold, textTransform: 'uppercase' }}>
              HR / Phòng ban / Chi tiết
            </div>
            <h1 style={{ ...commonStyles.heading1, margin: 0 }}>
              🏢 {department.tenPhongBan}
            </h1>
          </div>
        </div>
      </div>

      {/* Department Info Card */}
      <div style={{
        ...commonStyles.cardBase,
        marginBottom: spacing['2xl'],
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: colors.white
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.xl }}>
          <div>
            <div style={{ fontSize: typography.sm, opacity: 0.8, marginBottom: spacing.xs }}>📍 Địa điểm</div>
            <div style={{ fontSize: typography.lg, fontWeight: typography.semibold }}>
              {department.diaDiem}
            </div>
          </div>
          <div>
            <div style={{ fontSize: typography.sm, opacity: 0.8, marginBottom: spacing.xs }}>👥 Số lượng nhân viên</div>
            <div style={{ fontSize: typography.lg, fontWeight: typography.semibold }}>
              {employees.length} người
            </div>
          </div>
          <div>
            <div style={{ fontSize: typography.sm, opacity: 0.8, marginBottom: spacing.xs }}>👔 Trưởng phòng</div>
            <div style={{ fontSize: typography.lg, fontWeight: typography.semibold }}>
              {department.truongPhong}
            </div>
          </div>
          <div>
            <div style={{ fontSize: typography.sm, opacity: 0.8, marginBottom: spacing.xs }}>📅 Ngày thành lập</div>
            <div style={{ fontSize: typography.lg, fontWeight: typography.semibold }}>
              {new Date(department.ngayThanhLap).toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>
        {department.moTa && (
          <div style={{ marginTop: spacing.xl, paddingTop: spacing.xl, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: typography.sm, opacity: 0.8, marginBottom: spacing.xs }}>📝 Mô tả</div>
            <div style={{ fontSize: typography.base }}>{department.moTa}</div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.xl, marginBottom: spacing['2xl'] }}>
        <div style={{
          ...commonStyles.cardBase,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
          border: `2px solid ${colors.primary}`
        }}>
          <div style={{ fontSize: typography['3xl'], marginBottom: spacing.md }}>👥</div>
          <div style={{ fontSize: typography['2xl'], fontWeight: typography.bold, color: colors.primary, marginBottom: spacing.xs }}>
            {employees.length}
          </div>
          <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
            Tổng nhân viên
          </div>
        </div>
        
        <div style={{
          ...commonStyles.cardBase,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #10b98120 0%, #059669 20 100%)',
          border: `2px solid ${colors.success}`
        }}>
          <div style={{ fontSize: typography['3xl'], marginBottom: spacing.md }}>💰</div>
          <div style={{ fontSize: typography.lg, fontWeight: typography.bold, color: colors.success, marginBottom: spacing.xs }}>
            {new Intl.NumberFormat('vi-VN').format(avgSalary)}đ
          </div>
          <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
            Lương TB
          </div>
        </div>
        
        <div style={{
          ...commonStyles.cardBase,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f59e0b20 0%, #d9770620 100%)',
          border: `2px solid ${colors.warning}`
        }}>
          <div style={{ fontSize: typography['3xl'], marginBottom: spacing.md }}>🎯</div>
          <div style={{ fontSize: typography['2xl'], fontWeight: typography.bold, color: colors.warning, marginBottom: spacing.xs }}>
            {Object.keys(positionCounts).length}
          </div>
          <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
            Chức vụ
          </div>
        </div>
        
        <div style={{
          ...commonStyles.cardBase,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #3b82f620 0%, #2563eb20 100%)',
          border: `2px solid ${colors.info}`
        }}>
          <div style={{ fontSize: typography['3xl'], marginBottom: spacing.md }}>✅</div>
          <div style={{ fontSize: typography['2xl'], fontWeight: typography.bold, color: colors.info, marginBottom: spacing.xs }}>
            {employees.filter(e => e.trangThai === 'DANG_LAM_VIEC').length}
          </div>
          <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
            Đang làm việc
          </div>
        </div>
      </div>

      {/* Employees Section */}
      <div style={{ ...commonStyles.cardBase }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, paddingBottom: spacing.lg, borderBottom: `2px solid ${colors.borderLight}` }}>
          <h2 style={{ ...commonStyles.heading2, margin: 0 }}>
            👥 Danh sách nhân viên ({filteredEmployees.length})
          </h2>
          <div style={{ position: 'relative', width: '300px' }}>
            <span style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', fontSize: typography.lg }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                ...commonStyles.inputBase,
                paddingLeft: spacing['3xl']
              }}
            />
          </div>
        </div>

        {filteredEmployees.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.borderLight}` }}>
                  <th style={{ padding: spacing.lg, textAlign: 'left', fontSize: typography.sm, fontWeight: typography.bold, color: colors.textSecondary, textTransform: 'uppercase' }}>
                    Nhân viên
                  </th>
                  <th style={{ padding: spacing.lg, textAlign: 'left', fontSize: typography.sm, fontWeight: typography.bold, color: colors.textSecondary, textTransform: 'uppercase' }}>
                    Liên hệ
                  </th>
                  <th style={{ padding: spacing.lg, textAlign: 'left', fontSize: typography.sm, fontWeight: typography.bold, color: colors.textSecondary, textTransform: 'uppercase' }}>
                    Chức vụ
                  </th>
                  <th style={{ padding: spacing.lg, textAlign: 'right', fontSize: typography.sm, fontWeight: typography.bold, color: colors.textSecondary, textTransform: 'uppercase' }}>
                    Lương cơ bản
                  </th>
                  <th style={{ padding: spacing.lg, textAlign: 'left', fontSize: typography.sm, fontWeight: typography.bold, color: colors.textSecondary, textTransform: 'uppercase' }}>
                    Ngày vào làm
                  </th>
                  <th style={{ padding: spacing.lg, textAlign: 'center', fontSize: typography.sm, fontWeight: typography.bold, color: colors.textSecondary, textTransform: 'uppercase' }}>
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(employee => (
                  <tr key={employee.nhanvien_id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: spacing.lg }}>
                      <div style={{ fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.xs }}>
                        {employee.hoTen}
                      </div>
                      <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
                        ID: {employee.nhanvien_id}
                      </div>
                    </td>
                    <td style={{ padding: spacing.lg }}>
                      <div style={{ fontSize: typography.sm, color: colors.textPrimary, marginBottom: spacing.xs }}>
                        📧 {employee.email}
                      </div>
                      <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
                        📱 {employee.soDienThoai}
                      </div>
                    </td>
                    <td style={{ padding: spacing.lg }}>
                      <div style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.md}`,
                        background: colors.background,
                        borderRadius: spacing.md,
                        fontSize: typography.sm,
                        fontWeight: typography.medium,
                        color: colors.textPrimary
                      }}>
                        {employee.chucVu.tenChucVu}
                      </div>
                    </td>
                    <td style={{ padding: spacing.lg, textAlign: 'right', fontWeight: typography.semibold, color: colors.textPrimary }}>
                      {new Intl.NumberFormat('vi-VN').format(employee.luongCoBan)}đ
                    </td>
                    <td style={{ padding: spacing.lg, fontSize: typography.sm, color: colors.textSecondary }}>
                      {new Date(employee.ngayVaoLam).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: spacing.lg, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.md}`,
                        background: employee.trangThai === 'DANG_LAM_VIEC' ? '#f0fdf4' : '#fef2f2',
                        color: employee.trangThai === 'DANG_LAM_VIEC' ? '#15803d' : '#b91c1c',
                        borderRadius: spacing.md,
                        fontSize: typography.xs,
                        fontWeight: typography.bold,
                        textTransform: 'uppercase'
                      }}>
                        {employee.trangThai === 'DANG_LAM_VIEC' ? '✅ Làm việc' : '❌ Nghỉ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: spacing['6xl'] }}>
            <div style={{ fontSize: typography['5xl'], marginBottom: spacing.xl }}>👤</div>
            <div style={{ fontSize: typography.xl, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.md }}>
              Không tìm thấy nhân viên
            </div>
            <div style={{ fontSize: typography.base, color: colors.textSecondary }}>
              {searchTerm ? `Không có nhân viên nào khớp với "${searchTerm}"` : 'Phòng ban chưa có nhân viên'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
