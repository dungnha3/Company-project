import { useState } from 'react';
import apiClient from '@shared/api/client';
import { useToast } from '@app/providers/ToastProvider';

/**
 * ExportButton - Shared component for Excel export functionality
 * @param {string} endpoint - API endpoint for export
 * @param {object} params - Query params (month, year, startDate, endDate, etc.)
 * @param {string} filename - Suggested filename for download
 * @param {string} label - Button label (default: "Xuất Excel")
 * @param {string} icon - FontAwesome icon class (default: "fa-file-excel")
 */
export default function ExportButton({
    endpoint,
    params = {},
    filename = 'export.xlsx',
    label = 'Xuất Excel',
    icon = 'fa-file-excel',
    className = ''
}) {
    if (!endpoint) {
        console.warn('[ExportButton] Missing endpoint prop — export disabled');
        return null;
    }
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { showToast } = useToast();

    const handleExport = async () => {
        setLoading(true);
        setSuccess(false);
        try {
            const response = await apiClient.get(endpoint, {
                params,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            setSuccess(true);
            showToast('Xuất file thành công!', 'success');
            setTimeout(() => setSuccess(false), 2000);
        } catch (error) {
            console.error('Export error:', error);
            showToast(error.response?.data?.message || 'Không thể xuất file', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className={`btn-secondary flex items-center gap-2 ${className}`}
        >
            {success ? (
                <i className="fa-solid fa-check text-green-600" />
            ) : loading ? (
                <i className="fa-solid fa-spinner fa-spin" />
            ) : (
                <i className={`fa-solid ${icon} text-green-600`} />
            )}
            {loading ? 'Đang xuất...' : success ? 'Đã xong!' : label}
        </button>
    );
}
