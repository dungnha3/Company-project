/**
 * Shared Card Component
 * Used across all modules for consistent styling
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div 
      style={{
        background: '#fff', 
        borderRadius: 16, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.02)',
        overflow: 'hidden',
        ...props.style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div 
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid #f0f2f5',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...props.style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }) {
  return (
    <div 
      style={{
        padding: 24,
        ...props.style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 
      style={{
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: '#344767',
        ...props.style
      }}
      className={className}
      {...props}
    >
      {children}
    </h3>
  );
}
