export const LeaveStatusBar = ({ status }) => {
  const statusConfig = {
    approved: { bg: '#dcfce7', color: '#166534', text: 'Đã duyệt' },
    pending: { bg: '#fef3c7', color: '#92400e', text: 'Chờ duyệt' },
    rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Từ chối' },
  }
  
  const config = statusConfig[status] || statusConfig.pending
  
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: config.bg,
      color: config.color,
    }}>
      {config.text}
    </span>
  )
}
