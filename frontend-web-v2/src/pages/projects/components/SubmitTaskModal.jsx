import { useState, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useAccessControl } from '@shared/hooks/useAccessControl';
import { useTimerStore, fireTaskToReview } from '@shared/stores/timerStore';
import { useAuthStore } from '@shared/stores/authStore';

const ACCEPTED_TYPES = [
    'image/*', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'video/*', 'audio/*',
    '.zip', '.rar', '.7z',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType, name) {
    if (!contentType) contentType = '';
    if (contentType.startsWith('image/')) return { icon: 'fa-image', color: 'text-green-500 bg-green-50' };
    if (contentType.includes('pdf')) return { icon: 'fa-file-pdf', color: 'text-red-500 bg-red-50' };
    if (contentType.includes('word') || contentType.includes('document')) return { icon: 'fa-file-word', color: 'text-blue-500 bg-blue-50' };
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return { icon: 'fa-file-excel', color: 'text-emerald-500 bg-emerald-50' };
    if (contentType.startsWith('video/')) return { icon: 'fa-file-video', color: 'text-purple-500 bg-purple-50' };
    if (contentType.startsWith('audio/')) return { icon: 'fa-file-audio', color: 'text-amber-500 bg-amber-50' };
    if (contentType.includes('zip') || name?.match(/\.(zip|rar|7z)$/)) return { icon: 'fa-file-zipper', color: 'text-yellow-600 bg-yellow-50' };
    return { icon: 'fa-file-lines', color: 'text-gray-500 bg-gray-50' };
}

