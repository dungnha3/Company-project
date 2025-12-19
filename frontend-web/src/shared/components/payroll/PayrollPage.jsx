import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { payrollService } from '@/features/hr/shared/services';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { formatCurrency } from '@/shared/utils';
import {
  PageContainer,
  PageHeader,
  PageTitle,
  Breadcrumb,
  FilterBar,
  FormSelect,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LoadingState,
  ErrorState,
  EmptyState,
  StatCard
} from '@/shared/components/ui';

export default function SharedPayrollPage({
  title = "Phiếu lương",
  breadcrumb = "Cá nhân / Phiếu lương",
  viewMode = "personal", // "personal" | "management"
  glassMode = false
}) {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { user: authUser } = useAuth();
  const { user: currentUser, isHRManager } = usePermissions();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    loadPayrolls();
  }, [selectedMonth, selectedYear]);

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === "personal" && currentUser?.userId) {
        // Load personal payrolls only
        const data = await payrollService.getByEmployee(currentUser.userId, selectedYear, selectedMonth);
        setPayrolls(data || []);
      } else if (viewMode === "management" && isHRManager) {
        // Load all payrolls for management
        const data = await payrollService.getAll(selectedYear, selectedMonth);
        setPayrolls(data || []);
      }
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_payrolls' });
      setError(errorMessage);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const currentPayroll = payrolls.find(p => p.thang === selectedMonth && p.nam === selectedYear);
  const stats = {
    luongCoBan: currentPayroll?.luongCoBan || 0,
    phuCap: currentPayroll?.phuCap || 0,
    thuong: currentPayroll?.thuong || 0,
    khauTru: currentPayroll?.tongKhauTru || 0,
    thucLinh: currentPayroll?.luongThucNhan || 0
  };


  // Get status badge
  const getStatusBadge = (status) => {
    const config = {
      CHO_DUYET: { bg: '#fff7ed', color: '#c2410c', label: '⏳ Chờ duyệt' },
      DA_DUYET: { bg: '#f0fdf4', color: '#15803d', label: '✓ Đã duyệt' },
      DA_TRA: { bg: '#eff6ff', color: '#2563eb', label: '💰 Đã trả' },
      HUY: { bg: '#fef2f2', color: '#b91c1c', label: '✗ Hủy' }
    };
    const s = config[status] || config.CHO_DUYET;
    return (
      <span style={{
        background: s.bg, color: s.color, padding: '4px 8px', borderRadius: 6,
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap'
      }}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Đang tải thông tin lương..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState message={error} onRetry={loadPayrolls} />
      </PageContainer>
    );
  }

  return (
    <div className={glassMode ? "accounting-animate-fade-in" : ""} style={glassMode ? { padding: 0 } : {}}>
      {!glassMode && (
        <PageHeader>
          <div>
            <Breadcrumb>{breadcrumb}</Breadcrumb>
            <PageTitle>{title}</PageTitle>
            {viewMode === "personal" && (
              <div style={{ fontSize: 14, color: '#7b809a', marginTop: 4 }}>
                Xem thông tin lương và phụ cấp của bạn
              </div>
            )}
          </div>
        </PageHeader>
      )}

      {/* Filter Bar */}
      <div className={glassMode ? "card" : ""} style={{ marginBottom: 25, padding: glassMode ? '15px 25px' : 0, display: 'flex', gap: 15, alignItems: 'center', background: glassMode ? undefined : 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#666' }}>Chọn kỳ lương:</label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', outline: 'none', background: 'white' }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', outline: 'none', background: 'white' }}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>
            })}
          </select>
        </div>
      </div>

      {currentPayroll ? (
        <>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 25, marginBottom: 25 }}>
            <div className={glassMode ? "card" : "stat-card-default"} style={{ padding: 20, background: glassMode ? undefined : 'white', borderRadius: 15, boxShadow: glassMode ? undefined : '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💰</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Lương cơ bản</div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2d3436' }}>{formatCurrency(stats.luongCoBan)}</div>
            </div>

            <div className={glassMode ? "card" : "stat-card-default"} style={{ padding: 20, background: glassMode ? undefined : 'white', borderRadius: 15, boxShadow: glassMode ? undefined : '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💎</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Phụ cấp</div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2d3436' }}>{formatCurrency(stats.phuCap)}</div>
            </div>

            <div className={glassMode ? "card" : "stat-card-default"} style={{ padding: 20, background: glassMode ? undefined : 'white', borderRadius: 15, boxShadow: glassMode ? undefined : '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎁</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Thưởng</div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2d3436' }}>{formatCurrency(stats.thuong)}</div>
            </div>

            <div className={glassMode ? "card" : "stat-card-default"} style={{ padding: 20, background: glassMode ? undefined : 'white', borderRadius: 15, boxShadow: glassMode ? undefined : '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📉</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Khấu trừ</div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e74c3c' }}>{formatCurrency(stats.khauTru)}</div>
            </div>

            <div className={glassMode ? "card" : "stat-card-default"} style={{ padding: 20, background: glassMode ? undefined : 'linear-gradient(135deg, #8e44ad, #a29bfe)', borderRadius: 15, boxShadow: glassMode ? undefined : '0 4px 15px rgba(142, 68, 173, 0.3)', color: glassMode ? 'inherit' : 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💵</div>
                <div style={{ fontSize: '0.9rem', color: glassMode ? '#666' : 'rgba(255,255,255,0.9)' }}>Thực lĩnh</div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: glassMode ? '#2d3436' : 'white' }}>{formatCurrency(stats.thucLinh)}</div>
            </div>
          </div>

          {/* Payroll Details */}
          <div className={glassMode ? "card" : "card-default"} style={{ padding: 25, background: glassMode ? undefined : 'white', borderRadius: 20, boxShadow: glassMode ? undefined : '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 15 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2d3436' }}>
                Chi tiết lương tháng {selectedMonth}/{selectedYear}
              </h3>
              <div>{getStatusBadge(currentPayroll.trangThai)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: glassMode ? '1fr 1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40 }}>
              {/* Thu nhập */}
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#00b894', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fa-solid fa-circle-arrow-up"></i> Thu nhập
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                    <span style={{ color: '#666' }}>Lương cơ bản</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(currentPayroll.luongCoBan)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                    <span style={{ color: '#666' }}>Phụ cấp</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(currentPayroll.phuCap)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                    <span style={{ color: '#666' }}>Thưởng</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(currentPayroll.thuong)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                    <span style={{ color: '#666' }}>Làm thêm giờ</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(currentPayroll.lamThemGio || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: '#00b894', marginTop: 10 }}>
                    <span>Tổng thu nhập</span>
                    <span>{formatCurrency((currentPayroll.luongCoBan || 0) + (currentPayroll.phuCap || 0) + (currentPayroll.thuong || 0) + (currentPayroll.lamThemGio || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Khấu trừ */}
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#ff7675', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fa-solid fa-circle-arrow-down"></i> Khấu trừ
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                    <span style={{ color: '#666' }}>Bảo hiểm xã hội</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(currentPayroll.bhxh || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                    <span style={{ color: '#666' }}>Bảo hiểm y tế</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(currentPayroll.bhyt || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                    <span style={{ color: '#666' }}>Thuế TNCN</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(currentPayroll.thueTNCN || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: 8 }}>
                    <span style={{ color: '#666' }}>Khấu trừ khác</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(currentPayroll.khauTruKhac || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: '#ff7675', marginTop: 10 }}>
                    <span>Tổng khấu trừ</span>
                    <span>{formatCurrency(currentPayroll.tongKhauTru)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Thực lĩnh */}
            <div style={{
              marginTop: 30, padding: 25,
              background: glassMode ? 'rgba(142, 68, 173, 0.05)' : '#f8f9fa',
              borderRadius: 15,
              border: glassMode ? '1px solid rgba(142, 68, 173, 0.2)' : '2px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                THỰC LĨNH THÁNG {selectedMonth}/{selectedYear}
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#2d3436', fontFamily: "'Poppins', sans-serif" }}>
                {formatCurrency(currentPayroll.luongThucNhan)}
              </div>
              {currentPayroll.ngayTra && (
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>
                  <i className="fa-regular fa-calendar-check"></i> Ngày thanh toán: {new Date(currentPayroll.ngayTra).toLocaleDateString('vi-VN')}
                </div>
              )}
            </div>

            {/* Ghi chú */}
            {currentPayroll.ghiChu && (
              <div style={{ marginTop: 25 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                  <i className="fa-regular fa-note-sticky"></i> Ghi chú
                </h4>
                <div style={{
                  background: '#fff9c4', padding: 15, borderRadius: 10,
                  fontSize: 14, color: '#5d4037', border: '1px solid #fff59d', lineHeight: 1.6
                }}>
                  {currentPayroll.ghiChu}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={glassMode ? "card" : ""} style={{ padding: 40, textAlign: 'center', background: glassMode ? undefined : 'white', borderRadius: 20 }}>
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>💰</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#2d3436' }}>Không có dữ liệu lương</h3>
          <p style={{ color: '#636e72', margin: 0 }}>
            Chưa có thông tin lương cho tháng {selectedMonth}/{selectedYear}.<br />
            Vui lòng kiểm tra lại kỳ lương hoặc liên hệ phòng kế toán.
          </p>
        </div>
      )}
    </div>
  );
}
