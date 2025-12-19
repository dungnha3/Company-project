/**
 * Shared State Components
 * Loading, Error, Empty states across all modules
 */

export function LoadingState({ message = "Đang tải dữ liệu...", ...props }) {
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        padding: '60px 20px',
        textAlign: 'center',
        ...props.style
      }}
      {...props}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <div style={{ fontSize: 16, color: '#7b809a' }}>{message}</div>
    </div>
  );
}

export function ErrorState({ 
  message = "Đã có lỗi xảy ra", 
  onRetry, 
  retryText = "Thử lại",
  ...props 
}) {
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        padding: '60px 20px',
        textAlign: 'center',
        ...props.style
      }}
      {...props}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
      <div style={{ fontSize: 16, color: '#ef4444', marginBottom: 20 }}>{message}</div>
      {onRetry && (
        <button 
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={onRetry}
        >
          {retryText}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ 
  icon = "📋", 
  title = "Không có dữ liệu", 
  message = "Chưa có dữ liệu để hiển thị",
  action,
  ...props 
}) {
  return (
    <div 
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#7b809a',
        ...props.style
      }}
      {...props}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ 
        fontSize: 18, 
        fontWeight: 600, 
        marginBottom: 8, 
        color: '#344767' 
      }}>
        {title}
      </div>
      <div style={{ fontSize: 14, marginBottom: 20 }}>{message}</div>
      {action}
    </div>
  );
}

export function PermissionDenied({ 
  message = "Không có quyền truy cập",
  description = "Bạn không có quyền truy cập tính năng này",
  ...props 
}) {
  return (
    <div 
      style={{
        padding: '40px',
        textAlign: 'center',
        ...props.style
      }}
      {...props}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
      <div style={{ 
        fontSize: '20px', 
        fontWeight: '600', 
        color: '#ef4444',
        marginBottom: '8px'
      }}>
        {message}
      </div>
      <div style={{ fontSize: '14px', color: '#6b7280' }}>
        {description}
      </div>
    </div>
  );
}
