import { useState } from 'react';

const mockPayroll = [
  { id: 1, nhanVien: 'Nguyễn Văn A', thang: 11, nam: 2024, luongCoBan: 15000000, phuCap: 2000000, thuong: 1000000, tongLuong: 18000000, tongKhauTru: 1500000, luongThucLanh: 16500000, trangThai: 'DA_THANH_TOAN' },
  { id: 2, nhanVien: 'Trần Thị B', thang: 11, nam: 2024, luongCoBan: 20000000, phuCap: 3000000, thuong: 2000000, tongLuong: 25000000, tongKhauTru: 2200000, luongThucLanh: 22800000, trangThai: 'CHO_DUYET' },
  { id: 3, nhanVien: 'Lê Văn C', thang: 11, nam: 2024, luongCoBan: 25000000, phuCap: 3500000, thuong: 3000000, tongLuong: 31500000, tongKhauTru: 3000000, luongThucLanh: 28500000, trangThai: 'DA_THANH_TOAN' },
];

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState(mockPayroll);
  const [selectedMonth, setSelectedMonth] = useState('2024-11');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const getStatusBadge = (status) => {
    const styles = {
      CHO_DUYET: { bg: '#fef3c7', color: '#92400e', label: '⏳ Chờ duyệt' },
      DA_DUYET: { bg: '#dbeafe', color: '#1e3a8a', label: '✓ Đã duyệt' },
      DA_THANH_TOAN: { bg: '#dcfce7', color: '#166534', label: '✓ Đã thanh toán' },
      HUY: { bg: '#fee2e2', color: '#991b1b', label: '✗ Hủy' },
    };
    const s = styles[status];
    return <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>{s.label}</span>;
  };

  const filteredPayrolls = payrolls.filter(p => filterStatus === 'ALL' || p.trangThai === filterStatus);

  return (
    <div style={st.container}>
      <div style={st.header}>
        <div>
          <h1 style={st.title}>Quản lý Bảng lương</h1>
          <p style={st.subtitle}>Tính toán và theo dõi lương nhân viên</p>
        </div>
        <button style={st.calcBtn}>🧮 Tính lương tháng này</button>
      </div>

      <div style={st.filters}>
        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={st.monthInput} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={st.select}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="CHO_DUYET">Chờ duyệt</option>
          <option value="DA_DUYET">Đã duyệt</option>
          <option value="DA_THANH_TOAN">Đã thanh toán</option>
        </select>
      </div>

      <div style={st.tableCard}>
        <table style={st.table}>
          <thead>
            <tr>
              <th style={st.th}>Nhân viên</th>
              <th style={st.th}>Tháng/Năm</th>
              <th style={st.th}>Lương cơ bản</th>
              <th style={st.th}>Phụ cấp</th>
              <th style={st.th}>Thưởng</th>
              <th style={st.th}>Tổng lương</th>
              <th style={st.th}>Khấu trừ</th>
              <th style={st.th}>Thực lãnh</th>
              <th style={st.th}>Trạng thái</th>
              <th style={st.th}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayrolls.map(p => (
              <tr key={p.id} style={st.tr}>
                <td style={st.td}><strong>{p.nhanVien}</strong></td>
                <td style={st.td}>{p.thang}/{p.nam}</td>
                <td style={st.td}>{formatCurrency(p.luongCoBan)}</td>
                <td style={st.td}>{formatCurrency(p.phuCap)}</td>
                <td style={st.td}>{formatCurrency(p.thuong)}</td>
                <td style={st.td}><strong>{formatCurrency(p.tongLuong)}</strong></td>
                <td style={st.td} title="BHXH, BHYT, Thuế">{formatCurrency(p.tongKhauTru)}</td>
                <td style={st.td}><strong style={{ color: '#10b981' }}>{formatCurrency(p.luongThucLanh)}</strong></td>
                <td style={st.td}>{getStatusBadge(p.trangThai)}</td>
                <td style={st.td}>
                  <button style={st.viewBtn}>👁️</button>
                  <button style={st.printBtn}>🖨️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const st = {
  container: { padding: 24, background: '#f8fafc', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0 },
  subtitle: { color: '#64748b', fontSize: 14, margin: '4px 0 0 0' },
  calcBtn: { padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  filters: { display: 'flex', gap: 12, marginBottom: 20 },
  monthInput: { padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 },
  select: { padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, minWidth: 200 },
  tableCard: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 1200 },
  th: { padding: '14px 12px', textAlign: 'left', background: '#f1f5f9', fontSize: 13, fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 12px', fontSize: 13, color: '#334155' },
  viewBtn: { padding: '6px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginRight: 4 },
  printBtn: { padding: '6px 10px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
};
