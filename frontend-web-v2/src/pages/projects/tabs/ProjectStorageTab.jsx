import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { formatDateTime } from '@shared/utils/formatters';

export default function ProjectStorageTab({ projectId }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    // Check Drive Connection Status
    const { data: driveStatus } = useQuery({
        queryKey: ['driveStatus'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.STATUS)).data,
    });

    const { data: files = [], isLoading } = useQuery({
        queryKey: ['projectFiles', projectId],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.PROJECT_FILES(projectId))).data,
    });

    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            await apiClient.post(ENDPOINTS.STORAGE.UPLOAD_PROJECT_FILE(projectId), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onMutate: () => setUploading(true),
        onSettled: () => setUploading(false),
        onSuccess: () => {
            toast.success('Tải lên thành công');
            queryClient.invalidateQueries(['projectFiles', projectId]);
        },
        onError: () => toast.error('Lỗi khi tải file lên')
    });

    const deleteMutation = useMutation({
        mutationFn: async (fileId) => await apiClient.delete(ENDPOINTS.STORAGE.DELETE_FILE(fileId)),
        onSuccess: () => {
            toast.success('Đã xóa file');
            queryClient.invalidateQueries(['projectFiles', projectId]);
        },
        onError: () => toast.error('Không thể xóa file')
    });

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) uploadMutation.mutate(file);
    };

    const handleDownload = (file) => {
        // Create an anchor tag to trigger download via proxy endpoint
        const link = document.createElement('a');
        link.href = `${apiClient.defaults.baseURL}${ENDPOINTS.STORAGE.DOWNLOAD_FILE(file.id)}`;
        link.setAttribute('download', file.fileName);
        
        // Append auth token if needed, or use a short-lived token mechanism. 
        // For simplicity, we use window.open if the browser handles it, 
        // or fetch and create object URL for authenticated downloads.
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

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    if (!driveStatus?.connected) {
        return (
            <div className="card p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i className="fa-brands fa-google-drive"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa kết nối Google Drive</h3>
                <p className="text-gray-500 mb-6">Quản trị viên cần kết nối Google Drive trong phần Cài đặt Công ty để sử dụng tính năng lưu trữ tài liệu.</p>
            </div>
        );
    }

    return (
        <div className="card p-6 min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Tài liệu dự án</h2>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-primary"
                >
                    {uploading ? (
                        <><i className="fa-solid fa-spinner fa-spin mr-2" /> Đang tải...</>
                    ) : (
                        <><i className="fa-solid fa-upload mr-2" /> Tải lên File</>
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-10"><i className="fa-solid fa-spinner fa-spin text-primary text-2xl" /></div>
            ) : files.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <i className="fa-solid fa-folder-open text-gray-300 text-4xl mb-3"></i>
                    <p className="text-gray-500">Chưa có tài liệu nào trong dự án này.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm">
                                <th className="px-4 py-3 font-medium rounded-l-lg">Tên file</th>
                                <th className="px-4 py-3 font-medium">Kích thước</th>
                                <th className="px-4 py-3 font-medium">Người tải lên</th>
                                <th className="px-4 py-3 font-medium">Ngày tải</th>
                                <th className="px-4 py-3 font-medium rounded-r-lg text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {files.map(file => (
                                <tr key={file.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <i className="fa-solid fa-file text-gray-400"></i>
                                            <span className="font-medium text-gray-900">{file.fileName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{formatBytes(file.fileSize)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {file.uploadedBy?.fullName || 'Người dùng'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(file.createdAt)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleDownload(file)}
                                                className="w-8 h-8 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                                                title="Tải xuống"
                                            >
                                                <i className="fa-solid fa-download"></i>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Bạn có chắc chắn muốn xóa file này?')) {
                                                        deleteMutation.mutate(file.id);
                                                    }
                                                }}
                                                className="w-8 h-8 rounded hover:bg-red-50 text-red-500 transition-colors"
                                                title="Xóa file"
                                            >
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
