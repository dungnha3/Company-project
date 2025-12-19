import { dashboardBaseStyles as styles } from '@/shared/styles/dashboard'

// Navigation Item Component with collapsed state support
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

// ========== NEW COMPONENTS FOR REDESIGNED DASHBOARD ==========

// Modern Stat Card Component
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

// Today Status Card - Shows check-in/check-out status
export function TodayStatusCard({ status, onCheckIn, onCheckOut, loading }) {
  const isCheckedIn = status?.checkedIn;
  const isCheckedOut = status?.checkedOut;

  const cardStyle = {
    background: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)',
    padding: 28,
    borderRadius: 20,
    color: '#fff',
    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  };

  const dateStyle = {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 4
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  };

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const buttonStyle = {
    background: isCheckedIn && !isCheckedOut ? '#fff' : 'rgba(255,255,255,0.2)',
    color: isCheckedIn && !isCheckedOut ? '#5b21b6' : '#fff',
    border: 'none',
    padding: '14px 28px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: loading || (isCheckedIn && isCheckedOut) ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    opacity: (isCheckedIn && isCheckedOut) ? 0.6 : 1
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <div style={dateStyle}>{today}</div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{greeting()}!</h2>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '8px 16px',
          borderRadius: 100,
          fontSize: 13,
          fontWeight: 500
        }}>
          {isCheckedIn && isCheckedOut ? '✅ Đã hoàn thành' : isCheckedIn ? '🟢 Đang làm việc' : '⏳ Chưa chấm công'}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 24,
        background: 'rgba(255,255,255,0.1)',
        padding: 16,
        borderRadius: 12
      }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Giờ vào</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatTime(status?.gioVao)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Giờ ra</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatTime(status?.gioRa)}</div>
        </div>
      </div>

      <button
        style={buttonStyle}
        onClick={isCheckedIn ? onCheckOut : onCheckIn}
        disabled={loading || (isCheckedIn && isCheckedOut)}
      >
        {loading ? (
          <>⏳ Đang xử lý...</>
        ) : isCheckedIn && isCheckedOut ? (
          <>✅ Đã hoàn thành chấm công hôm nay</>
        ) : isCheckedIn ? (
          <>🚪 Chấm công ra</>
        ) : (
          <>✓ Chấm công vào</>
        )}
      </button>
    </div>
  );
}

// Attendance Mini Chart - Simple bar visualization
export function AttendanceChart({ data = [], loading }) {
  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f1f5f9'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  };

  const iconBgStyle = {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={iconBgStyle}>📊</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Giờ làm 7 ngày gần nhất</h3>
        </div>
        <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          Đang tải...
        </div>
      </div>
    );
  }

  const maxHours = Math.max(...data.map(d => d.hours || 0), 10);

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={iconBgStyle}>📊</div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Giờ làm 7 ngày gần nhất</h3>
      </div>

      {data.length === 0 ? (
        <EmptyState message="Chưa có dữ liệu chấm công" icon="📅" />
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
          {data.map((item, idx) => {
            const height = (item.hours / maxHours) * 120;
            const isLate = item.status === 'DI_MUON';
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{item.hours?.toFixed(1) || 0}h</div>
                <div style={{
                  width: '100%',
                  height: height || 4,
                  background: isLate ? 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)' : 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%)',
                  borderRadius: 6,
                  transition: 'height 0.3s ease'
                }} />
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  {new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6' }} />
          Đúng giờ
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }} />
          Đi muộn
        </div>
      </div>
    </div>
  );
}

// Leave Status Widget
export function LeaveStatusWidget({ data = { pending: 0, approved: 0, rejected: 0, remaining: 0 }, loading }) {
  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f1f5f9'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  };

  const iconBgStyle = {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: '#f0fdf4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18
  };

  const items = [
    { label: 'Còn lại', value: data.remaining, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Chờ duyệt', value: data.pending, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Đã duyệt', value: data.approved, color: '#10b981', bg: '#d1fae5' },
    { label: 'Từ chối', value: data.rejected, color: '#ef4444', bg: '#fee2e2' },
  ];

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={iconBgStyle}>📋</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Thống kê nghỉ phép</h3>
        </div>
        <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={iconBgStyle}>📋</div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Thống kê nghỉ phép năm nay</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            background: item.bg,
            padding: 16,
            borderRadius: 12,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 12, color: item.color, fontWeight: 500, marginTop: 4 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Notifications List Component
export function NotificationsList({ notifications = [], loading }) {
  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f1f5f9',
    height: '100%'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  };

  const iconBgStyle = {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={iconBgStyle}>🔔</div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Thông báo</h3>
          </div>
        </div>
        <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={iconBgStyle}>🔔</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Thông báo</h3>
        </div>
        {notifications.length > 0 && (
          <span style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '4px 10px',
            borderRadius: 100,
            fontSize: 12,
            fontWeight: 600
          }}>
            {notifications.filter(n => !n.isRead).length} mới
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState message="Không có thông báo mới" icon="🔔" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.slice(0, 5).map((notif, idx) => (
            <div key={idx} style={{
              display: 'flex',
              gap: 12,
              padding: 12,
              background: notif.isRead ? '#f8fafc' : '#eff6ff',
              borderRadius: 10,
              transition: 'background 0.2s'
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: notif.isRead ? '#e2e8f0' : '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0
              }}>
                {notif.type === 'NGHI_PHEP' ? '📋' : notif.type === 'CHAM_CONG' ? '⏰' : '📢'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: notif.isRead ? 500 : 600,
                  color: '#0f172a',
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {notif.title}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {notif.content}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  {getTimeAgo(notif.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Empty State Component
export function EmptyState({ message, icon }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      color: '#94a3b8'
    }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  );
}

// Quick Action Button
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

// Legacy components for backwards compatibility
export function KPICard({ title, value, icon, color, change }) {
  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb'
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{title}</div>
        <div style={{ color: '#dc2626', fontSize: 16 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{change}</div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const statuses = {
    normal: { label: '✓ Đúng giờ', bg: '#dbeafe', color: '#1e3a8a', border: '#93c5fd' },
    late: { label: '⚠ Đi muộn', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
    early: { label: '⏰ Về sớm', bg: '#e5e7eb', color: '#374151', border: '#d1d5db' }
  }
  const s = statuses[status] || statuses.normal

  return (
    <div style={{
      display: 'inline-block',
      padding: '4px 12px',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 100,
      fontSize: 12,
      fontWeight: 500
    }}>
      {s.label}
    </div>
  )
}

export function LeaveStatusBar({ status }) {
  const statuses = {
    approved: { width: '100%', bg: '#1e3a8a', label: '100% - Đã duyệt' },
    pending: { width: '30%', bg: '#6b7280', label: '30% - Chờ duyệt' },
    rejected: { width: '100%', bg: '#dc2626', label: '100% - Từ chối' }
  }
  const s = statuses[status] || statuses.pending

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: s.width, height: '100%', background: s.bg, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{s.label}</span>
    </div>
  )
}