export default function SubmitTaskModal({ issue, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { hasPermission } = useAccessControl();
    const { user: currentUser } = useAuthStore();
    const canManageIssues = hasPermission('PROJECT.MANAGE_ISSUES');
    const isAssignee = currentUser && Number(issue.assigneeId) === Number(currentUser.userId);
    const canSubmit = canManageIssues || isAssignee;
    const fileInputRef = useRef(null);
    const [note, setNote] = useState('');
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState([]); // { id, name, size, progress, error }
    const [dragOver, setDragOver] = useState(false);
    const [driveConnected, setDriveConnected] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState(''); // path ảo, "" = gốc

    const statusNameToId = {};
    const statusMapByName = {};

    // Check Drive connection
    const { data: driveStatus } = useQuery({
        queryKey: ['storage-status'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STORAGE.STATUS)).data,
    });

    // Fetch issue statuses for target status resolution
    const { data: issueStatuses = [] } = useQuery({
        queryKey: ['issue-statuses-for-submit'],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.ISSUE_STATUSES.LIST);
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    issueStatuses.forEach(s => {
        statusNameToId[s.name] = s.statusId;
        statusMapByName[(s.name || '').toLowerCase()] = s.statusId;
    });

    // Fetch existing files for this issue
    const { data: existingFiles = [] } = useQuery({
        queryKey: ['issue-files', issue?.issueId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.STORAGE.ISSUE_FILES(issue.issueId));
            return res.data || [];
        },
        enabled: !!issue?.issueId,
    });

    const allFiles = [...existingFiles, ...attachedFiles.filter(f => f._pending)];

    // Fetch folder tree of the project for storage-location selection
    const { data: folderTree } = useQuery({
        queryKey: ['project-folder-tree', issue?.projectId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.STORAGE.PROJECT_FOLDER_TREE(issue.projectId));
            return res.data;
        },
        enabled: !!issue?.projectId,
        staleTime: 60000,
    });

    // Flatten folder tree to a list of options (path → label)
    const folderOptions = useMemo(() => {
        const options = [{ path: '', label: '/ (Gốc dự án)' }];
        const walk = (node, prefix) => {
            if (!node || !node.children) return;
            for (const c of node.children) {
                const label = prefix ? `${prefix}/${c.name}` : `/${c.name}`;
                options.push({ path: c.path, label });
                walk(c, label);
            }
        };
        if (folderTree) walk(folderTree, '');
        return options;
    }, [folderTree]);

    // Upload single file (lưu vào project storage, vẫn liên kết với issue)
    const uploadFileMutation = useMutation({
        mutationFn: async (fileObj) => {
            const formData = new FormData();
            formData.append('file', fileObj.file);
            const params = new URLSearchParams();
            if (selectedFolder) params.append('folder', selectedFolder);
            params.append('issueId', String(issue.issueId));
            const url = ENDPOINTS.STORAGE.UPLOAD_PROJECT_FILE(issue.projectId)
                + (params.toString() ? `?${params.toString()}` : '');
            const res = await apiClient.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data;
        },
        onSuccess: (data, variables) => {
            setUploadingFiles(prev => prev.filter(f => f.id !== variables.id));
            setAttachedFiles(prev => [
                ...prev.filter(f => f.id !== variables.id),
                data
            ]);
            queryClient.invalidateQueries(['issue-files', issue.issueId]);
            queryClient.invalidateQueries(['projectFiles', issue.projectId]);
            showToast(`Đã upload ${data.fileName}`, 'success');
        },
        onError: (err, variables) => {
            showToast(err?.response?.data?.message || 'Upload thất bại', 'error');
            setAttachedFiles(prev => prev.filter(f => f.id !== variables.id));
        }
    });

    // Delete file
    const deleteFileMutation = useMutation({
        mutationFn: async (fileId) => {
            await apiClient.delete(ENDPOINTS.STORAGE.DELETE_FILE(fileId));
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['issue-files', issue.issueId]);
            queryClient.invalidateQueries(['projectFiles', issue.projectId]);
            setAttachedFiles(prev => prev.filter(f => f.id !== fileId && f._pending));
        },
        onError: () => showToast('Không thể xóa file', 'error')
    });

    // Submit task
    const submitMutation = useMutation({
        mutationFn: async ({ note: taskNote, files }) => {
            const actions = [];

            // Upload pending files first
            const pendingFiles = files.filter(f => f._pending);
            if (pendingFiles.length > 0) {
                for (const pf of pendingFiles) {
                    const formData = new FormData();
                    formData.append('file', pf.file);
                    const params = new URLSearchParams();
                    params.append('issueId', String(issue.issueId));
                    if (selectedFolder) params.append('folder', selectedFolder);
                    await apiClient.post(
                        `${ENDPOINTS.STORAGE.UPLOAD_PROJECT_FILE(issue.projectId)}?${params.toString()}`,
                        formData,
                        { headers: { 'Content-Type': 'multipart/form-data' } }
                    );
                }
            }

            // Determine target status
            const current = (issue.statusName || '').toLowerCase();
            const reviewId = statusNameToId['Review'];
            const doneId = statusNameToId['Done'];
            let targetStatusId = null;

            if (current === 'in progress' && reviewId) targetStatusId = reviewId;
            else if ((current === 'in progress' || current === 'review') && doneId) targetStatusId = doneId;
            else if (reviewId) targetStatusId = reviewId;
            else if (doneId) targetStatusId = doneId;

            if (!targetStatusId) throw new Error('Không tìm thấy trạng thái Review/Done');

            // Build submission note with file list
            let finalNote = taskNote.trim();
            const uploadedFiles = files.filter(f => !f._pending);
            if (uploadedFiles.length > 0) {
                const fileList = uploadedFiles.map(f => `📎 ${f.fileName}`).join('\n');
                finalNote = `${finalNote}\n\n**File đính kèm:**\n${fileList}`.trim();
            }

            await apiClient.post(ENDPOINTS.COMMENTS.CREATE, {
                issueId: issue.issueId,
                content: `[Nộp task]\n${finalNote}`,
            });

            await apiClient.patch(ENDPOINTS.ISSUES.UPDATE_STATUS_TO(issue.issueId, targetStatusId));
        },
        onSuccess: () => {
            // Auto-stop timer and log work hours when task is submitted to Review
            fireTaskToReview(issue.issueId);
            showToast('Đã nộp task thành công', 'success');
            queryClient.invalidateQueries({ queryKey: ['issues'] });
            queryClient.invalidateQueries({ queryKey: ['myIssues'] });
            queryClient.invalidateQueries({ queryKey: ['myReportedIssues'] });
            queryClient.invalidateQueries({ queryKey: ['backlog-including-planning'] });
            onSuccess?.();
            onClose();
        },
        onError: (err) => {
            showToast(err?.response?.data?.message || err?.message || 'Không thể nộp task', 'error');
        }
    });

    const handleFileAdd = useCallback((files) => {
        const fileArray = Array.from(files);
        const validFiles = [];
        const errors = [];

        for (const file of fileArray) {
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name} quá lớn (tối đa 50MB)`);
                continue;
            }
            validFiles.push({
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                id: `temp-${Date.now()}-${Math.random()}`,
                _pending: true,
                googleDriveFileId: `temp-${Date.now()}`,
            });
        }

        if (errors.length > 0) {
            showToast(errors[0], 'warning');
        }

        if (validFiles.length > 0) {
            setAttachedFiles(prev => [...prev, ...validFiles]);
            validFiles.forEach(f => uploadFileMutation.mutate(f));
        }
    }, [showToast, uploadFileMutation]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        handleFileAdd(e.dataTransfer.files);
    }, [handleFileAdd]);

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);

    const handleConfirm = () => {
        if (!note.trim()) {
            showToast('Vui lòng nhập ghi chú trước khi nộp task', 'error');
            return;
        }

        const uploadedFiles = allFiles.filter(f => !f._pending);
        const current = (issue.statusName || '').toLowerCase();
        const isToReview = current !== 'review' && current !== 'done';

        if (isToReview && uploadedFiles.length === 0) {
            showToast('Phải đính kèm ít nhất 1 file minh chứng khi nộp vào Review', 'error');
            return;
        }

        if (submitMutation.isPending) return;
        submitMutation.mutate({ note, files: allFiles });
    };

    const handleRemovePending = (fileId) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const isUploading = attachedFiles.some(f => f._pending);

    if (!issue) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Nộp task</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Đính kèm file và ghi chú tiến độ trước khi chuyển trạng thái</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <i className="fa-solid fa-times text-sm" />
                        </button>
                    </div>
                    {/* Issue info strip */}
                    <div className="mt-3 flex items-center gap-2 p-2.5 bg-indigo-50 rounded-xl">
                        <span className="font-mono text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded font-bold">
                            {issue.issueKey}
                        </span>
                        <span className="text-sm font-medium text-gray-700 line-clamp-1">{issue.title}</span>
                        <span className="ml-auto text-xs text-gray-400 shrink-0">
                            {issue.statusName} →
                            {(issue.statusName || '').toLowerCase() === 'in progress' ? ' Review/Done' :
                             (issue.statusName || '').toLowerCase() === 'review' ? ' Done' : ''}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">

                    {/* File upload zone */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            <i className="fa-solid fa-paperclip text-xs mr-1" />
                            File đính kèm
                            <span className="text-gray-400 font-normal ml-1">(tối đa 50MB/file)</span>
                        </label>

                        {/* Folder selector */}
                        {issue?.projectId && (
                            <div className="mb-3 flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                <i className="fa-solid fa-folder-tree text-amber-500 text-sm" />
                                <label className="text-xs font-semibold text-gray-600 shrink-0">
                                    Lưu vào thư mục:
                                </label>
                                <select
                                    value={selectedFolder}
                                    onChange={e => setSelectedFolder(e.target.value)}
                                    className="flex-1 px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                                >
                                    {folderOptions.map(opt => (
                                        <option key={opt.path || '__root__'} value={opt.path}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Drop zone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                                ${dragOver
                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                                    : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_TYPES.join(',')}
                                onChange={e => handleFileAdd(e.target.files)}
                                className="hidden"
                            />
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl
                                    ${dragOver ? 'bg-indigo-100 text-indigo-500' : 'bg-gray-100 text-gray-400'}`}>
                                    <i className={`fa-solid ${dragOver ? 'fa-arrow-down' : 'fa-cloud-arrow-up'}`} />
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${dragOver ? 'text-indigo-600' : 'text-gray-600'}`}>
                                        {dragOver ? 'Thả file vào đây' : 'Kéo thả file hoặc click để chọn'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Ảnh, Video, ZIP...</p>
                                </div>
                            </div>
                        </div>

                        {/* Uploading files */}
                        {attachedFiles.filter(f => f._pending).length > 0 && (
                            <div className="mt-2 space-y-2">
                                {attachedFiles.filter(f => f._pending).map(f => (
                                    <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                            <i className="fa-solid fa-spinner fa-spin text-sm" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                                            <p className="text-xs text-gray-400">{formatBytes(f.size)} · Đang upload...</p>
                                        </div>
                                        <button onClick={() => handleRemovePending(f.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <i className="fa-solid fa-xmark text-sm" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Existing files */}
                        {existingFiles.length > 0 && (
                            <div className="mt-2 space-y-2">
                                {existingFiles.map(f => {
                                    const { icon, color } = getFileIcon(f.contentType, f.fileName);
                                    return (
                                        <div key={f.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${color}`}>
                                                <i className={`fa-solid ${icon}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-700 truncate">{f.fileName}</p>
                                                <p className="text-xs text-gray-400">{f.fileSize ? formatBytes(f.fileSize) : ''}</p>
                                            </div>
                                            <button
                                                onClick={() => deleteFileMutation.mutate(f.id)}
                                                disabled={deleteFileMutation.isPending}
                                                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                                            >
                                                <i className="fa-solid fa-trash-can text-sm" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {existingFiles.length === 0 && attachedFiles.filter(f => f._pending).length === 0 && (
                            <p className="text-xs text-gray-400 mt-2 text-center italic">
                                <i className="fa-solid fa-info-circle mr-1" />
                                Chưa có file nào được đính kèm
                            </p>
                        )}
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            <i className="fa-solid fa-note-sticky text-xs mr-1" />
                            Ghi chú nộp task <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Mô tả tiến độ, kết quả đã hoàn thành, link PR, note cho reviewer..."
                            rows={5}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-300 transition-all resize-none"
                            autoFocus
                        />
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-400">Ghi chú sẽ được lưu vào bình luận task</p>
                            <span className={`text-xs font-medium ${note.length > 1800 ? 'text-red-500' : 'text-gray-400'}`}>
                                {note.length}/2000
                            </span>
                        </div>
                    </div>

                    {/* Rework warning */}
                    {(() => {
                        const isBackward = ['review', 'done', 'testing', 'hoàn thành'].some(s =>
                            (issue.statusName || '').toLowerCase().includes(s)
                        );
                        if (!isBackward) return null;
                        return (
                            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5" />
                                <p className="text-xs text-amber-700">
                                    Bạn đang nộp task từ <strong>Review/Done</strong> → <strong>Done</strong>. Thao tác này sẽ ghi nhận lịch sử vào activity log.
                                </p>
                            </div>
                        );
                    })()}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {/* File count / warning badge */}
                        {(() => {
                            const uploadedFiles = allFiles.filter(f => !f._pending);
                            const current = (issue.statusName || '').toLowerCase();
                            const isToReview = current !== 'review' && current !== 'done';
                            const hasEnough = uploadedFiles.length > 0 || current === 'review' || current === 'done';
                            return (
                                    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${hasEnough || !isToReview ? 'text-gray-500 bg-gray-100' : 'text-amber-600 bg-amber-50'}`}>
                                    <i className={`fa-solid ${hasEnough || !isToReview ? 'fa-paperclip' : 'fa-triangle-exclamation'}`} />
                                    {hasEnough || !isToReview ? `${uploadedFiles.length} file` : 'Cần đính kèm file'}
                                </div>
                            );
                        })()}
                        {isUploading && (
                            <div className="flex items-center gap-1.5 text-xs text-indigo-500">
                                <i className="fa-solid fa-spinner fa-spin" />
                                Đang upload...
                            </div>
                        )}
                        <div className="flex-1" />
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                        >
                            Hủy
                        </button>
                        {(() => {
                            const uploadedFiles = allFiles.filter(f => !f._pending);
                            const current = (issue.statusName || '').toLowerCase();
                            const isToReview = current !== 'review' && current !== 'done';
                            const needsFile = isToReview && uploadedFiles.length === 0;
                            return (
                                <button
                                    onClick={handleConfirm}
                                    disabled={!canSubmit || !note.trim() || submitMutation.isPending || isUploading || needsFile}
                                    className={`px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 ${!canSubmit ? 'cursor-not-allowed' : ''}`}
                                    title={needsFile ? 'Phải đính kèm ít nhất 1 file minh chứng' : !canSubmit ? 'Bạn không có quyền nộp task' : ''}
                                >
                                    {submitMutation.isPending ? (
                                        <><i className="fa-solid fa-spinner fa-spin text-xs" />Đang nộp...</>
                                    ) : (
                                        <><i className="fa-solid fa-paper-plane text-xs" />Xác nhận nộp task</>
                                    )}
                                </button>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
