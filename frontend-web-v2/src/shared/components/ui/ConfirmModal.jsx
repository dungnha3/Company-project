/**
 * ConfirmModal — modal xác nhận với 2 variant: danger và default.
 * 
 * @param {boolean} isOpen
 * @param {string} title
 * @param {string} [message]
 * @param {Function} onConfirm
 * @param {Function} onCancel
 * @param {'danger'|'default'} [variant='default']
 * @param {string} [confirmLabel='Confirm']
 * @param {string} [cancelLabel='Cancel']
 * @param {boolean} [loading=false]
 */
export default function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    variant = 'default',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    loading = false,
}) {
    if (!isOpen) return null;

    const confirmBtnClass = variant === 'danger'
        ? 'btn-danger'
        : 'btn-primary';

    const iconClass = variant === 'danger'
        ? 'fa-exclamation-triangle text-red-500'
        : 'fa-question-circle text-indigo-500';

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
            <div className="modal-content max-w-md">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100' : 'bg-indigo-100'
                            }`}>
                            <i className={`fas ${iconClass}`} aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                            <h3 id="confirm-modal-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                {title}
                            </h3>
                            {message && (
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button
                        onClick={onCancel || (() => {})}
                        className="btn-secondary"
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm || (() => {})}
                        className={confirmBtnClass}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                                <span>Processing...</span>
                            </>
                        ) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
