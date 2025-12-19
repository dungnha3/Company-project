/**
 * Shared Button Components
 * Consistent button styling across all modules
 */

export function Button({ 
  variant = 'primary', 
  size = 'medium',
  children, 
  className = '', 
  ...props 
}) {
  const baseStyles = {
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    fontSize: 13,
    textTransform: 'uppercase'
  };

  const variants = {
    primary: {
      background: 'linear-gradient(195deg, #42a5f5, #1976d2)',
      color: '#fff',
      boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)'
    },
    secondary: {
      background: '#f0f2f5',
      color: '#7b809a',
      border: '1px solid #d2d6da'
    },
    success: {
      background: 'linear-gradient(195deg, #66bb6a, #43a047)',
      color: '#fff',
      boxShadow: '0 4px 6px rgba(67, 160, 71, 0.2)'
    },
    danger: {
      background: 'linear-gradient(195deg, #ef5350, #d32f2f)',
      color: '#fff',
      boxShadow: '0 4px 6px rgba(211, 47, 47, 0.2)'
    },
    warning: {
      background: 'linear-gradient(195deg, #fb8c00, #ffa726)',
      color: '#fff',
      boxShadow: '0 4px 6px rgba(251, 140, 0, 0.2)'
    }
  };

  const sizes = {
    small: { padding: '6px 12px', fontSize: 11 },
    medium: { padding: '10px 20px', fontSize: 13 },
    large: { padding: '12px 24px', fontSize: 14 }
  };

  return (
    <button
      style={{
        ...baseStyles,
        ...variants[variant],
        ...sizes[size],
        ...props.style
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ children, title, ...props }) {
  return (
    <button
      style={{
        border: 'none',
        background: '#f8f9fa',
        borderRadius: 8,
        width: 32,
        height: 32,
        cursor: 'pointer',
        fontSize: 16,
        color: '#344767',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        ...props.style
      }}
      title={title}
      {...props}
    >
      {children}
    </button>
  );
}
