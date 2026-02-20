import { useState, useRef, useEffect } from 'react';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';

/**
 * Export Dropdown Button for Project Data
 * Provides CSV export for Issues and Gantt data
 */
export default function ExportDropdown({ projectId, projectName }) {
    const [isOpen, setIsOpen] = useState(false);
    const [exporting, setExporting] = useState(null);
    const dropdownRef = useRef(null);
    const toast = useToast();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const downloadFile = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleExport = async (type) => {
        setExporting(type);
        try {
            const endpoint = type === 'issues'
                ? ENDPOINTS.PROJECT_EXPORT.ISSUES_CSV(projectId)
                : ENDPOINTS.PROJECT_EXPORT.GANTT_CSV(projectId);

            const response = await apiClient.get(endpoint, { responseType: 'blob' });
            const filename = type === 'issues'
                ? `Issues_${projectName || projectId}_${new Date().toISOString().split('T')[0]}.csv`
                : `Gantt_${projectName || projectId}_${new Date().toISOString().split('T')[0]}.csv`;

            downloadFile(response.data, filename);
            toast.success(`Đã xuất ${type === 'issues' ? 'Issues' : 'Gantt'} thành công!`);
            setIsOpen(false);
        } catch (error) {
            toast.error('Lỗi xuất file: ' + (error.response?.data?.message || error.message));
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
                <i className="fa-solid fa-download" />
                Export
                <i className={`fa-solid fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Export Data
                    </div>
                    <button
                        onClick={() => handleExport('issues')}
                        disabled={exporting === 'issues'}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                    >
                        <i className="fa-solid fa-list-check text-indigo-500 w-5" />
                        <div>
                            <div className="font-medium">Export Issues (CSV)</div>
                            <div className="text-xs text-gray-400">Tất cả issues trong dự án</div>
                        </div>
                        {exporting === 'issues' && <i className="fa-solid fa-spinner fa-spin ml-auto" />}
                    </button>
                    <button
                        onClick={() => handleExport('gantt')}
                        disabled={exporting === 'gantt'}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
                    >
                        <i className="fa-solid fa-timeline text-green-500 w-5" />
                        <div>
                            <div className="font-medium">Export Gantt (CSV)</div>
                            <div className="text-xs text-gray-400">Dữ liệu timeline dự án</div>
                        </div>
                        {exporting === 'gantt' && <i className="fa-solid fa-spinner fa-spin ml-auto" />}
                    </button>
                    <div className="border-t border-gray-100 my-2" />
                    <div className="px-4 py-1.5 text-xs text-gray-400">
                        <i className="fa-solid fa-info-circle mr-1" />
                        File CSV có thể mở bằng Excel
                    </div>
                </div>
            )}
        </div>
    );
}
