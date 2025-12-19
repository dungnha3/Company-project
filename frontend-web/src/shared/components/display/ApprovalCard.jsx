import StatusBadge from './StatusBadge'

export default function ApprovalCard({ 
  title, 
  subtitle, 
  status, 
  details = [], 
  onApprove, 
  onReject,
  showActions = true,
  approving = false,
  rejecting = false
}) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.subtitle}>{subtitle}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div style={styles.details}>
        {details.map((detail, idx) => (
          <div key={idx} style={styles.detailRow}>
            <span style={styles.label}>{detail.label}:</span>
            <span style={styles.value}>{detail.value}</span>
          </div>
        ))}
      </div>

      {showActions && (
        <div style={styles.actions}>
          <button 
            onClick={onReject}
            disabled={rejecting}
            style={{...styles.btn, ...styles.rejectBtn}}
          >
            {rejecting ? '⏳' : '✗'} Từ chối
          </button>
          <button 
            onClick={onApprove}
            disabled={approving}
            style={{...styles.btn, ...styles.approveBtn}}
          >
            {approving ? '⏳' : '✓'} Duyệt
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  details: {
    marginBottom: '16px',
  },
  detailRow: {
    display: 'flex',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#6b7280',
    width: '120px',
  },
  value: {
    fontSize: '13px',
    color: '#111827',
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  btn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  approveBtn: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    color: '#fff',
  }
}
