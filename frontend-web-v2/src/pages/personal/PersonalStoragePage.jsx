import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDate, formatBytes } from '@shared/utils/formatters';

const FILE_ICONS = {
    pdf: { icon: 'fa-file-pdf', color: 'text-red-500' },
    doc: { icon: 'fa-file-word', color: 'text-indigo-600' },
    docx: { icon: 'fa-file-word', color: 'text-indigo-600' },
    xls: { icon: 'fa-file-excel', color: 'text-green-600' },
    xlsx: { icon: 'fa-file-excel', color: 'text-green-600' },
    ppt: { icon: 'fa-file-powerpoint', color: 'text-orange-500' },
    pptx: { icon: 'fa-file-powerpoint', color: 'text-orange-500' },
    jpg: { icon: 'fa-file-image', color: 'text-purple-500' },
    jpeg: { icon: 'fa-file-image', color: 'text-purple-500' },
    png: { icon: 'fa-file-image', color: 'text-purple-500' },
    gif: { icon: 'fa-file-image', color: 'text-purple-500' },
    zip: { icon: 'fa-file-zipper', color: 'text-amber-600' },
    rar: { icon: 'fa-file-zipper', color: 'text-amber-600' },
    txt: { icon: 'fa-file-lines', color: 'text-gray-500' },
    mp3: { icon: 'fa-file-audio', color: 'text-pink-500' },
    mp4: { icon: 'fa-file-video', color: 'text-indigo-500' },
    default: { icon: 'fa-file', color: 'text-gray-400' },
};

const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    return FILE_ICONS[ext] || FILE_ICONS.default;
};



