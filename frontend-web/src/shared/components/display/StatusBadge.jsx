export default function StatusBadge({ status }) {
  const config = {
    success: { label: 'Hoàn thành', bg: '#d1fae5', color: '#065f46' },
    pending: { label: 'Chờ xử lý', bg: '#fef3c7', color: '#92400e' },
    approved: { label: 'Đã duyệt', bg: '#d1fae5', color: '#065f46' },
    rejected: { label: 'Từ chối', bg: '#fee2e2', color: '#991b1b' },
    error: { label: 'Lỗi', bg: '#fee2e2', color: '#991b1b' },
    warning: { label: 'Cảnh báo', bg: '#fed7aa', color: '#9a3412' },
    info: { label: 'Thông tin', bg: '#dbeafe', color: '#1e40af' },
    active: { label: 'Hoạt động', bg: '#d1fae5', color: '#065f46' },
    inactive: { label: 'Không hoạt động', bg: '#f3f4f6', color: '#4b5563' },
  }

  const { label, bg, color } = config[status] || config.info

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: bg,
      color: color,
    }}>
      {label}
    </span>
  )
}
