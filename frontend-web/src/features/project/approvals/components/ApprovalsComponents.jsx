export const ApprovalStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { bg: '#fef3c7', color: '#92400e', text: 'Chờ duyệt' },
    approved: { bg: '#dcfce7', color: '#166534', text: 'Đã duyệt' },
    rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Từ chối' },
  }
  
  const config = statusConfig[status] || statusConfig.pending
  
  return (
    <span style={{
      display: 'inline-block',
      padding: '6px 16px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: config.bg,
      color: config.color,
    }}>
      {config.text}
    </span>
  )
}
