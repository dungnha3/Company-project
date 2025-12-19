import { dashboardBaseStyles as styles } from '@/shared/styles/dashboard'

// Navigation Item Component
export function NavItem({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navItem,
        ...(active ? styles.navItemActive : {})
      }}
    >
      <span style={styles.navIcon}>{icon}</span>
      <span>{children}</span>
    </button>
  )
}

// Role Badge Component for Admin
export function RoleBadge({ role }) {
  return (
    <div style={styles.roleBadge}>
      <span>👑 {role}</span>
    </div>
  )
}

// KPI Card Component for Admin
export function KPICard({ title, value, icon, color, change }) {
  const cardStyle = {
    ...styles.kpiCard,
    background: '#fff',
    borderColor: '#e5e7eb'
  }

  return (
    <div style={cardStyle}>
      <div style={styles.kpiHeader}>
        <div style={styles.kpiTitle}>{title}</div>
        <div style={{ ...styles.kpiIcon, color: '#dc2626' }}>{icon}</div>
      </div>
      <div style={{ ...styles.kpiValue, color: '#dc2626' }}>{value}</div>
      <div style={{ ...styles.kpiChange, color: '#6b7280' }}>{change}</div>
    </div>
  )
}

// Status Badge Component for Admin
export function StatusBadge({ status }) {
  const statuses = {
    active: { label: '✓ Hoạt động', bg: '#dbeafe', color: '#1e3a8a', border: '#93c5fd' },
    inactive: { label: '⚠ Không hoạt động', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
    pending: { label: '⏳ Chờ xử lý', bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
    approved: { label: '✅ Đã duyệt', bg: '#dcfce7', color: '#166534', border: '#86efac' },
    rejected: { label: '❌ Từ chối', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }
  }
  const s = statuses[status] || statuses.pending

  return (
    <div style={{ ...styles.statusBadge, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </div>
  )
}

// Employee Status Component for Admin
export function EmployeeStatusBar({ status }) {
  const statuses = {
    active: { width: '100%', bg: '#10b981', label: '100% - Hoạt động' },
    inactive: { width: '0%', bg: '#dc2626', label: '0% - Không hoạt động' },
    leave: { width: '50%', bg: '#f59e0b', label: '50% - Đang nghỉ' }
  }
  const s = statuses[status] || statuses.active

  return (
    <div style={styles.statusBarWrap}>
      <div style={{ ...styles.statusBar, width: s.width, background: s.bg }} />
      <span style={styles.statusBarLabel}>{s.label}</span>
    </div>
  )
}

// Department Card Component
export function DepartmentCard({ name, employeeCount, icon, status }) {
  return (
    <div style={styles.overviewItem}>
      <div style={styles.overviewIcon(status)}>
        {icon}
      </div>
      <div style={styles.overviewContent}>
        <div style={styles.overviewTitle}>{name}</div>
        <div style={styles.overviewStatus}>{employeeCount} nhân viên</div>
      </div>
    </div>
  )
}

// Quick Action Button Component
export function QuickActionBtn({ onClick, children, icon }) {
  return (
    <button style={styles.actionBtn} onClick={onClick}>
      <span style={{ marginRight: 8 }}>{icon}</span>
      {children}
    </button>
  )
}
