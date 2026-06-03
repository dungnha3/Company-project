import { useState, useRef, useMemo, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDateTime } from '@shared/utils/formatters';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import PromptModal from '@shared/components/ui/PromptModal';
import IssueDetailModal from '@pages/projects/components/IssueDetailModal';

// ─── IssuePreviewModal — defined OUTSIDE ProjectStorageTab to obey Rules of Hooks ───
function IssuePreviewModal({ issueId, projectId, onClose }) {
    const { data: issue, isLoading } = useQuery({
        queryKey: ['issue', issueId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUES.BY_ID(issueId));
            return res.data;
        },
        enabled: !!issueId,
    });

    if (isLoading || !issue) {
        return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl px-8 py-6 shadow-xl">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-indigo-500" />
                </div>
            </div>
        );
    }
    return <IssueDetailModal issue={issue} onClose={onClose} />;
}

// ─── Main component ───────────────────────────────────────────────────────────────
export default function ProjectStorageTab({ projectId, issueId: initialIssueId }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [currentFolderPath, setCurrentFolderPath] = useState('');
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [selectedIssueId, setSelectedIssueId] = useState(initialIssueId || null);
    const [previewIssue, setPreviewIssue] = useState(null); // { issueId, projectId }
    const { hasPermission } = useAccessControl();
    const canUpload = hasPermission('STORAGE.UPLOAD');
    const canDelete = hasPermission('STORAGE.DELETE');

    // ── Queries (all unconditionally — drive status check is just a guard) ──

    // Drive connection status
    const { data: driveStatus } = useQuery({
        queryKey: ['driveStatus'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.STATUS)).data,
    });

    // Project issues for the filter dropdown
    const { data: projectIssues = [] } = useQuery({
        queryKey: ['projectIssues', projectId],
        queryFn: async () => {
            const res = (await apiClient.get(ENDPOINTS.ISSUES.BY_PROJECT(projectId))).data;
            return Array.isArray(res) ? res : (res?.content || []);
        },
        enabled: !!projectId,
        staleTime: 30000,
    });

    // All project files
    const { data: files = [], isLoading } = useQuery({
        queryKey: ['projectFiles', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.PROJECT_FILES(projectId))).data,
        enabled: !!projectId,
    });

    // ── Filtered + sorted items ────────────────────────────────────────────────

    const sortedItems = useMemo(() => {
        const filtered = files.filter(file => {
            if (selectedIssueId && file.issueId !== selectedIssueId) return false;
            const fileFolder = file.folder || '';
            return fileFolder === currentFolderPath;
        });
        return [...filtered].sort((a, b) => {
            const isFolderA = a.contentType === 'folder';
            const isFolderB = b.contentType === 'folder';
            if (isFolderA && !isFolderB) return -1;
            if (!isFolderA && isFolderB) return 1;
            return (a.fileName || '').localeCompare(b.fileName || '');
        });
    }, [files, currentFolderPath, selectedIssueId]);

    // ── Mutations ────────────────────────────────────────────────────────────────

    const uploadMutation = useMutation({
        mutationFn: async ({ file, issueId }) => {
            const formData = new FormData();
            formData.append('file', file);
            const params = new URLSearchParams();
            if (currentFolderPath) params.append('folder', currentFolderPath);
            if (issueId) params.append('issueId', String(issueId));
            const queryString = params.toString();
            const url = ENDPOINTS.STORAGE.UPLOAD_PROJECT_FILE(projectId)
                + (queryString ? '?' + queryString : '');
            await apiClient.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onMutate: () => setUploading(true),
        onSettled: () => setUploading(false),
        onSuccess: () => {
            toast.success('Tải lên thành công');
            queryClient.invalidateQueries(['projectFiles', projectId]);
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Lỗi khi tải file lên'),
    });

    const createFolderMutation = useMutation({
        mutationFn: async ({ folderName, issueId }) => {
            const params = new URLSearchParams();
            params.append('name', folderName);
            if (currentFolderPath) params.append('folder', currentFolderPath);
            if (issueId) params.append('issueId', String(issueId));
            await apiClient.post(ENDPOINTS.STORAGE.PROJECT_FOLDERS(projectId), null, {
                params: Object.fromEntries(params.entries()),
            });
        },
        onSuccess: () => {
            toast.success('Đã tạo thư mục');
            queryClient.invalidateQueries(['projectFiles', projectId]);
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Lỗi khi tạo thư mục'),
    });

    const deleteMutation = useMutation({
        mutationFn: async (fileId) => {
            await apiClient.delete(ENDPOINTS.STORAGE.DELETE_FILE(fileId));
        },
        onSuccess: () => {
            toast.success('Đã xóa thành công');
            queryClient.invalidateQueries(['projectFiles', projectId]);
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Không thể thực hiện xóa'),
    });

    // ── Event handlers ──────────────────────────────────────────────────────────

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) uploadMutation.mutate({ file, issueId: selectedIssueId });
    };

    const handleCreateFolder = () => setShowFolderModal(true);

    const handleFolderModalConfirm = (folderName) => {
        if (!folderName) return;
        const trimmed = folderName.trim();
        if (trimmed.includes('/') || trimmed.includes('\\')) {
            toast.error('Tên thư mục không được chứa ký tự gạch chéo');
            return;
        }
        const isDuplicate = sortedItems.some(
            item => item.contentType === 'folder'
                && (item.fileName || '').toLowerCase() === trimmed.toLowerCase()
        );
        if (isDuplicate) {
            toast.error('Thư mục này đã tồn tại');
            return;
        }
        createFolderMutation.mutate({ folderName: trimmed, issueId: selectedIssueId });
        setShowFolderModal(false);
    };

    const handleItemClick = (item) => {
        if (item.contentType === 'folder') {
            const nextPath = currentFolderPath
                ? `${currentFolderPath}/${item.fileName}`
                : item.fileName;
            setCurrentFolderPath(nextPath);
        }
    };

    const handleBreadcrumbClick = (index) => {
        if (index === -1) {
            setCurrentFolderPath('');
        } else {
            const parts = currentFolderPath.split('/');
            setCurrentFolderPath(parts.slice(0, index + 1).join('/'));
        }
    };

    const handleDownload = (file) => {
        apiClient.get(ENDPOINTS.STORAGE.DOWNLOAD_FILE(file.id), { responseType: 'blob' })
            .then(res => {
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement('a');
                a.href = url;
                a.download = file.fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(() => toast.error('Lỗi khi tải xuống file'));
    };

    // ── Helpers ────────────────────────────────────────────────────────────────

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function getFileIcon(contentType, fileName) {
        if (contentType === 'folder') return 'fa-folder text-amber-500 text-xl';
        const ext = (fileName || '').split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return 'fa-file-pdf text-rose-500 text-lg';
            case 'doc': case 'docx': return 'fa-file-word text-blue-500 text-lg';
            case 'xls': case 'xlsx': return 'fa-file-excel text-emerald-600 text-lg';
            case 'ppt': case 'pptx': return 'fa-file-powerpoint text-orange-500 text-lg';
            case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return 'fa-file-image text-violet-500 text-lg';
            case 'zip': case 'rar': case '7z': return 'fa-file-zipper text-amber-600 text-lg';
            case 'txt': return 'fa-file-lines text-slate-500 text-lg';
            default: return 'fa-file text-gray-400 text-lg';
        }
    }

    const breadcrumbParts = currentFolderPath ? currentFolderPath.split('/') : [];
    const isDriveConnected = driveStatus?.connected;

    return (
        <Fragment>
        <div className="card p-6 min-h-[520px] bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Tài liệu dự án</h2>
                    {!isDriveConnected ? (
                        <p className="text-xs text-red-400 mt-0.5">Chưa kết nối Google Drive</p>
                    ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Lưu trữ bảo mật tích hợp Google Drive Cloud</p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Issue filter */}
                    <select
                        value={selectedIssueId || ''}
                        onChange={e => setSelectedIssueId(e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                    >
                        <option value="">Tất cả tài liệu</option>
                        {projectIssues.map(issue => (
                            <option key={issue.issueId} value={issue.issueId}>
                                {issue.issueKey}: {(issue.title || '').substring(0, 30)}{(issue.title || '').length > 30 ? '...' : ''}
                            </option>
                        ))}
                    </select>

                    {canUpload && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCreateFolder}
                            disabled={!isDriveConnected}
                            className="px-4 py-2 border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <i className="fa-solid fa-folder-plus text-amber-500" />
                            Tạo thư mục
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || !isDriveConnected}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {uploading ? (
                                <><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</>
                            ) : (
                                <><i className="fa-solid fa-cloud-arrow-up" /> Tải lên File</>
                            )}
                        </button>
                    </div>
                    )}
                </div>
            </div>

            {/* Not connected banner */}
            {!isDriveConnected && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-3">
                    <i className="fa-solid fa-triangle-exclamation shrink-0" />
                    <span>Google Drive chưa được kết nối. Vui lòng kết nối trong phần <strong>Cài đặt Công ty</strong> để sử dụng tính năng lưu trữ.</span>
                </div>
            )}

            {/* Breadcrumb navigation */}
            {currentFolderPath && (
                <div className="flex items-center gap-2 mb-4 bg-gray-50/50 px-4 py-2.5 rounded-xl border border-gray-100 text-sm overflow-x-auto custom-scrollbar">
                    <button
                        onClick={() => handleBreadcrumbClick(-1)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                        <i className="fa-solid fa-house text-xs" />
                        Gốc
                    </button>
                    {breadcrumbParts.map((part, idx) => (
                        <div key={idx} className="flex items-center gap-2 shrink-0">
                            <i className="fa-solid fa-chevron-right text-gray-300 text-[10px]" />
                            <button
                                onClick={() => handleBreadcrumbClick(idx)}
                                className={`font-semibold transition-colors ${
                                    idx === breadcrumbParts.length - 1
                                        ? 'text-gray-700 cursor-default'
                                        : 'text-indigo-600 hover:text-indigo-800'
                                }`}
                            >
                                {part}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                    <div className="loading-spinner" />
                </div>
            ) : sortedItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-300 shadow-sm border border-gray-100 mb-3">
                        <i className="fa-solid fa-folder-open text-2xl" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Thư mục trống</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {isDriveConnected
                            ? 'Hãy tải file lên hoặc tạo các thư mục con.'
                            : 'Kết nối Google Drive để bắt đầu sử dụng.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/40">
                                <th className="px-4 py-3 font-semibold rounded-l-lg">Tên</th>
                                <th className="px-4 py-3 font-semibold">Issue liên kết</th>
                                <th className="px-4 py-3 font-semibold">Kích thước</th>
                                <th className="px-4 py-3 font-semibold">Người đăng</th>
                                <th className="px-4 py-3 font-semibold">Thời gian tải</th>
                                <th className="px-4 py-3 font-semibold rounded-r-lg text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sortedItems.map(item => {
                                const isFolder = item.contentType === 'folder';
                                return (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-indigo-50/20 group transition-all duration-200"
                                    >
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <i className={`fa-solid ${getFileIcon(item.contentType, item.fileName)} shrink-0`} />
                                                {isFolder ? (
                                                    <button
                                                        onClick={() => handleItemClick(item)}
                                                        className="font-semibold text-indigo-600 hover:text-indigo-800 text-left transition-colors truncate max-w-xs sm:max-w-md block"
                                                    >
                                                        {item.fileName}
                                                    </button>
                                                ) : (
                                                    <span className="font-semibold text-gray-800 truncate max-w-xs sm:max-w-md block">
                                                        {item.fileName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {item.issueId ? (
                                                <button
                                                    onClick={() => setPreviewIssue({ issueId: item.issueId, projectId })}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 text-xs font-semibold transition-colors max-w-xs"
                                                    title={item.issueTitle || ''}
                                                >
                                                    <i className="fa-solid fa-list-check text-[10px]" />
                                                    <span>{item.issueKey || `#${item.issueId}`}</span>
                                                    {item.issueTitle && (
                                                        <span className="text-gray-500 font-normal truncate max-w-[120px]">
                                                            · {item.issueTitle}
                                                        </span>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-gray-500 text-xs">
                                            {isFolder ? '—' : formatBytes(item.fileSize)}
                                        </td>
                                        <td className="px-4 py-3.5 text-gray-600 text-xs font-medium">
                                            {item.uploadedByName || 'Người dùng'}
                                        </td>
                                        <td className="px-4 py-3.5 text-gray-400 text-xs">
                                            {formatDateTime(item.createdAt)}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                {!isFolder && (
                                                    <button
                                                        onClick={() => handleDownload(item)}
                                                        className="w-8 h-8 rounded-lg hover:bg-indigo-50 text-indigo-600 flex items-center justify-center transition-colors"
                                                        title="Tải xuống"
                                                    >
                                                        <i className="fa-solid fa-download text-xs" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => {
                                                            const msg = isFolder
                                                                ? 'Bạn có chắc chắn muốn xóa thư mục này và TOÀN BỘ file bên trong?'
                                                                : 'Bạn có chắc chắn muốn xóa file này?';
                                                            if (window.confirm(msg)) deleteMutation.mutate(item.id);
                                                        }}
                                                        className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <i className="fa-solid fa-trash-can text-xs" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* Modals */}
        <PromptModal
            isOpen={showFolderModal}
            title="Tạo thư mục mới"
            placeholder="Nhập tên thư mục..."
            confirmLabel="Tạo thư mục"
            onConfirm={handleFolderModalConfirm}
            onCancel={() => setShowFolderModal(false)}
            loading={createFolderMutation.isPending}
        />

        {previewIssue && (
            <IssuePreviewModal
                issueId={previewIssue.issueId}
                projectId={previewIssue.projectId}
                onClose={() => setPreviewIssue(null)}
            />
        )}
        </Fragment>
    );
}
