import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const success = useCallback((message) => showToast(message, 'success'), [showToast]);
    const error = useCallback((message) => showToast(message, 'error'), [showToast]);
    const warning = useCallback((message) => showToast(message, 'warning'), [showToast]);
    const info = useCallback((message) => showToast(message, 'info'), [showToast]);

    const value = useMemo(() => ({ showToast, success, error, warning, info }), [showToast, success, error, warning, info]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite" aria-atomic="true">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
              px-4 py-3 rounded-xl shadow-lg text-white min-w-[280px]
              animate-slide-in-right
              ${toast.type === 'success' ? 'bg-green-500' : ''}
              ${toast.type === 'error' ? 'bg-red-500' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-500' : ''}
              ${toast.type === 'info' ? 'bg-indigo-500' : ''}
            `}
                    >
                        <div className="flex items-center gap-2">
                            <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' :
                                toast.type === 'error' ? 'fa-times-circle' :
                                    toast.type === 'warning' ? 'fa-exclamation-triangle' :
                                        'fa-info-circle'
                                }`} />
                            <span>{toast.message}</span>
                        </div>
                    </div>
                ))}
            </div>
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
