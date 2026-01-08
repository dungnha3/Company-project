import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';

export default function StoragePage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [isDragging, setIsDragging] = useState(false);

    // Fetch Files
    const { data: files, isLoading } = useQuery({
        queryKey: ['files'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.LIST)).data,
    });

    // Upload Mutation
    const uploadMutation = useMutation({
        mutationFn: (formData) => apiClient.post(ENDPOINTS.STORAGE.UPLOAD, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        onSuccess: () => {
            showToast('Tải lên thành công', 'success');
            queryClient.invalidateQueries(['files']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Lỗi tải lên', 'error')
    });

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) processFiles(droppedFiles);
    };

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) processFiles(selectedFiles);
    };

    const processFiles = (fileList) => {
        fileList.forEach(file => {
            const formData = new FormData();
            formData.append('file', file);
            uploadMutation.mutate(formData);
        });
    };

    const downloadFile = (id, fileName) => {
        // Trigger download - assumption: BE returns a blob or redirect URL
        // Simple window.open for now or use apiClient with blob responseType
        window.open(ENDPOINTS.STORAGE.DOWNLOAD(id), '_blank');
    };

    const columns = [
        {
            header: 'Tên tập tin',
            accessorKey: 'originalName',
            cell: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
                        <i className={getFileIcon(row.contentType)} />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{row.originalName}</div>
                        <div className="text-xs text-gray-500">{formatBytes(row.size)}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Loại',
            accessorKey: 'contentType',
            cell: (row) => <span className="text-sm text-gray-500">{row.contentType}</span>
        },
        {
            header: 'Người tải lên',
            accessorKey: 'uploadedBy',
            cell: (row) => <span className="text-sm font-medium">{row.uploadedByName || 'User'}</span>
        },
        {
            header: 'Ngày tải',
            accessorKey: 'createdAt',
            cell: (row) => <span className="text-sm text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</span>
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => downloadFile(row.id, row.originalName)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Tải xuống"
                    >
                        <i className="fa-solid fa-download" />
                    </button>
                    {/* Add delete button if needed */}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Tài liệu & Lưu trữ</h1>

            {/* Drag & Drop Area */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                    border-2 border-dashed rounded-xl p-8 text-center transition-all
                    ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
                `}
            >
                <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm mb-4">
                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-blue-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Kéo thả tập tin vào đây</h3>
                <p className="text-gray-500 text-sm mb-4">hoặc nhấn vào nút bên dưới để chọn tập tin từ máy tính</p>

                <input
                    type="file"
                    id="file-upload"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                />
                <label
                    htmlFor="file-upload"
                    className="btn-primary cursor-pointer inline-flex items-center"
                >
                    <i className="fa-solid fa-folder-open mr-2" /> Chọn tập tin
                </label>
            </div>

            {/* File List */}
            <div className="bg-white rounded-xl shadow border border-gray-100">
                <DataTable
                    columns={columns}
                    data={files?.content || files || []}
                    loading={isLoading}
                    totalCount={files?.totalElements || 0}
                />
            </div>
        </div>
    );
}

function getFileIcon(mimeType) {
    if (mimeType?.startsWith('image/')) return 'fa-regular fa-image';
    if (mimeType?.includes('pdf')) return 'fa-regular fa-file-pdf';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'fa-regular fa-file-word';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return 'fa-regular fa-file-excel';
    return 'fa-regular fa-file';
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
