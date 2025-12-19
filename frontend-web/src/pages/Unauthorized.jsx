export default function UnauthorizedPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 24,
        maxWidth: 520,
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.07)'
      }}>
        <div style={{ fontSize: 64 }}>⛔</div>
        <h1 style={{ margin: '12px 0 4px', fontSize: 24 }}>Không có quyền truy cập</h1>
        <p style={{ color: '#64748b', marginBottom: 16 }}>
          Tài khoản của bạn không có quyền truy cập chức năng này. Vui lòng quay lại trang phù hợp với vai trò.
        </p>
        <a href="/" style={{
          display: 'inline-block',
          padding: '10px 16px',
          borderRadius: 8,
          background: '#0ea5e9',
          color: '#ffffff',
          textDecoration: 'none',
          fontWeight: 600
        }}>Quay về trang chủ</a>
      </div>
    </div>
  )
}