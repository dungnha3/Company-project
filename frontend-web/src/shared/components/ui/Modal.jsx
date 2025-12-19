/**
 * Shared Modal Components
 * Consistent modal styling across all modules
 */

export function Modal({ isOpen, onClose, children, size = 'medium', ...props }) {
  if (!isOpen) return null;

  const sizeMap = {
    small: 500,
    medium: 600,
    'medium-large': 700,
    large: 800,
    xlarge: 1000
  };

  const width = sizeMap[size] || sizeMap.medium;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        ...props.style
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#fff',
          borderRadius: 16,
          width: width,
          maxWidth: '95%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          animation: 'fadeIn 0.3s'
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children, onClose, ...props }) {
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
      {...props}
    >
      {children}
      {onClose && (
        <button 
          style={{
            border: 'none',
            background: 'none',
            fontSize: 24,
            color: '#7b809a',
            cursor: 'pointer'
          }}
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function ModalTitle({ children, ...props }) {
  return (
    <h3 
      style={{
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: '#344767',
        ...props.style
      }}
      {...props}
    >
      {children}
    </h3>
  );
}

export function ModalBody({ children, ...props }) {
  return (
    <div 
      style={{
        padding: 24,
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalFooter({ children, ...props }) {
  return (
    <div 
      style={{
        padding: '16px 24px 20px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 12,
        borderTop: '1px solid #f0f2f5',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