export default function PersonalStoragePage() {
    const { success, error } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [uploading, setUploading] = useState(false);

    // Fetch storage stats
    const { data: stats } = useQuery({
        queryKey: ['storage-stats'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.STATS)).data,
    });

    // Fetch folders
    const { data: folders = [], isLoading: loadingFolders } = useQuery({
        queryKey: ['personal-folders', currentFolder],
        queryFn: async () => {
            const endpoint = currentFolder
                ? ENDPOINTS.STORAGE.SUBFOLDERS(currentFolder)
                : ENDPOINTS.STORAGE.MY_FOLDERS; // Use MY_FOLDERS for root
            return (await apiClient.get(endpoint)).data;
        },
    });

    // Fetch files
    const { data: files = [], isLoading: loadingFiles } = useQuery({
        queryKey: ['personal-files', currentFolder],
        queryFn: async () => {
            const endpoint = currentFolder
                ? ENDPOINTS.STORAGE.FILES_IN_FOLDER(currentFolder)
                : ENDPOINTS.STORAGE.MY_FILES; // Use MY_FILES for root
            return (await apiClient.get(endpoint)).data;
        },
    });

    const handleUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        if (currentFolder) {
            formData.append('parentId', currentFolder);
        }

        setUploading(true);

        try {
            await apiClient.post(ENDPOINTS.STORAGE.UPLOAD, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            success('Đã tải lên thành công!');
            queryClient.invalidateQueries(['personal-files']);
            queryClient.invalidateQueries(['storage-stats']);
        } catch (err) {
            error(err.response?.data?.message || 'Lỗi khi tải lên');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Create folder
    const createFolderMutation = useMutation({
        mutationFn: (name) => apiClient.post(ENDPOINTS.STORAGE.CREATE_FOLDER, {
            name,
            parentId: currentFolder,
        }),
        onSuccess: () => {
            success('Đã tạo thư mục');
            queryClient.invalidateQueries(['personal-folders']);
            setShowNewFolderModal(false);
            setNewFolderName('');
        },
        onError: (err) => {
            error(err.response?.data?.message || 'Không thể tạo thư mục');
        }
    });

    // Delete file
    const deleteFileMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.STORAGE.DELETE(id)),
        onSuccess: () => {
            success('Đã xóa file');
            queryClient.invalidateQueries(['personal-files']);
            queryClient.invalidateQueries(['storage-stats']);
        },
    });

    // Delete folder
    const deleteFolderMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.STORAGE.FOLDER_BY_ID(id)),
        onSuccess: () => {
            success('Đã xóa thư mục');
            queryClient.invalidateQueries(['personal-folders']);
        },
    });

    // Download file
    const handleDownload = async (file) => {
        try {
            const response = await apiClient.get(ENDPOINTS.STORAGE.DOWNLOAD(file.id), {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.name);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            error('Không thể tải xuống');
        }
    };

    // FIX: Map keys from Backend DTO (totalSizeFormatted, quotaLimitFormatted)
    const usedPercent = stats ? Math.round(stats.usagePercentage || 0) : 0;
    const isLoading = loadingFiles || loadingFolders;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                        <i className="fa-solid fa-folder-open text-xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tài liệu cá nhân</h1>
                        <p className="text-gray-500 text-sm">Lưu trữ và quản lý file của bạn</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500'}`}
                        >
                            <i className="fa-solid fa-grid-2" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500'}`}
                        >
                            <i className="fa-solid fa-list" />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowNewFolderModal(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <i className="fa-solid fa-folder-plus" />
                        Thư mục
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/25"
                    >
                        {uploading ? (
                            <i className="fa-solid fa-spinner fa-spin" />
                        ) : (
                            <i className="fa-solid fa-cloud-arrow-up" />
                        )}
                        Tải lên
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleUpload}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Storage Stats */}
            {stats && (
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-100">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                <i className="fa-solid fa-hard-drive text-violet-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Dung lượng sử dụng</p>
                                <p className="text-sm text-gray-500">
                                    {stats.totalSizeFormatted} / {stats.quotaLimitFormatted}
                                </p>
                            </div>
                        </div>
                        <span className="text-lg font-bold text-violet-600">{usedPercent}%</span>
                    </div>
                    <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${usedPercent > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`}
                            style={{ width: `${usedPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Breadcrumb - TODO: implement folder path tracking */}
            {currentFolder && (
                <div className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => setCurrentFolder(null)}
                        className="text-violet-600 hover:underline"
                    >
                        <i className="fa-solid fa-home mr-1" />
                        Trang chủ
                    </button>
                    <i className="fa-solid fa-chevron-right text-gray-300" />
                    <span className="text-gray-600 dark:text-gray-400">Thư mục hiện tại</span>
                </div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-violet-100 flex items-center justify-center mb-4">
                        <i className="fa-solid fa-spinner fa-spin text-2xl text-violet-600" />
                    </div>
                    <p className="text-gray-500">Đang tải...</p>
                </div>
            ) : folders.length === 0 && files.length === 0 ? (
                <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 p-16 text-center">
                    <div className="w-24 h-24 mx-auto rounded-full bg-violet-50 flex items-center justify-center mb-4">
                        <i className="fa-solid fa-cloud-arrow-up text-4xl text-violet-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Chưa có file nào</h3>
                    <p className="text-gray-500 text-sm mb-4">Kéo thả hoặc nhấn nút "Tải lên" để bắt đầu</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-primary"
                    >
                        <i className="fa-solid fa-plus mr-2" />
                        Tải file đầu tiên
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {/* Folders */}
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-violet-200 transition-all cursor-pointer group"
                            onClick={() => setCurrentFolder(folder.id)}
                        >
                            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                                <i className="fa-solid fa-folder text-amber-500 text-xl" />
                            </div>
                            <p className="font-medium text-gray-800 truncate">{folder.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{folder.fileCount || 0} files</p>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteFolderMutation.mutate(folder.id); }}
                                className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <i className="fa-solid fa-trash text-xs" />
                            </button>
                        </div>
                    ))}
                    {/* Files */}
                    {files.map(file => {
                        const { icon, color } = getFileIcon(file.name);
                        return (
                            <div
                                key={file.id}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-violet-200 transition-all group relative"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3`}>
                                    <i className={`fa-solid ${icon} ${color} text-xl`} />
                                </div>
                                <p className="font-medium text-gray-800 truncate text-sm">{file.name}</p>
                                <p className="text-xs text-gray-400 mt-1">{formatBytes(file.size)}</p>
                                {/* Actions */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDownload(file)}
                                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                                    >
                                        <i className="fa-solid fa-download text-xs" />
                                    </button>
                                    <button
                                        onClick={() => deleteFileMutation.mutate(file.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <i className="fa-solid fa-trash text-xs" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // List View
                <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kích thước</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {folders.map(folder => (
                                <tr
                                    key={folder.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => setCurrentFolder(folder.id)}
                                >
                                    <td className="px-4 py-3 flex items-center gap-3">
                                        <i className="fa-solid fa-folder text-amber-500" />
                                        <span className="font-medium text-gray-800">{folder.name}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-sm">—</td>
                                    <td className="px-4 py-3 text-gray-500 text-sm">
                                        {folder.createdAt ? formatDate(folder.createdAt) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteFolderMutation.mutate(folder.id); }}
                                            className="p-2 text-gray-400 hover:text-red-500"
                                        >
                                            <i className="fa-solid fa-trash" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {files.map(file => {
                                const { icon, color } = getFileIcon(file.name);
                                return (
                                    <tr key={file.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 flex items-center gap-3">
                                            <i className={`fa-solid ${icon} ${color}`} />
                                            <span className="font-medium text-gray-800">{file.name}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-sm">{formatBytes(file.size)}</td>
                                        <td className="px-4 py-3 text-gray-500 text-sm">
                                            {file.createdAt ? formatDate(file.createdAt) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDownload(file)}
                                                className="p-2 text-gray-400 hover:text-violet-600"
                                            >
                                                <i className="fa-solid fa-download" />
                                            </button>
                                            <button
                                                onClick={() => deleteFileMutation.mutate(file.id)}
                                                className="p-2 text-gray-400 hover:text-red-500"
                                            >
                                                <i className="fa-solid fa-trash" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Folder Modal */}
            {showNewFolderModal && (
                <div className="modal-overlay">
                    <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
                            <h3 className="text-lg font-semibold text-white">Tạo thư mục mới</h3>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (newFolderName.trim()) {
                                    createFolderMutation.mutate(newFolderName.trim());
                                }
                            }}
                        >
                            <div className="p-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tên thư mục</label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    className="input"
                                    placeholder="Nhập tên thư mục..."
                                    autoFocus
                                />
                            </div>
                            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowNewFolderModal(false)}
                                    className="btn-secondary"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newFolderName.trim() || createFolderMutation.isPending}
                                    className="btn-primary"
                                >
                                    {createFolderMutation.isPending && <i className="fa-solid fa-spinner fa-spin mr-2" />}
                                    Tạo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
