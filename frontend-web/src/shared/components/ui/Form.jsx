/**
 * Shared Form Components
 * Consistent form styling across all modules
 */

export function FormGroup({ children, className = '', ...props }) {
  return (
    <div 
      style={{
        marginBottom: 16,
        ...props.style
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

export function FormLabel({ children, required = false, ...props }) {
  return (
    <label 
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#344767',
        marginBottom: 8,
        display: 'block',
        ...props.style
      }}
      {...props}
    >
      {children}
      {required && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
    </label>
  );
}

export function FormInput({ error, ...props }) {
  return (
    <input 
      style={{
        width: '100%',
        padding: 12,
        border: `1px solid ${error ? '#ef4444' : '#d2d6da'}`,
        borderRadius: 8,
        outline: 'none',
        fontSize: 14,
        boxSizing: 'border-box',
        color: '#344767',
        background: '#fff',
        transition: 'border-color 0.2s',
        ...props.style
      }}
      {...props}
    />
  );
}

export function FormSelect({ error, children, ...props }) {
  return (
    <select 
      style={{
        width: '100%',
        padding: 12,
        border: `1px solid ${error ? '#ef4444' : '#d2d6da'}`,
        borderRadius: 8,
        outline: 'none',
        fontSize: 14,
        boxSizing: 'border-box',
        color: '#344767',
        background: '#fff',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        ...props.style
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function FormTextarea({ error, ...props }) {
  return (
    <textarea 
      style={{
        width: '100%',
        padding: 12,
        border: `1px solid ${error ? '#ef4444' : '#d2d6da'}`,
        borderRadius: 8,
        outline: 'none',
        fontSize: 14,
        boxSizing: 'border-box',
        color: '#344767',
        background: '#fff',
        minHeight: 80,
        resize: 'vertical',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s',
        ...props.style
      }}
      {...props}
    />
  );
}

export function FormError({ children, ...props }) {
  if (!children) return null;
  
  return (
    <div 
      style={{
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
