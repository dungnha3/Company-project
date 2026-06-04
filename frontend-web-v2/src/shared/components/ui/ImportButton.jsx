import { useState, useRef, useEffect } from 'react';
import apiClient from '@shared/api/client';
import { useToast } from '@app/providers/ToastProvider';

/**
 * ImportButton - Shared component for Excel import with template download + smart confirm
 * @param {string} endpoint - API endpoint for import
 * @param {string} templateEndpoint - API endpoint to download blank template
 * @param {string} templateFilename - Filename for template download
 * @param {string} label - Button label (default: "Nhập Excel")
 * @param {string} accept - File type filter (default: ".xlsx,.xls")
 * @param {function} onSuccess - Callback on success import (triggers page refresh)
 * @param {function} onError - Callback on error
 * @param {string} className - Additional CSS classes
 * @param {boolean} confirmRequired - Show confirm modal (default: true for first time, false after)
 */
export default function ImportButton({
    endpoint,
    templateEndpoint,
    templateFilename = 'template.xlsx',
    label = 'Nhập Excel',
    accept = '.xlsx,.xls',
    onSuccess,
    onError,
    className = '',
    confirmRequired = true,
}) {
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [errors, setErrors] = useState([]);
    const fileInputRef = useRef(null);
    const { showToast } = useToast();

    // No-confirm mode: remember user already imported once in this session
    const hasConfirmedRef = useRef(false);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirmRequired || hasConfirmedRef.current) {
            // Skip confirm, import directly
            uploadFile(file);
        } else {
            // Show confirm dialog
            setShowConfirm(true);
            setImportResult({ file });
            setErrors([]);
        }

        e.target.value = '';
    };

    const uploadFile = async (file) => {
        setLoading(true);
        setShowConfirm(false);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiClient.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const data = response.data;

            if (data.successCount > 0) {
                showToast(
                    `Đã nhập thành công ${data.successCount} bản ghi${data.errorCount > 0 ? `, ${data.errorCount} lỗi` : ''}`,
                    data.errorCount > 0 ? 'warning' : 'success'
                );
                if (data.errors?.length > 0) {
                    setErrors(data.errors.slice(0, 5));
                }
                hasConfirmedRef.current = true;
            } else {
                showToast(`Nhập thất bại: ${data.errors?.[0] || 'Không có bản ghi nào được nhập'}`, 'error');
                setErrors(data.errors || []);
            }

            if (onSuccess) onSuccess(data);

        } catch (error) {
            const message = error.response?.data?.message || error.response?.data?.error || 'Không thể nhập file';
            showToast(message, 'error');
            if (onError) onError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = () => {
        if (importResult?.file) {
            uploadFile(importResult.file);
        }
    };

    const handleCancel = () => {
        setShowConfirm(false);
        setImportResult(null);
        setErrors([]);
    };

    const handleDownloadTemplate = async () => {
        if (!templateEndpoint) return;

        setDownloading(true);
        try {
            const response = await apiClient.get(templateEndpoint, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = templateFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('Đã tải template', 'success');
        } catch (e) {
            showToast('Không thể tải template', 'error');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                {templateEndpoint && (
                    <button
                        onClick={handleDownloadTemplate}
                        disabled={downloading}
                        className="px-4 py-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-100 bg-white rounded-lg transition-all flex items-center gap-2 font-medium"
                        title="Tải file mẫu"
                    >
                        {downloading ? (
                            <i className="fa-solid fa-spinner fa-spin text-xs" />
                        ) : (
                            <i className="fa-solid fa-file-arrow-down text-green-600 text-xs" />
                        )}
                        Template
                    </button>
                )}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className={`btn-secondary flex items-center gap-2 ${className}`}
                >
                    {loading ? (
                        <i className="fa-solid fa-spinner fa-spin" />
                    ) : (
                        <i className="fa-solid fa-upload text-blue-600" />
                    )}
                    {loading ? 'Đang nhập...' : label}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                            <h3 className="text-lg font-semibold text-blue-900">
                                <i className="fa-solid fa-file-import mr-2" />
                                Xác nhận nhập dữ liệu
                            </h3>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-file-excel text-2xl text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{importResult?.file?.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(importResult?.file?.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-amber-800">
                                    <i className="fa-solid fa-triangle-exclamation mr-1" />
                                    <strong>Lưu ý:</strong> Dữ liệu từ file Excel sẽ được tạo mới vào hệ thống. Hãy kiểm tra kỹ file trước khi nhập.
                                </p>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">
                                Bạn có chắc chắn muốn nhập dữ liệu từ file này không?
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-upload" />
                                    Nhập dữ liệu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error summary toast - shown if there were some failures */}
            {errors.length > 0 && (
                <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white border border-red-200 rounded-xl shadow-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-triangle-exclamation text-red-600 text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{errors.length} lỗi khi nhập</p>
                            <ul className="mt-1 text-xs text-gray-600 space-y-0.5 max-h-24 overflow-y-auto">
                                {errors.map((err, i) => (
                                    <li key={i} className="break-words">• {err}</li>
                                ))}
                            </ul>
                            {errors.length > 5 && (
                                <p className="mt-1 text-xs text-gray-400">...và {errors.length - 5} lỗi khác</p>
                            )}
                        </div>
                        <button
                            onClick={() => setErrors([])}
                            className="text-gray-400 hover:text-gray-600 shrink-0"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
