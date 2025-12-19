export default function PageLayout({ title, subtitle, actions, filters, children }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{title}</h1>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div style={styles.actions}>{actions}</div>}
      </div>
      
      {filters && <div style={styles.filters}>{filters}</div>}
      
      <div style={styles.content}>
        {children}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  filters: {
    marginBottom: '20px',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  }
}
