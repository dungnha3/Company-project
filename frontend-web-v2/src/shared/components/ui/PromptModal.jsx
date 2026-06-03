import { useState, useEffect } from 'react';

export default function PromptModal({
    isOpen,
    title,
    placeholder = 'Nhập giá trị...',
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Hủy',
    onConfirm,
    onCancel,
    loading = false,
}) {
    const [value, setValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setValue('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (value.trim()) {
            onConfirm(value.trim());
        }
    };

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
            <div className="modal-content max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <i className="fas fa-folder-plus text-indigo-500" aria-hidden="true" />
                            </div>
                            <div className="flex-1">
                                <h3 id="prompt-modal-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                    {title}
                                </h3>
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors bg-white text-gray-800"
                                        autoFocus
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            onClick={onCancel || (() => {})}
                            className="btn-secondary"
                            disabled={loading}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !value.trim()}
                        >
                            {loading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin mr-1" aria-hidden="true" />
                                    <span>Đang xử lý...</span>
                                </>
                            ) : confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
