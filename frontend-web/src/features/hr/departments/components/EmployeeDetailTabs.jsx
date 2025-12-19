/**
 * Tab components for Employee Detail Modal
 */

// Info Tab - Thông tin nhân viên
export function InfoTab({ employee }) {
  return (
    <div style={styles.infoContainer}>
      {/* Personal Information */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Thông tin cá nhân</h3>
        <div style={styles.grid}>
          <InfoField label="Họ tên" value={employee.hoTen} />
          <InfoField label="Giới tính" value={employee.gioiTinh || 'N/A'} />
          <InfoField label="CCCD" value={employee.cccd || 'N/A'} />
          <InfoField label="Ngày sinh" value={formatDate(employee.ngaySinh)} />
          <InfoField label="Địa chỉ" value={employee.diaChi || 'N/A'} fullWidth />
          <InfoField label="Email" value={employee.email || 'N/A'} />
          <InfoField label="SĐT" value={employee.sdt || 'N/A'} />
          <InfoField label="Ngày vào làm" value={formatDate(employee.ngayVaoLam)} />
          <InfoField 
            label="Trạng thái" 
            value={<StatusBadge status={employee.trangThai} />} 
          />
        </div>
      </div>

      {/* Work Information */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Thông tin công việc</h3>
        <div style={styles.grid}>
          <InfoField 
            label="Phòng ban" 
            value={employee.tenPhongBan || employee.phongban?.tenPhongBan || 'N/A'} 
          />
          <InfoField 
            label="Chức vụ" 
            value={employee.tenChucVu || employee.chucvu?.tenChucVu || 'N/A'} 
          />
        </div>
      </div>
    </div>
  );
}

// Contract Tab - Hợp đồng
export function ContractTab({ contracts, loading }) {
  if (loading) return <Loading />;
  if (!contracts || contracts.length === 0) {
    return <EmptyState icon="📄" message="Chưa có hợp đồng" />;
  }

  const activeContract = contracts.find(c => c.trangThai === 'HIEU_LUC');

  return (
    <div style={styles.contractContainer}>
      {activeContract && (
        <div style={styles.activeContract}>
          <div style={styles.contractBadge}>
            <span style={styles.badgeIcon}>✓</span>
            Hợp đồng đang hiệu lực
          </div>
          <div style={styles.grid}>
            <InfoField 
              label="Loại nhân viên" 
              value={activeContract.loaiNhanVien || 'Chính thức'} 
            />
            <InfoField 
              label="Tình trạng" 
              value={<ContractStatusBadge status={activeContract.trangThai} />} 
            />
            <InfoField 
              label="Ngày ký" 
              value={formatDate(activeContract.ngayKy)} 
            />
            <InfoField 
              label="Loại hợp đồng" 
              value={activeContract.loaiHopDong || 'N/A'} 
            />
            <InfoField 
              label="Ngày bắt đầu" 
              value={formatDate(activeContract.ngayBatDau)} 
            />
            <InfoField 
              label="Ngày kết thúc" 
              value={activeContract.ngayKetThuc ? formatDate(activeContract.ngayKetThuc) : 'Vô thời hạn'} 
            />
            <InfoField 
              label="Lương cơ bản" 
              value={<span>******</span>} 
            />
          </div>
        </div>
      )}

      {contracts.length > 1 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Lịch sử hợp đồng</h4>
          {contracts.map((contract, index) => (
            <div key={index} style={styles.historyItem}>
              <div style={styles.historyHeader}>
                <span style={styles.historyTitle}>
                  {contract.loaiHopDong || 'Hợp đồng'} - {formatDate(contract.ngayKy)}
                </span>
                <ContractStatusBadge status={contract.trangThai} />
              </div>
              <div style={styles.historyDetails}>
                <span>📅 {formatDate(contract.ngayBatDau)} → {contract.ngayKetThuc ? formatDate(contract.ngayKetThuc) : 'Vô thời hạn'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Attendance Tab - Chấm công
export function AttendanceTab({ attendances, loading }) {
  if (loading) return <Loading />;
  if (!attendances || attendances.length === 0) {
    return <EmptyState icon="📊" message="Chưa có dữ liệu chấm công" />;
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Ngày</th>
            <th style={styles.th}>Giờ vào</th>
            <th style={styles.th}>Giờ ra</th>
            <th style={styles.th}>Loại ca</th>
            <th style={styles.th}>Tổng giờ</th>
            <th style={styles.th}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {attendances.map((att, index) => (
            <tr key={index} style={styles.tr}>
              <td style={styles.td}>{formatDate(att.ngayCham)}</td>
              <td style={styles.td}>{att.gioVao || '--:--'}</td>
              <td style={styles.td}>{att.gioRa || '--:--'}</td>
              <td style={styles.td}>
                <span style={getShiftBadgeStyle(att.loaiCa)}>
                  {att.loaiCa || 'FULL'}
                </span>
              </td>
              <td style={styles.td}>{att.soGioLam ? `${att.soGioLam.toFixed(2)}h` : 'N/A'}</td>
              <td style={styles.td}>
                <AttendanceStatusBadge status={att.trangThai} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Leave Tab - Nghỉ phép
export function LeaveTab({ leaves, loading }) {
  if (loading) return <Loading />;
  if (!leaves || leaves.length === 0) {
    return <EmptyState icon="🏖️" message="Chưa có đơn nghỉ phép" />;
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Từ ngày</th>
            <th style={styles.th}>Đến ngày</th>
            <th style={styles.th}>Loại</th>
            <th style={styles.th}>Số ngày</th>
            <th style={styles.th}>Lý do</th>
            <th style={styles.th}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map((leave, index) => (
            <tr key={index} style={styles.tr}>
              <td style={styles.td}>{formatDate(leave.tuNgay)}</td>
              <td style={styles.td}>{formatDate(leave.denNgay)}</td>
              <td style={styles.td}>
                <span style={getLeaveTypeBadgeStyle(leave.loaiNghi)}>
                  {leave.loaiNghi || 'OM'}
                </span>
              </td>
              <td style={styles.td}>{leave.soNgayNghi || 0} ngày</td>
              <td style={styles.td}>{leave.lyDo || 'N/A'}</td>
              <td style={styles.td}>
                <LeaveStatusBadge status={leave.trangThai} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper Components
function InfoField({ label, value, fullWidth = false }) {
  return (
    <div style={{...styles.field, ...(fullWidth ? styles.fieldFull : {})}}>
      <label style={styles.fieldLabel}>{label}</label>
      <div style={styles.fieldValue}>{value || 'N/A'}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    DANG_LAM_VIEC: { color: '#16a34a', bg: '#dcfce7', text: 'Đang làm' },
    NGHI_VIEC: { color: '#dc2626', bg: '#fee2e2', text: 'Nghỉ việc' },
    TAM_NGHI: { color: '#d97706', bg: '#fef3c7', text: 'Tạm nghỉ' }
  };
  const style = config[status] || config.DANG_LAM_VIEC;
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: '4px 8px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 700, display: 'inline-block'
    }}>
      {style.text}
    </span>
  );
}

function ContractStatusBadge({ status }) {
  const config = {
    HIEU_LUC: { color: '#16a34a', bg: '#dcfce7', text: 'Còn hiệu lực' },
    HET_HAN: { color: '#dc2626', bg: '#fee2e2', text: 'Hết hạn' },
    BI_HUY: { color: '#6b7280', bg: '#f3f4f6', text: 'Bị hủy' }
  };
  const style = config[status] || config.HIEU_LUC;
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: '4px 8px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 700, display: 'inline-block'
    }}>
      {style.text}
    </span>
  );
}

function AttendanceStatusBadge({ status }) {
  const config = {
    DUNG_GIO: { color: '#16a34a', bg: '#dcfce7', text: 'ĐÚNG GIỜ' },
    DI_TRE: { color: '#d97706', bg: '#fef3c7', text: 'ĐI MUỘN' },
    VE_SOM: { color: '#d97706', bg: '#fef3c7', text: 'VỀ SỚM' }
  };
  const style = config[status] || { color: '#6b7280', bg: '#f3f4f6', text: status || 'N/A' };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: '4px 8px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 700, display: 'inline-block'
    }}>
      {style.text}
    </span>
  );
}

function LeaveStatusBadge({ status }) {
  const config = {
    CHO_DUYET: { color: '#d97706', bg: '#fef3c7', text: 'Chờ duyệt' },
    DA_DUYET: { color: '#16a34a', bg: '#dcfce7', text: 'Đã duyệt' },
    BI_TU_CHOI: { color: '#dc2626', bg: '#fee2e2', text: 'Bị từ chối' }
  };
  const style = config[status] || { color: '#6b7280', bg: '#f3f4f6', text: 'N/A' };
  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: '4px 8px', borderRadius: '6px',
      fontSize: '11px', fontWeight: 700, display: 'inline-block'
    }}>
      {style.text}
    </span>
  );
}

function Loading() {
  return (
    <div style={styles.loading}>
      <div style={styles.spinner}>⏳</div>
      <p>Đang tải dữ liệu...</p>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>{icon}</div>
      <p style={styles.emptyText}>{message}</p>
    </div>
  );
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
}

function getShiftBadgeStyle(shiftType) {
  const config = {
    FULL: { bg: '#dbeafe', color: '#1e40af' },
    CHIEU: { bg: '#fef3c7', color: '#d97706' },
    TOI: { bg: '#e0e7ff', color: '#4f46e5' }
  };
  const style = config[shiftType] || config.FULL;
  return {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    background: style.bg,
    color: style.color,
    display: 'inline-block'
  };
}

function getLeaveTypeBadgeStyle(leaveType) {
  const config = {
    OM: { bg: '#fee2e2', color: '#dc2626' },
    PHEP: { bg: '#dbeafe', color: '#1e40af' },
    KHAC: { bg: '#f3f4f6', color: '#6b7280' }
  };
  const style = config[leaveType] || config.PHEP;
  return {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    background: style.bg,
    color: style.color,
    display: 'inline-block'
  };
}

// Styles
const styles = {
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24
  },
  section: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #f0f2f5'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#344767',
    marginBottom: 16,
    marginTop: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  fieldFull: {
    gridColumn: '1 / -1'
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#7b809a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#344767'
  },
  contractContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  activeContract: {
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    borderRadius: 12,
    padding: 20,
    border: '2px solid #16a34a'
  },
  contractBadge: {
    background: '#16a34a',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  badgeIcon: {
    fontSize: 16
  },
  historyItem: {
    background: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#344767'
  },
  historyDetails: {
    fontSize: 12,
    color: '#7b809a'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    background: '#f9fafb',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: '#7b809a',
    textTransform: 'uppercase',
    borderBottom: '2px solid #e5e7eb'
  },
  tr: {
    borderBottom: '1px solid #f0f2f5'
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#344767'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    color: '#7b809a'
  },
  spinner: {
    fontSize: 48,
    marginBottom: 12
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    color: '#7b809a'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 14,
    margin: 0
  }
};
