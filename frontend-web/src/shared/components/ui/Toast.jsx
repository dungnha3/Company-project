import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ============================================
// TOAST CONTEXT & PROVIDER
// ============================================
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

// ============================================
// TOAST CONTAINER - Fixed position top-right
// ============================================
export function ToastContainer({ toasts, onRemove }) {
    return (
        <div style={styles.container}>
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
            ))}
        </div>
    );
}

// ============================================
// INDIVIDUAL TOAST COMPONENT
// ============================================
function ToastItem({ toast, onRemove }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation on mount
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    const config = toastConfig[toast.type] || toastConfig.info;

    return (
        <div
            style={{
                ...styles.toast,
                background: config.background,
                borderLeft: `4px solid ${config.borderColor}`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
            }}
        >
            <div style={{ ...styles.icon, color: config.iconColor }}>
                {config.icon}
            </div>
            <div style={styles.content}>
                <div style={{ ...styles.title, color: config.titleColor }}>{config.title}</div>
                <div style={styles.message}>{toast.message}</div>
            </div>
            <button style={styles.closeBtn} onClick={onRemove}>
                ×
            </button>
        </div>
    );
}

// ============================================
// TOAST CONFIGURATION - Icons, Colors...
// ============================================
const toastConfig = {
    success: {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        ),
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        borderColor: '#10b981',
        iconColor: '#10b981',
        titleColor: '#065f46',
        title: 'Thành công',
    },
    error: {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
        ),
        background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
        borderColor: '#ef4444',
        iconColor: '#ef4444',
        titleColor: '#991b1b',
        title: 'Lỗi',
    },
    warning: {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
        borderColor: '#f59e0b',
        iconColor: '#f59e0b',
        titleColor: '#92400e',
        title: 'Cảnh báo',
    },
    info: {
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        ),
        background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
        borderColor: '#3b82f6',
        iconColor: '#3b82f6',
        titleColor: '#1e40af',
        title: 'Thông tin',
    },
};

// ============================================
// STYLES
// ============================================
const styles = {
    container: {
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 380,
        pointerEvents: 'none',
    },
    toast: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'auto',
        backdropFilter: 'blur(10px)',
        minWidth: 300,
    },
    icon: {
        flexShrink: 0,
        marginTop: 2,
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 4,
    },
    message: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 1.4,
        wordBreak: 'break-word',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: 20,
        color: '#94a3b8',
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1,
        marginLeft: 8,
        transition: 'color 0.2s',
    },
};
