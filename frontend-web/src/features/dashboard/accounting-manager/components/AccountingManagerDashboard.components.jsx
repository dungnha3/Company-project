import { dashboardBaseStyles as styles } from '@/shared/styles/dashboard'

// Navigation Item Component with collapsed state support (synchronized with EmployeeDashboard)
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

// Role Badge Component
export function RoleBadge({ role }) {
  return (
    <div style={styles.roleBadge}>
      <span>💼 {role}</span>
    </div>
  )
}

// Modern Stat Card Component (synchronized with EmployeeDashboard)
export function StatCard({ title, value, subtext, icon, accentColor = '#3b82f6', onClick, loading = false, trend }) {
  const cardStyle = {
    background: '#fff',
    padding: 24,
    borderRadius: 16,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    cursor: onClick ? 'pointer' : 'default',
    border: '1px solid #f1f5f9',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  };

  const iconStyle = {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    background: `${accentColor}15`,
    color: accentColor
  };

  const valueStyle = {
    fontSize: 28,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1,
    marginBottom: 4
  };

  const titleStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#64748b',
    marginTop: 8
  };

  const subtextStyle = {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4
  };

  const trendStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 100,
    fontSize: 12,
    fontWeight: 600,
    background: trend?.type === 'up' ? '#dcfce7' : trend?.type === 'down' ? '#fee2e2' : '#f1f5f9',
    color: trend?.type === 'up' ? '#16a34a' : trend?.type === 'down' ? '#dc2626' : '#64748b'
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#94a3b8' }}>Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={headerStyle}>
        <div style={iconStyle}>{icon}</div>
        {trend && (
          <div style={trendStyle}>
            {trend.type === 'up' ? '↑' : trend.type === 'down' ? '↓' : '→'} {trend.value}
          </div>
        )}
      </div>
      <div style={valueStyle}>{value}</div>
      <div style={titleStyle}>{title}</div>
      {subtext && <div style={subtextStyle}>{subtext}</div>}
    </div>
  );
}

// Quick Action Button (synchronized with EmployeeDashboard)
export function QuickActionButton({ icon, label, onClick, color = '#3b82f6' }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.2s',
        flex: 1
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{label}</span>
    </button>
  );
}

// KPI Card Component (legacy)
export function KPICard({ title, value, icon, color, change }) {
  const getColorStyle = (color) => {
    switch (color) {
      case 'success':
        return { iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10b981' }
      case 'warning':
        return { iconBg: 'rgba(245, 158, 11, 0.15)', iconColor: '#f59e0b' }
      case 'info':
        return { iconBg: 'rgba(59, 130, 246, 0.15)', iconColor: '#3b82f6' }
      case 'primary':
        return { iconBg: 'rgba(5, 150, 105, 0.15)', iconColor: '#059669' }
      default:
        return { iconBg: 'rgba(5, 150, 105, 0.15)', iconColor: '#059669' }
    }
  }

  const colorStyle = getColorStyle(color)

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f5f9'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{value}</div>
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: colorStyle.iconBg,
          display: 'grid',
          placeItems: 'center',
          fontSize: 24,
          color: colorStyle.iconColor
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 13, color: change?.startsWith('+') ? '#10b981' : '#dc2626', fontWeight: 600 }}>
        {change} so với tháng trước
      </div>
    </div>
  )
}

// Approval Status Badge Component
export function ApprovalStatusBadge({ status }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved':
        return { bg: '#dcfce7', color: '#16a34a', text: 'Đã duyệt' }
      case 'pending':
        return { bg: '#fef3c7', color: '#d97706', text: 'Chờ duyệt' }
      case 'rejected':
        return { bg: '#fee2e2', color: '#dc2626', text: 'Từ chối' }
      default:
        return { bg: '#f1f5f9', color: '#64748b', text: 'Không xác định' }
    }
  }

  const statusStyle = getStatusStyle(status)

  return (
    <span style={{
      padding: '4px 12px',
      borderRadius: 100,
      fontSize: 12,
      fontWeight: 600,
      color: statusStyle.color,
      background: statusStyle.bg
    }}>
      {statusStyle.text}
    </span>
  )
}
