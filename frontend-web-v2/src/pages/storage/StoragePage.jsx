import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { formatDate, formatBytes } from '@shared/utils/formatters';

export default function StoragePage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderPath, setFolderPath] = useState([{ id: null, name: 'Root' }]);
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [isDragging, setIsDragging] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [shareFile, setShareFile] = useState(null);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const fileInputRef = useRef(null);

    // Fetch files and folders
    const { data: items = [], isLoading } = useQuery({
        queryKey: ['storage', currentFolder],
        queryFn: async () => {
            // Use correct endpoint: MY_FILES for root, FILES_IN_FOLDER for subfolder
            const endpoint = currentFolder
                ? ENDPOINTS.STORAGE.FILES_IN_FOLDER(currentFolder)
                : ENDPOINTS.STORAGE.MY_FILES;
            const response = await apiClient.get(endpoint, {
                params: currentFolder ? {} : { filter: 'company' }
            });
            return response.data?.content || response.data || [];
        },
    });

    // Separate folders and files
    const folders = items.filter(item => item.isFolder);
    const files = items.filter(item => !item.isFolder);

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: (formData) => apiClient.post(ENDPOINTS.STORAGE.UPLOAD, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        onSuccess: () => {
            showToast('Tải lên thành công!', 'success');
            queryClient.invalidateQueries(['storage']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lỗi tải lên', 'error')
    });

    // Create folder mutation
    const createFolderMutation = useMutation({
        mutationFn: (name) => apiClient.post(ENDPOINTS.STORAGE.CREATE_FOLDER || '/api/storage/folders', {
            name,
            parentId: currentFolder
        }),
        onSuccess: () => {
            showToast('Tạo thư mục thành công!', 'success');
            queryClient.invalidateQueries(['storage']);
            setShowNewFolderModal(false);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lỗi tạo thư mục', 'error')
    });

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        processFiles(droppedFiles);
    };

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        processFiles(selectedFiles);
    };

    const processFiles = (fileList) => {
        fileList.forEach(file => {
            const formData = new FormData();
            formData.append('file', file);
            if (currentFolder) formData.append('folderId', currentFolder);
            uploadMutation.mutate(formData);
        });
    };

    const navigateToFolder = (folder) => {
        setCurrentFolder(folder.id);
        if (folder.id === null) {
            setFolderPath([{ id: null, name: 'Root' }]);
        } else {
            setFolderPath([...folderPath, { id: folder.id, name: folder.originalName || folder.name }]);
        }
    };

    const navigateToBreadcrumb = (index) => {
        const newPath = folderPath.slice(0, index + 1);
        setFolderPath(newPath);
        setCurrentFolder(newPath[newPath.length - 1].id);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tài liệu & Lưu trữ</h1>
                    <p className="text-gray-500 text-sm">Quản lý files và thư mục Workspace</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowNewFolderModal(true)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm flex items-center gap-2"
                    >
                        <i className="fa-solid fa-folder-plus" /> Thư mục mới
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-primary"
                    >
                        <i className="fa-solid fa-upload mr-2" /> Tải lên
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        onChange={handleFileSelect}
                    />
                </div>
            </div>

            {/* Breadcrumb & View Toggle */}
            <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                    {folderPath.map((folder, index) => (
                        <span key={index} className="flex items-center">
                            {index > 0 && <i className="fa-solid fa-chevron-right text-gray-300 mx-2" />}
                            <button
                                onClick={() => navigateToBreadcrumb(index)}
                                className={`text-sm font-medium ${index === folderPath.length - 1 ? 'text-gray-900' : 'text-blue-600 hover:underline'}`}
                            >
                                {index === 0 ? <i className="fa-solid fa-house mr-1" /> : null}
                                {folder.name}
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                    >
                        <i className="fa-solid fa-grid-2" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                    >
                        <i className="fa-solid fa-list" />
                    </button>
                </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                    border-2 border-dashed rounded-xl p-6 text-center transition-all
                    ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-200 bg-gray-50'}
                `}
            >
                <i className={`fa-solid fa-cloud-arrow-up text-2xl mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-500">Kéo thả file vào đây để tải lên</p>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-blue-500" />
                </div>
            )}

            {/* Folders */}
            {folders.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Thư mục</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {folders.map(folder => (
                            <div
                                key={folder.id}
                                onClick={() => navigateToFolder(folder)}
                                className="bg-white rounded-xl p-4 border border-gray-100 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all group"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                                    <i className="fa-solid fa-folder text-2xl text-blue-500" />
                                </div>
                                <div className="font-medium text-gray-800 truncate">{folder.originalName || folder.name}</div>
                                <div className="text-xs text-gray-400">{folder.itemCount || 0} items</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Files */}
            {files.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Files</h3>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {files.map(file => (
                                <FileCard
                                    key={file.id}
                                    file={file}
                                    onPreview={() => setPreviewFile(file)}
                                    onShare={() => setShareFile(file)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
                            {files.map(file => (
                                <FileListItem
                                    key={file.id}
                                    file={file}
                                    onPreview={() => setPreviewFile(file)}
                                    onShare={() => setShareFile(file)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && folders.length === 0 && files.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-folder-open text-4xl text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Thư mục trống</h3>
                    <p className="text-gray-500 text-sm mt-1">Tải lên file hoặc tạo thư mục mới</p>
                </div>
            )}

            {/* Modals */}
            {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
            {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}
            {showNewFolderModal && (
                <NewFolderModal
                    onClose={() => setShowNewFolderModal(false)}
                    onCreate={(name) => createFolderMutation.mutate(name)}
                    isPending={createFolderMutation.isPending}
                />
            )}
        </div>
    );
}

function FileCard({ file, onPreview, onShare }) {
    const isImage = file.contentType?.startsWith('image/');

    return (
        <div className="bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group overflow-hidden">
            {/* Thumbnail */}
            <div
                onClick={onPreview}
                className="aspect-square bg-gray-50 flex items-center justify-center cursor-pointer relative overflow-hidden"
            >
                {isImage ? (
                    <img
                        src={ENDPOINTS.STORAGE.DOWNLOAD(file.id)}
                        alt={file.originalName}
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <i className={`${getFileIcon(file.contentType)} text-4xl text-gray-300`} />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <i className="fa-solid fa-eye text-white text-xl" />
                </div>
            </div>

            {/* Info */}
            <div className="p-3">
                <div className="font-medium text-gray-800 text-sm truncate" title={file.originalName}>
                    {file.originalName}
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
                    <div className="flex gap-1">
                        <button
                            onClick={onShare}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                            title="Chia sẻ"
                        >
                            <i className="fa-solid fa-share-nodes text-sm" />
                        </button>
                        <a
                            href={ENDPOINTS.STORAGE.DOWNLOAD(file.id)}
                            className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded"
                            title="Tải xuống"
                        >
                            <i className="fa-solid fa-download text-sm" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FileListItem({ file, onPreview, onShare }) {
    return (
        <div className="flex items-center justify-between p-4 hover:bg-gray-50">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getFileColor(file.contentType)}`}>
                    <i className={`${getFileIcon(file.contentType)} text-lg`} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">{file.originalName}</div>
                    <div className="text-xs text-gray-500">
                        {formatBytes(file.size)} • {formatDate(file.createdAt)}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onPreview} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                    <i className="fa-solid fa-eye" />
                </button>
                <button onClick={onShare} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                    <i className="fa-solid fa-share-nodes" />
                </button>
                <a href={ENDPOINTS.STORAGE.DOWNLOAD(file.id)} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg">
                    <i className="fa-solid fa-download" />
                </a>
            </div>
        </div>
    );
}

function FilePreviewModal({ file, onClose }) {
    const isImage = file.contentType?.startsWith('image/');
    const isPdf = file.contentType?.includes('pdf');
    const isVideo = file.contentType?.startsWith('video/');
    const isAudio = file.contentType?.startsWith('audio/');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getFileColor(file.contentType)}`}>
                            <i className={`${getFileIcon(file.contentType)}`} />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900">{file.originalName}</div>
                            <div className="text-xs text-gray-500">{formatBytes(file.size)}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <i className="fa-solid fa-xmark text-xl text-gray-500" />
                    </button>
                </div>

                {/* Preview Content */}
                <div className="p-4 bg-gray-50 flex items-center justify-center min-h-[400px] max-h-[calc(90vh-120px)] overflow-auto">
                    {isImage && (
                        <img src={ENDPOINTS.STORAGE.DOWNLOAD(file.id)} alt={file.originalName} loading="lazy" className="max-w-full max-h-full rounded-lg shadow-lg" />
                    )}
                    {isPdf && (
                        <iframe src={ENDPOINTS.STORAGE.DOWNLOAD(file.id)} className="w-full h-[600px] rounded-lg" />
                    )}
                    {isVideo && (
                        <video src={ENDPOINTS.STORAGE.DOWNLOAD(file.id)} controls className="max-w-full rounded-lg shadow-lg" />
                    )}
                    {isAudio && (
                        <audio src={ENDPOINTS.STORAGE.DOWNLOAD(file.id)} controls className="w-full" />
                    )}
                    {!isImage && !isPdf && !isVideo && !isAudio && (
                        <div className="text-center py-12">
                            <i className={`${getFileIcon(file.contentType)} text-6xl text-gray-300 mb-4`} />
                            <p className="text-gray-500">Không thể xem trước file này</p>
                            <a
                                href={ENDPOINTS.STORAGE.DOWNLOAD(file.id)}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                <i className="fa-solid fa-download" /> Tải xuống
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ShareModal({ file, onClose }) {
    const { showToast } = useToast();
    const [shareLink, setShareLink] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    const [permission, setPermission] = useState('view');

    // Generate link mutation
    const generateLinkMutation = useMutation({
        mutationFn: async () => {
            return (await apiClient.post(ENDPOINTS.STORAGE.GENERATE_LINK(file.id))).data;
        },
        onSuccess: (data) => {
            setShareLink(data.link || data.url); // Assuming API returns { link: '...' }
            showToast('Đã tạo link chia sẻ!', 'success');
        },
        onError: (err) => {
            showToast(err.response?.data?.message || 'Không thể tạo link', 'error');
        }
    });

    const generateLink = () => {
        generateLinkMutation.mutate();
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shareLink);
        showToast('Đã copy link!', 'success');
    };

    const shareByEmail = () => {
        if (!shareEmail) return;
        // Ideally this would also be an API call
        showToast(`Tính năng gửi email đang phát triển`, 'info');
        setShareEmail('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Chia sẻ file</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{file.originalName}</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Share via Email */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Mời qua email</h4>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={shareEmail}
                                onChange={(e) => setShareEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            />
                            <select
                                value={permission}
                                onChange={(e) => setPermission(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg"
                            >
                                <option value="view">Xem</option>
                                <option value="edit">Chỉnh sửa</option>
                            </select>
                            <button onClick={shareByEmail} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                <i className="fa-solid fa-paper-plane" />
                            </button>
                        </div>
                    </div>

                    {/* Generate Link */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Link chia sẻ</h4>
                        {shareLink ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={shareLink}
                                    readOnly
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                                />
                                <button onClick={copyLink} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                    <i className="fa-solid fa-copy" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={generateLink}
                                disabled={generateLinkMutation.isPending}
                                className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                            >
                                {generateLinkMutation.isPending ? (
                                    <i className="fa-solid fa-spinner fa-spin mr-2" />
                                ) : (
                                    <i className="fa-solid fa-link mr-2" />
                                )}
                                Tạo link chia sẻ
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function NewFolderModal({ onClose, onCreate, isPending }) {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) onCreate(name.trim());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Tạo thư mục mới</h2>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tên thư mục..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            autoFocus
                        />
                    </div>
                    <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isPending}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isPending ? <i className="fa-solid fa-spinner fa-spin" /> : 'Tạo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function getFileIcon(mimeType) {
    if (mimeType?.startsWith('image/')) return 'fa-regular fa-image';
    if (mimeType?.includes('pdf')) return 'fa-regular fa-file-pdf';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'fa-regular fa-file-word';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return 'fa-regular fa-file-excel';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'fa-regular fa-file-powerpoint';
    if (mimeType?.startsWith('video/')) return 'fa-regular fa-file-video';
    if (mimeType?.startsWith('audio/')) return 'fa-regular fa-file-audio';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return 'fa-regular fa-file-zipper';
    return 'fa-regular fa-file';
}

function getFileColor(mimeType) {
    if (mimeType?.startsWith('image/')) return 'bg-purple-100 text-purple-600';
    if (mimeType?.includes('pdf')) return 'bg-red-100 text-red-600';
    if (mimeType?.includes('word')) return 'bg-blue-100 text-blue-600';
    if (mimeType?.includes('excel')) return 'bg-green-100 text-green-600';
    if (mimeType?.includes('powerpoint')) return 'bg-orange-100 text-orange-600';
    if (mimeType?.startsWith('video/')) return 'bg-pink-100 text-pink-600';
    if (mimeType?.startsWith('audio/')) return 'bg-yellow-100 text-yellow-600';
    return 'bg-gray-100 text-gray-600';
}


