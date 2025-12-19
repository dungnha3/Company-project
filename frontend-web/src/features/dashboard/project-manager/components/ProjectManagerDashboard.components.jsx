import React from 'react';

// Navigation Item Component
export function NavItem({ active, onClick, children, icon, collapsed }) {
  return (
    <div
      className={`menu-item ${active ? 'active' : ''}`}
      onClick={onClick}
      title={collapsed ? children : ''}
    >
      <i className={icon.includes('fa-') ? icon : 'fa-solid fa-circle'}></i>
      <span>{children}</span>
    </div>
  )
}

// Role Badge Component with Avatar
export function RoleBadge({ role, avatarUrl }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="header-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{role.charAt(0)}</span>
        )}
      </div>
    </div>
  )
}

// Modern Stat Card Component
export function StatCard({ title, value, subtext, icon, accentColor, onClick, loading = false, highlight = false }) {

  if (loading) {
    return (
      <div className="card stat-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div style={{ color: 'var(--text-light)' }}>Đang tải...</div>
        </div>
      </div>
    );
  }

  // Determine bg class based on accentColor hint (simplified mapping)
  let bgClass = 'bg-blue';

  if (accentColor === '#10b981') bgClass = 'bg-green';
  else if (accentColor === '#f59e0b') bgClass = 'bg-yellow';
  else if (accentColor === '#ef4444') bgClass = 'bg-red';
  else if (accentColor === '#8b5cf6') bgClass = 'bg-purple';

  return (
    <div className="card stat-card" onClick={onClick}>
      <div className="stat-header">
        <div className={`stat-icon ${bgClass}`}>
          {icon.startsWith('fa') ? <i className={icon}></i> : icon}
        </div>
        {highlight && <span className="badge text-red">Cần xử lý</span>}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{title}</div>
        {subtext && <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 4 }}>{subtext}</div>}
      </div>
    </div>
  );
}

// Project Stats Card
export function ProjectStatsCard({ projects = [], loading = false, onViewAll }) {
  if (loading) return <div className="card">Đang tải tiến độ...</div>;

  if (!projects.length) {
    return (
      <div className="card" style={{ minHeight: 300 }}>
        <h3>Tiến độ dự án</h3>
        <div style={{ textAlign: 'center', color: 'var(--text-light)', marginTop: 50 }}>
          Chưa có dự án nào
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Tiến độ dự án</h3>
        {onViewAll && (
          <span className="view-all-link" onClick={onViewAll}>
            Xem tất cả
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {projects.slice(0, 4).map((project, idx) => {
          const completionRate = project.totalIssues > 0
            ? Math.round((project.completedIssues / project.totalIssues) * 100)
            : 0;

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                <span>{project.projectName || project.name}</span>
                <span style={{ color: 'var(--primary-color)' }}>{completionRate}%</span>
              </div>
              {/* FIXED: inner div used background causing conflict, changed to backgroundColor */}
              <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${completionRate}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))',
                  borderRadius: 10
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}

// Helper to get initials
const getInitials = (name) => {
  if (!name) return 'NV';
  return name.split(' ').map(n => n[0]).join('').slice(-2).toUpperCase();
}

// Helper to format leave type
const formatLeaveType = (type) => {
  const types = {
    'PHEP_NAM': 'Phép năm',
    'OM': 'Nghỉ ốm',
    'KHAC': 'Lý do khác',
    'KO_LUONG': 'Không lương',
    'THAI_SAN': 'Thai sản',
    'CUOI_HOI': 'Cưới hỏi',
    'CONG_TAC': 'Công tác'
  };
  return types[type] || type || 'Nghỉ phép';
};

// Pending Approvals Widget - REDESIGNED
export function PendingApprovalsWidget({ leaves = [], loading = false, onApprove, onReject, onViewAll }) {
  if (loading) return <div className="card">Đang tải đơn từ...</div>;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Đơn chờ duyệt</h3>
          {leaves.length > 0 && <span className="badge text-red">{leaves.length}</span>}
        </div>
        {onViewAll && (
          <span className="view-all-link" onClick={onViewAll}>
            Quản lý
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {leaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-light)' }}>
            <i className="fa-solid fa-clipboard-check" style={{ fontSize: 40, marginBottom: 10, opacity: 0.5 }}></i>
            <div>Không có đơn nào cần duyệt</div>
          </div>
        ) : (
          // REDUCED TO 4 ITEMS TO BALANCE LAYOUT
          leaves.slice(0, 4).map((leave, idx) => (
            <div key={idx} className="approval-item">
              {/* Left: Avatar & Info */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                <div className="approval-avatar bg-blue">
                  {getInitials(leave.hoTenNhanVien)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div className="approval-name">
                    {leave.hoTenNhanVien || 'Chưa cập nhật tên'}
                  </div>
                  <div className="approval-meta">
                    {formatLeaveType(leave.loaiPhep || leave.loaiNghiPhep)} • {new Date(leave.ngayBatDau).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="approval-actions">
                <button
                  className="approval-btn approve"
                  onClick={(e) => { e.stopPropagation(); onApprove(leave.nghiphepId); }}
                  title="Duyệt đơn này"
                >
                  <i className="fa-solid fa-check"></i> Duyệt
                </button>
                <button
                  className="approval-btn reject"
                  onClick={(e) => { e.stopPropagation(); onReject(leave.nghiphepId); }}
                  title="Từ chối đơn này"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Quick Action Button
export function QuickActionButton({ icon, label, onClick, color }) {
  let iconClass = 'bg-blue';
  if (color === '#10b981') iconClass = 'bg-green';
  if (color === '#f59e0b') iconClass = 'bg-yellow';
  if (color === '#8b5cf6') iconClass = 'bg-purple';

  return (
    <div className="quick-action-btn" onClick={onClick}>
      <div className={`quick-action-icon ${iconClass}`} style={{ color: 'white' }}>
        {icon.startsWith('fa') ? <i className={icon}></i> : icon}
      </div>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>{label}</span>
    </div>
  )
}
