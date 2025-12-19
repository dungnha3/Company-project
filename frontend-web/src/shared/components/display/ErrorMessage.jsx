export default function ErrorMessage({ error, onRetry }) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>⚠️</div>
      <h3 style={styles.title}>Đã xảy ra lỗi</h3>
      <p style={styles.message}>{error}</p>
      {onRetry && (
        <button onClick={onRetry} style={styles.button}>
          🔄 Thử lại
        </button>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px',
  },
  message: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  }
}
