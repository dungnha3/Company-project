import { useState, useEffect } from 'react';
import { dashboardService } from '@/features/hr/shared/services';
import { usePermissions, useErrorHandler } from '@/shared/hooks';
import { useToast } from '@/shared/components/ui';

export default function HRDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const { isHRManager } = usePermissions();
  const { handleError } = useErrorHandler();
  const toast = useToast();

  // Permission guard
  if (!isHRManager) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>Không có quyền truy cập</div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Chỉ HR Manager mới có quyền xem dashboard HR</div>
      </div>
    );
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err) {
      const errorMessage = handleError(err, { context: 'load_hr_dashboard' });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (loading || !stats) {
    return (
      <div style={{ ...s.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ fontSize: 18, color: '#7b809a' }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>📊 HR Dashboard</h1>
          <p style={s.subtitle}>Thống kê tổng quan quản lý nhân sự</p>
        </div>
        <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={s.select}>
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="quarter">Quý này</option>
          <option value="year">Năm nay</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <div style={{ ...s.kpiCard, borderLeft: '4px solid #3b82f6' }}>
          <div style={s.kpiLabel}>Tổng nhân viên</div>
          <div style={s.kpiValue}>{stats.tongNhanVien || 0}</div>
          <div style={s.kpiChange}>+{stats.nhanVienMoi || 0} tháng này</div>
        </div>
        <div style={{ ...s.kpiCard, borderLeft: '4px solid #10b981' }}>
          <div style={s.kpiLabel}>Nhân viên mới</div>
          <div style={s.kpiValue}>{stats.nhanVienMoi || 0}</div>
          <div style={s.kpiChange}>Tuyển dụng mới</div>
        </div>
        <div style={{ ...s.kpiCard, borderLeft: '4px solid #ef4444' }}>
          <div style={s.kpiLabel}>Nghỉ việc</div>
          <div style={s.kpiValue}>{stats.nghiViec || 0}</div>
          <div style={s.kpiChange}>Tháng này</div>
        </div>
        <div style={{ ...s.kpiCard, borderLeft: '4px solid #f59e0b' }}>
          <div style={s.kpiLabel}>Đơn chờ duyệt</div>
          <div style={s.kpiValue}>{stats.donChoPheDuyet || 0}</div>
          <div style={s.kpiChange}>Cần xử lý</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={s.chartsRow}>
        {/* Attendance by Department */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>📊 Chấm công theo phòng ban</h3>
          <div style={s.barChartContainer}>
            {(stats.chamCongPhongBan || []).map((dept, idx) => {
              const total = dept.coMat + dept.vang + dept.diMuon;
              return (
                <div key={idx} style={s.barGroup}>
                  <div style={s.barLabel}>{dept.phongBan}</div>
                  <div style={s.barWrapper}>
                    <div style={{ ...s.bar, width: `${(dept.coMat / total) * 100}%`, background: '#10b981' }} title={`Có mặt: ${dept.coMat}`} />
                    <div style={{ ...s.bar, width: `${(dept.diMuon / total) * 100}%`, background: '#f59e0b' }} title={`Đi muộn: ${dept.diMuon}`} />
                    <div style={{ ...s.bar, width: `${(dept.vang / total) * 100}%`, background: '#ef4444' }} title={`Vắng: ${dept.vang}`} />
                  </div>
                  <div style={s.barValue}>{total}</div>
                </div>
              );
            })}
          </div>
          <div style={s.legend}>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#10b981' }} /> Có mặt</span>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#f59e0b' }} /> Đi muộn</span>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#ef4444' }} /> Vắng</span>
          </div>
        </div>

        {/* Salary Trend */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>💰 Xu hướng lương theo tháng</h3>
          <div style={s.lineChartContainer}>
            {(stats.luongTheoThang || []).map((item, idx) => {
              const maxSalary = Math.max(...(stats.luongTheoThang || []).map(i => i.tongLuong));
              const height = (item.tongLuong / maxSalary) * 100;
              return (
                <div key={idx} style={s.lineBar}>
                  <div style={s.lineValue}>{formatCurrency(item.tongLuong).replace('₫', 'tr')}</div>
                  <div style={{ ...s.lineColumn, height: `${height}%` }} />
                  <div style={s.lineLabel}>{item.thang}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={s.chartsRow}>
        {/* Age Distribution */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>👥 Nhân viên theo độ tuổi</h3>
          <div style={s.pieContainer}>
            {(stats.nhanVienTheoTuoi || []).map((item, idx) => {
              const total = (stats.nhanVienTheoTuoi || []).reduce((sum, i) => sum + i.soLuong, 0);
              const percent = ((item.soLuong / total) * 100).toFixed(1);
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
              return (
                <div key={idx} style={s.pieRow}>
                  <div style={s.pieLabel}>
                    <span style={{ ...s.pieDot, background: colors[idx] }} />
                    {item.doTuoi} tuổi
                  </div>
                  <div style={s.pieBar}>
                    <div style={{ ...s.pieBarFill, width: `${percent}%`, background: colors[idx] }} />
                  </div>
                  <div style={s.pieValue}>{item.soLuong} ({percent}%)</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender Distribution */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>🚻 Phân bố giới tính</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 40 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👨</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{stats.nhanVienTheoGioiTinh?.nam || 0}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Nam ({stats.tongNhanVien ? ((stats.nhanVienTheoGioiTinh?.nam / stats.tongNhanVien) * 100).toFixed(1) : 0}%)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👩</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#ec4899' }}>{stats.nhanVienTheoGioiTinh?.nu || 0}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Nữ ({stats.tongNhanVien ? ((stats.nhanVienTheoGioiTinh?.nu / stats.tongNhanVien) * 100).toFixed(1) : 0}%)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { padding: 24, background: '#f8fafc', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0 },
  subtitle: { color: '#64748b', fontSize: 14, margin: '4px 0 0 0' },
  select: { padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 },
  kpiCard: { background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  kpiLabel: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  kpiValue: { fontSize: 36, fontWeight: 700, color: '#0f172a', marginBottom: 4 },
  kpiChange: { fontSize: 13, color: '#10b981' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  chartCard: { background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  chartTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#0f172a' },
  barChartContainer: { marginBottom: 16 },
  barGroup: { display: 'flex', alignItems: 'center', marginBottom: 12, gap: 12 },
  barLabel: { width: 100, fontSize: 13, fontWeight: 600, color: '#475569' },
  barWrapper: { flex: 1, display: 'flex', height: 24, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' },
  bar: { height: '100%', transition: 'width 0.3s' },
  barValue: { width: 40, textAlign: 'right', fontSize: 14, fontWeight: 600, color: '#0f172a' },
  legend: { display: 'flex', gap: 16, fontSize: 13 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: '50%' },
  lineChartContainer: { display: 'flex', gap: 16, alignItems: 'flex-end', height: 200, padding: '20px 0' },
  lineBar: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  lineValue: { fontSize: 11, color: '#64748b', minHeight: 20 },
  lineColumn: { width: '100%', background: 'linear-gradient(to top, #3b82f6, #60a5fa)', borderRadius: '6px 6px 0 0', minHeight: 20 },
  lineLabel: { fontSize: 12, fontWeight: 600, color: '#475569' },
  pieContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
  pieRow: { display: 'flex', alignItems: 'center', gap: 12 },
  pieLabel: { width: 120, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 },
  pieDot: { width: 10, height: 10, borderRadius: '50%' },
  pieBar: { flex: 1, height: 24, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' },
  pieBarFill: { height: '100%', transition: 'width 0.3s' },
  pieValue: { width: 80, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#0f172a' },
};
