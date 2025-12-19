export default function EmptyState({ icon = '📭', title = 'Không có dữ liệu', message = 'Chưa có dữ liệu để hiển thị' }) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>{icon}</div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.message}>{message}</p>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.6,
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  message: {
    fontSize: '14px',
    color: '#9ca3af',
  }
}
