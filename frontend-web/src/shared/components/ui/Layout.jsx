/**
 * Shared Layout Components
 * Consistent page layout across all modules
 */

export function PageContainer({ children, maxWidth = '1200px', ...props }) {
  return (
    <div 
      style={{
        padding: '24px 32px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#344767',
        maxWidth: maxWidth,
        margin: '0 auto',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function PageHeader({ children, ...props }) {
  return (
    <div 
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 24,
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function PageTitle({ children, ...props }) {
  return (
    <h1 
      style={{
        fontSize: 28,
        fontWeight: 700,
        margin: 0,
        color: '#344767',
        ...props.style
      }}
      {...props}
    >
      {children}
    </h1>
  );
}

export function PageSubtitle({ children, ...props }) {
  return (
    <p 
      style={{
        fontSize: 14,
        color: '#7b809a',
        marginTop: 4,
        margin: 0,
        ...props.style
      }}
      {...props}
    >
      {children}
    </p>
  );
}

export function Breadcrumb({ children, ...props }) {
  return (
    <div 
      style={{
        fontSize: 13,
        color: '#7b809a',
        marginBottom: 6,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function FilterBar({ children, ...props }) {
  return (
    <div 
      style={{
        display: 'flex',
        gap: 16,
        marginBottom: 24,
        background: '#fff',
        padding: 16,
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        alignItems: 'center',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function SearchInput({ placeholder = "Tìm kiếm...", ...props }) {
  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 12, color: '#7b809a' }}>🔍</span>
      <input 
        style={{
          width: '100%',
          padding: '12px 12px 12px 40px',
          border: '1px solid #d2d6da',
          borderRadius: 8,
          outline: 'none',
          fontSize: 14,
          background: '#fff',
          color: '#344767',
          boxSizing: 'border-box',
          transition: 'all 0.2s',
          ...props.style
        }}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
}
