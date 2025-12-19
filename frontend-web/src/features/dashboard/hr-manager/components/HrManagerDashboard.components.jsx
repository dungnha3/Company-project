import { dashboardBaseStyles as styles } from '@/shared/styles/dashboard'

// Navigation Item Component
export function NavItem({ active, onClick, children, icon, collapsed }) {
  const baseStyle = {
    ...styles.navItem,
    color: active ? '#64748b' : '#94a3b8',
    background: active ? '#f1f5f9' : 'transparent',
    justifyContent: collapsed ? 'center' : 'flex-start',
    alignItems: 'center',
    padding: collapsed ? '12px 0' : '12px',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.25s cubic-bezier(0.4, 0, 0.2, 1), justify-content 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    borderRadius: 10,
    marginBottom: 4,
    display: 'flex',
    gap: 0,
    cursor: 'pointer',
  };

  const iconWrapperStyle = {
    minWidth: 24,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 18,
    color: active ? '#64748b' : '#94a3b8',
    transition: 'color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const textWrapperStyle = {
    marginLeft: collapsed ? 0 : 12,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const textStyle = {
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    whiteSpace: 'nowrap',
    display: 'inline-block',
    transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: collapsed ? 0 : 1,
    transform: collapsed ? 'translateX(-10px)' : 'translateX(0)',
  };

  return (
    <button
      onClick={onClick}
      style={baseStyle}
      title={collapsed ? children : ''}
    >
      <span style={iconWrapperStyle}>{icon}</span>
      <span style={textWrapperStyle}>
        <span style={textStyle}>{children}</span>
      </span>
      {active && !collapsed && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 3,
          height: '60%',
          background: '#64748b',
          borderTopLeftRadius: 3,
          borderBottomLeftRadius: 3,
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      )}
    </button>
  )
}

// Role Badge Component with Avatar
export function RoleBadge({ role, avatarUrl }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        background: '#f1f5f9',
        borderRadius: 20,
        fontSize: 14,
        fontWeight: 500,
        color: '#475569',
      }}>
        <span>👔</span>
        <span>{role}</span>
      </div>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="Avatar"
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        />
      )}
    </div>
  )
}

// KPI Card Component - Updated for HR Manager theme
export function KPICard({ title, value, icon, color, change }) {
  // All cards use white background with gray/yellow accents
  const cardStyle = {
    ...styles.kpiCard,
    background: '#fff',
    borderColor: '#e5e7eb'
  }

  return (
    <div style={cardStyle}>
      <div style={styles.kpiHeader}>
        <div style={styles.kpiTitle}>{title}</div>
        <div style={{ ...styles.kpiIcon, color: '#f59e0b' }}>{icon}</div>
      </div>
      <div style={{ ...styles.kpiValue, color: '#374151' }}>{value}</div>
      <div style={{ ...styles.kpiChange, color: '#6b7280' }}>{change}</div>
    </div>
  )
}

// Status Badge Component for Attendance - Updated for HR Manager theme
export function StatusBadge({ status }) {
  const statuses = {
    normal: { label: '✓ Đúng giờ', bg: '#e5e7eb', color: '#374151', border: '#d1d5db' },
    late: { label: '⚠ Đi muộn', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
    early: { label: '⏰ Về sớm', bg: '#fef3c7', color: '#d97706', border: '#fde68a' }
  }
  const s = statuses[status] || statuses.normal

  return (
    <div style={{ ...styles.statusBadge, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </div>
  )
}

// Leave Status Bar Component - Updated for HR Manager theme
export function LeaveStatusBar({ status }) {
  const statuses = {
    approved: { width: '100%', bg: '#374151', label: '100% - Đã duyệt' },
    pending: { width: '30%', bg: '#f59e0b', label: '30% - Chờ duyệt' },
    rejected: { width: '100%', bg: '#dc2626', label: '100% - Từ chối' }
  }
  const s = statuses[status] || statuses.pending

  return (
    <div style={styles.statusBarWrap}>
      <div style={{ ...styles.statusBar, width: s.width, background: s.bg }} />
      <span style={styles.statusBarLabel}>{s.label}</span>
    </div>
  )
}

// Approval Status Badge Component - Updated for HR Manager theme
export function ApprovalStatusBadge({ status }) {
  const statuses = {
    pending: { label: '⏳ Chờ duyệt', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    approved: { label: '✓ Đã duyệt', bg: '#e5e7eb', color: '#374151', border: '#d1d5db' },
    rejected: { label: '✗ Từ chối', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }
  }
  const s = statuses[status] || statuses.pending

  return (
    <div style={{ ...styles.statusBadge, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </div>
  )
}
