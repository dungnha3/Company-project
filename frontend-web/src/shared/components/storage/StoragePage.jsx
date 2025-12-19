import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { storageApi } from '@/features/project/storage/api/storageApi';
import { useToast } from '@/shared/components/ui';

// Modern SaaS Storage Page Component
export default function SharedStoragePage({
    title = "Quản lý file",
    breadcrumb = "Cá nhân / File của tôi",
    viewMode = "personal",
    projectId = null
}) {
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [currentFolderName, setCurrentFolderName] = useState('');
    const [folderPath, setFolderPath] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;
    const [storageStats, setStorageStats] = useState({
        totalFiles: 0,
        totalFolders: 0,
        totalSize: 0,
        quotaLimit: 5 * 1024 * 1024 * 1024,
        usagePercentage: 0,
        fileTypes: 0
    });

    const [filter, setFilter] = useState('all'); // 'all' | 'project' | 'personal' | 'company'

    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameData, setRenameData] = useState({ id: null, name: '', type: '' }); // type: 'file' | 'folder'
    const [newName, setNewName] = useState('');

    const { user: authUser } = useAuth();
    const toast = useToast();

    useEffect(() => {
        loadStorageData();
        loadStorageStats();
        setSelectedItems([]);
        setCurrentPage(1); // Reset to first page when folder changes
    }, [currentFolderId, viewMode, projectId, filter]);

    // Reset to page 1 when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const navigateToFolder = (folderId, folderName) => {
        setCurrentFolderId(folderId);
        setCurrentFolderName(folderName);
        setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
    };

    const navigateToPath = (index) => {
        if (index === -1) {
            setCurrentFolderId(null);
            setCurrentFolderName('');
            setFolderPath([]);
        } else {
            const targetFolder = folderPath[index];
            setCurrentFolderId(targetFolder.id);
            setCurrentFolderName(targetFolder.name);
            setFolderPath(folderPath.slice(0, index + 1));
        }
    };

    const loadStorageStats = async () => {
        try {
            const stats = await storageApi.getStorageStats();
            if (stats) {
                setStorageStats({
                    totalFiles: stats.totalFiles || 0,
                    totalFolders: stats.totalFolders || 0,
                    usagePercentage: stats.usagePercentage || 0,
                    fileTypes: stats.fileTypes || 0
                });
            }
        } catch (err) {
            console.log('Could not load storage stats:', err);
        }
    };

    const loadStorageData = async () => {
        try {
            setLoading(true);
            setError(null);

            let loadedFolders = [];
            let loadedFiles = [];

            if (currentFolderId) {
                const [subfoldersRes, filesRes] = await Promise.all([
                    storageApi.getSubFolders(currentFolderId),
                    storageApi.getFolderFiles(currentFolderId)
                ]);

                loadedFolders = subfoldersRes.map(f => ({
                    folderId: f.folderId,
                    folderName: f.name,
                    fileCount: f.fileCount || 0,
                    createdDate: f.createdAt,
                    ownerName: f.ownerName
                }));

                loadedFiles = filesRes;
            } else {
                if (viewMode === "project" && projectId) {
                    const [foldersRes, filesRes] = await Promise.all([
                        storageApi.getProjectFolders(projectId),
                        storageApi.getMyFiles('project')
                    ]);

                    loadedFolders = foldersRes.map(f => ({
                        folderId: f.folderId,
                        folderName: f.name,
                        fileCount: f.fileCount || 0,
                        createdDate: f.createdAt,
                        ownerName: f.ownerName
                    }));

                    loadedFiles = filesRes.filter(file => !file.folderId && file.projectId === projectId);
                } else {
                    // Use Selected Filter
                    const [foldersRes, filesRes] = await Promise.all([
                        storageApi.getMyFolders(filter),
                        storageApi.getMyFiles(filter)
                    ]);

                    loadedFolders = foldersRes.map(f => ({
                        folderId: f.folderId,
                        folderName: f.name,
                        fileCount: f.fileCount || 0,
                        createdDate: f.createdAt,
                        ownerName: f.ownerName
                    }));

                    loadedFiles = filesRes.filter(file => !file.folderId);
                }
            }

            setFolders(loadedFolders);
            setFiles(loadedFiles);
            setLoading(false);
        } catch (err) {
            console.error('Error loading storage data:', err);
            setError(err.message || 'Không thể tải dữ liệu');
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const uploadedFiles = Array.from(event.target.files);
        if (uploadedFiles.length === 0) return;

        try {
            setUploading(true);
            for (const file of uploadedFiles) {
                await storageApi.uploadFile(file, currentFolderId);
            }
            toast.success(`Đã upload ${uploadedFiles.length} file thành công!`);
            loadStorageData();
            loadStorageStats();
        } catch (err) {
            toast.error('Lỗi upload file: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            toast.warning('Vui lòng nhập tên thư mục');
            return;
        }

        try {
            await storageApi.createFolder({
                name: newFolderName,
                parentFolderId: currentFolderId,
                folderType: viewMode === 'project' ? 'PROJECT' : 'PERSONAL',
                projectId: viewMode === 'project' ? projectId : null
            });

            toast.success(`Đã tạo thư mục "${newFolderName}" thành công!`);
            setNewFolderName('');
            setShowCreateFolderModal(false);
            loadStorageData();
        } catch (err) {
            toast.error('Lỗi tạo thư mục: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleOpenRename = (id, currentName, type) => {
        setRenameData({ id, name: currentName, type });
        setNewName(currentName);
        setShowRenameModal(true);
    };

    const handleRename = async () => {
        if (!newName.trim()) {
            toast.warning('Vui lòng nhập tên mới');
            return;
        }

        try {
            if (renameData.type === 'folder') {
                await storageApi.updateFolder(renameData.id, newName);
            } else {
                await storageApi.renameFile(renameData.id, newName);
            }

            toast.success('Đổi tên thành công!');
            setShowRenameModal(false);
            loadStorageData();
        } catch (err) {
            toast.error('Lỗi đổi tên: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleRestore = async (fileId) => {
        try {
            await storageApi.restoreFile(fileId);
            toast.success('Khôi phục thành công!');
            loadStorageData();
            loadStorageStats();
        } catch (err) {
            toast.error('Lỗi khôi phục: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDownload = async (fileId, filename) => {
        try {
            const blob = await storageApi.downloadFile(fileId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            toast.error('Lỗi tải file: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (fileId, filename, permanent = false) => {
        if (!window.confirm(permanent ? `⚠️ CẢNH BÁO: Bạn có chắc muốn xóa VĨNH VIỄN file "${filename}"? Hành động này không thể hoàn tác!` : `Bạn có chắc muốn xóa file "${filename}"?`)) return;

        try {
            await storageApi.deleteFile(fileId, permanent);
            loadStorageData();
            loadStorageStats();
        } catch (err) {
            toast.error('Lỗi xóa file: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteFolder = async (folderId, folderName) => {
        if (!window.confirm(`Bạn có chắc muốn xóa thư mục "${folderName}"` + (filter === 'trash' ? " vĩnh viễn?" : "?"))) return;
        // NOTE: Folder API currently doesn't allow explicit permanent delete param in this setup, or does it?
        // Checking StorageController: deleteFolder -> folderService.deleteFolder -> repository.delete calls.
        // It seems deleteFolder is always PERMANENT in current backend because Folder doesn't have isDeleted?
        // Wait, Folder entity typically should have Soft Delete too.
        // Checking Folder Entity? Not available here.
        // StorageController:
        // @DeleteMapping("/folders/{folderId}") ... folderService.deleteFolder(folderId, userId);
        // It seems Folder deletion is direct in current BE.

        try {
            await storageApi.deleteFolder(folderId);
            loadStorageData();
        } catch (err) {
            toast.error('Lỗi xóa thư mục: ' + (err.response?.data?.message || err.message));
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileExtension = (filename) => {
        const ext = filename.split('.').pop().toUpperCase();
        return ext.length > 4 ? ext.substring(0, 4) : ext;
    };

    const getFileColor = (mimeType) => {
        if (!mimeType) return { bg: '#64748b', light: '#f1f5f9' };
        if (mimeType.includes('pdf')) return { bg: '#ef4444', light: '#fee2e2' };
        if (mimeType.includes('word') || mimeType.includes('document')) return { bg: '#3b82f6', light: '#dbeafe' };
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return { bg: '#22c55e', light: '#dcfce7' };
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return { bg: '#f97316', light: '#ffedd5' };
        if (mimeType.includes('image')) return { bg: '#a855f7', light: '#f3e8ff' };
        if (mimeType.includes('video')) return { bg: '#ec4899', light: '#fce7f3' };
        if (mimeType.includes('audio')) return { bg: '#f59e0b', light: '#fef3c7' };
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return { bg: '#6366f1', light: '#e0e7ff' };
        return { bg: '#64748b', light: '#f1f5f9' };
    };

    const filteredFiles = files.filter(file =>
        file.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFolders = folders.filter(folder =>
        folder.folderName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Combine folders and files for pagination
    const allItems = [
        ...filteredFolders.map(f => ({ type: 'folder', data: f })),
        ...filteredFiles.map(f => ({ type: 'file', data: f }))
    ];

    // Pagination logic
    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = allItems.slice(startIndex, endIndex);

    const handleToggleItem = (type, id) => {
        const itemKey = `${type}-${id}`;
        setSelectedItems(prev =>
            prev.includes(itemKey)
                ? prev.filter(item => item !== itemKey)
                : [...prev, itemKey]
        );
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            // Only select items on current page
            const pageItems = paginatedItems.map(item =>
                item.type === 'folder'
                    ? `folder-${item.data.folderId}`
                    : `file-${item.data.fileId}`
            );
            setSelectedItems(pageItems);
        } else {
            setSelectedItems([]);
        }
    };

    const isAllSelected = paginatedItems.length > 0 &&
        paginatedItems.every(item =>
            selectedItems.includes(
                item.type === 'folder'
                    ? `folder-${item.data.folderId}`
                    : `file-${item.data.fileId}`
            )
        );

    // Stats from Backend API (total across all folders)
    const totalSize = storageStats.totalSize;
    const fileCount = storageStats.totalFiles;
    const folderCount = storageStats.totalFolders;
    const usagePercent = storageStats.usagePercentage;
    const fileTypes = storageStats.fileTypes;

    // ===================== STYLES =====================
    const styles = {
        container: {
            padding: '32px',
            minHeight: '100vh',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        },
        header: {
            marginBottom: '32px'
        },
        breadcrumb: {
            fontSize: '12px',
            color: '#64748b',
            marginBottom: '8px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        titleRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
        },
        title: {
            fontSize: '28px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0
        },
        buttonGroup: {
            display: 'flex',
            gap: '12px'
        },
        primaryBtn: {
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            transition: 'all 0.2s ease'
        },
        secondaryBtn: {
            background: '#fff',
            color: '#6366f1',
            border: '2px solid #e0e7ff',
            borderRadius: '12px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '28px'
        },
        statCard: {
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            transition: 'all 0.2s ease'
        },
        statIconWrapper: {
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0
        },
        statContent: {
            flex: 1
        },
        statValue: {
            fontSize: '28px',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.2,
            marginBottom: '4px'
        },
        statLabel: {
            fontSize: '13px',
            color: '#64748b',
            fontWeight: 500
        },
        progressBar: {
            height: '6px',
            background: '#f1f5f9',
            borderRadius: '3px',
            overflow: 'hidden',
            marginTop: '12px'
        },
        progressFill: {
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
            borderRadius: '3px',
            transition: 'width 0.3s ease'
        },
        toolbar: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap'
        },
        searchWrapper: {
            position: 'relative',
            flex: '1',
            maxWidth: '400px'
        },
        searchIcon: {
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            fontSize: '18px',
            pointerEvents: 'none'
        },
        searchInput: {
            width: '100%',
            padding: '12px 16px 12px 48px',
            fontSize: '14px',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            background: '#fff',
            color: '#334155',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box'
        },
        pathNav: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        pathBtn: {
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#fff',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
        },
        pathBtnActive: {
            background: '#6366f1',
            color: '#fff',
            border: '1px solid #6366f1'
        },
        table: {
            background: '#fff',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
            border: '1px solid #f1f5f9'
        },
        tableHeader: {
            display: 'grid',
            gridTemplateColumns: filter === 'trash' ? '48px 48px 1fr 100px 120px' : '48px 48px 1fr 150px 120px 100px 120px',
            padding: '14px 20px',
            background: '#fafafa',
            borderBottom: '1px solid #f1f5f9',
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        tableRow: {
            display: 'grid',
            gridTemplateColumns: filter === 'trash' ? '48px 48px 1fr 100px 120px' : '48px 48px 1fr 150px 120px 100px 120px',
            padding: '16px 20px',
            borderBottom: '1px solid #f8fafc',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s ease'
        },
        tableRowHover: {
            background: '#f8fafc'
        },
        fileIcon: {
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#fff'
        },
        folderIcon: {
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
        },
        fileName: {
            fontSize: '14px',
            fontWeight: 500,
            color: '#1e293b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        },
        fileMeta: {
            fontSize: '13px',
            color: '#64748b'
        },
        actionBtns: {
            display: 'flex',
            gap: '8px',
            opacity: 1, // Always visible
            transition: 'opacity 0.15s ease'
        },
        actionBtnsVisible: {
            opacity: 1
        },
        actionBtn: {
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: '#f1f5f9',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            transition: 'all 0.15s ease'
        },
        actionBtnDanger: {
            background: '#fee2e2',
            color: '#dc2626'
        },
        emptyState: {
            textAlign: 'center',
            padding: '64px 32px',
            color: '#64748b'
        },
        emptyIcon: {
            fontSize: '64px',
            marginBottom: '16px',
            opacity: 0.5
        },
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        modalContent: {
            background: '#fff',
            borderRadius: '20px',
            padding: '32px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
        },
        modalTitle: {
            fontSize: '20px',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '20px'
        },
        modalInput: {
            width: '100%',
            padding: '14px 16px',
            fontSize: '14px',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            outline: 'none',
            marginBottom: '20px',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease'
        },
        modalBtns: {
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
        },
        checkbox: {
            width: '18px',
            height: '18px',
            cursor: 'pointer',
            accentColor: '#6366f1'
        },
        bulkBar: {
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
        },
        bulkBtn: {
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.15s ease'
        }
    };

    // ===================== RENDER =====================
    if (loading) {
        return (
            <div style={styles.container}>
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <div style={{ fontSize: '16px', color: '#64748b' }}>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                    <div style={{ fontSize: '16px', color: '#ef4444', marginBottom: '20px' }}>{error}</div>
                    <button onClick={loadStorageData} style={styles.primaryBtn}>🔄 Thử lại</button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.breadcrumb}>{breadcrumb}</div>
                <div style={styles.titleRow}>
                    <h1 style={styles.title}>{title}</h1>
                    <div style={styles.buttonGroup}>
                        <button
                            style={styles.secondaryBtn}
                            onClick={() => setShowCreateFolderModal(true)}
                        >
                            📁 Tạo thư mục
                        </button>
                        <label style={styles.primaryBtn}>
                            {uploading ? '⏳ Đang upload...' : '📤 Upload file'}
                            <input
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                disabled={uploading}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* Breadcrumb Navigation */}
            {
                folderPath.length > 0 && (
                    <div style={styles.pathNav}>
                        <button
                            style={styles.pathBtn}
                            onClick={() => navigateToPath(-1)}
                        >
                            🏠 Thư mục gốc
                        </button>
                        {folderPath.map((folder, index) => (
                            <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#cbd5e1' }}>→</span>
                                <button
                                    onClick={() => navigateToPath(index)}
                                    style={{
                                        ...styles.pathBtn,
                                        ...(index === folderPath.length - 1 ? styles.pathBtnActive : {})
                                    }}
                                >
                                    📁 {folder.name}
                                </button>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIconWrapper, background: '#dbeafe' }}>
                        <span style={{ color: '#3b82f6' }}>📎</span>
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{fileCount}</div>
                        <div style={styles.statLabel}>Tổng số file</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIconWrapper, background: '#fef3c7' }}>
                        <span style={{ color: '#f59e0b' }}>📁</span>
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{folderCount}</div>
                        <div style={styles.statLabel}>Thư mục</div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIconWrapper, background: '#f3e8ff' }}>
                        <span style={{ color: '#a855f7' }}>💾</span>
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{formatFileSize(totalSize)}</div>
                        <div style={styles.statLabel}>Dung lượng đã dùng</div>
                        <div style={styles.progressBar}>
                            <div style={{ ...styles.progressFill, width: `${usagePercent}%` }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                            {formatFileSize(totalSize)} / {formatFileSize(storageStats.quotaLimit)}
                        </div>
                    </div>
                </div>

                <div style={styles.statCard}>
                    <div style={{ ...styles.statIconWrapper, background: '#dcfce7' }}>
                        <span style={{ color: '#22c55e' }}>📋</span>
                    </div>
                    <div style={styles.statContent}>
                        <div style={styles.statValue}>{fileTypes}</div>
                        <div style={styles.statLabel}>Loại file</div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div style={styles.toolbar}>
                {!currentFolderId && viewMode !== 'project' && (
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {['all', 'project', 'personal', 'company', 'trash'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: filter === f ? '#6366f1' : '#f1f5f9',
                                    color: filter === f ? '#fff' : '#64748b',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    textTransform: 'capitalize',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {f === 'all' ? 'Tất cả' : f === 'project' ? 'Project' : f === 'personal' ? 'Cá nhân' : f === 'company' ? 'Công ty' : 'Thùng rác'}
                            </button>
                        ))}
                    </div>
                )}

                <div style={styles.searchWrapper}>
                    <span style={styles.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm file hoặc thư mục..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* Content Table */}
            <div style={styles.table}>
                <div style={styles.tableHeader}>
                    <div></div>
                    <div>Loại</div>
                    <div>Tên</div>
                    {filter !== 'trash' && <div>Người tạo</div>}
                    {filter !== 'trash' && <div>Ngày tạo</div>}
                    <div>Kích thước</div>
                    <div>Thao tác</div>
                </div>

                {paginatedItems.map(item => {
                    const isFolder = item.type === 'folder';
                    const data = item.data;
                    const id = isFolder ? data.folderId : data.fileId;
                    const isSelected = selectedItems.includes(`${item.type}-${id}`);

                    if (isFolder) {
                        return (
                            <div
                                key={`folder-${data.folderId}`}
                                style={{ ...styles.tableRow, ...(hoveredRow === `folder-${data.folderId}` ? styles.tableRowHover : {}) }}
                                onMouseEnter={() => setHoveredRow(`folder-${data.folderId}`)}
                                onMouseLeave={() => setHoveredRow(null)}
                                onClick={() => navigateToFolder(data.folderId, data.folderName)}
                            >
                                <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleItem('folder', data.folderId)}
                                        style={styles.checkbox}
                                    />
                                </div>
                                <div style={styles.folderIcon}>📁</div>
                                <div style={styles.fileName}>{data.folderName}</div>
                                {filter !== 'trash' && <div style={{ fontSize: '13px', color: '#64748b' }}>{data.ownerName || 'Tôi'}</div>}
                                {filter !== 'trash' && <div style={{ fontSize: '13px', color: '#64748b' }}>{new Date(data.createdDate).toLocaleDateString('vi-VN')}</div>}
                                <div style={styles.fileMeta}>{data.fileCount} mục</div>
                                <div
                                    style={{
                                        ...styles.actionBtns,
                                        ...(hoveredRow === `folder-${data.folderId}` ? styles.actionBtnsVisible : {})
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {filter !== 'trash' && (
                                        <button
                                            style={styles.actionBtn}
                                            title="Đổi tên"
                                            onClick={() => handleOpenRename(data.folderId, data.folderName, 'folder')}
                                        >
                                            ✏️
                                        </button>
                                    )}
                                    <button
                                        style={{ ...styles.actionBtn, ...styles.actionBtnDanger }}
                                        title={filter === 'trash' ? "Xóa vĩnh viễn" : "Xóa"}
                                        onClick={() => handleDeleteFolder(data.folderId, data.folderName, filter === 'trash')}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    } else {
                        const color = getFileColor(data.mimeType);
                        return (
                            <div
                                key={`file-${data.fileId}`}
                                style={{ ...styles.tableRow, ...(hoveredRow === `file-${data.fileId}` ? styles.tableRowHover : {}) }}
                                onMouseEnter={() => setHoveredRow(`file-${data.fileId}`)}
                                onMouseLeave={() => setHoveredRow(null)}
                                onDoubleClick={() => filter !== 'trash' && handleDownload(data.fileId, data.originalFilename)}
                            >
                                <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleItem('file', data.fileId)}
                                        style={styles.checkbox}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ ...styles.fileIcon, background: color.bg }}>
                                        {getFileExtension(data.originalFilename)}
                                    </div>
                                </div>
                                <div>
                                    <div style={styles.fileName}>{data.originalFilename}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{getFileExtension(data.originalFilename)}</div>
                                </div>
                                {filter !== 'trash' && <div style={{ fontSize: '13px', color: '#64748b' }}>{data.ownerName || 'Tôi'}</div>}
                                {filter !== 'trash' && <div style={{ fontSize: '13px', color: '#64748b' }}>{new Date(data.createdAt).toLocaleDateString('vi-VN')}</div>}
                                <div style={styles.fileMeta}>{formatFileSize(data.fileSize)}</div>
                                <div
                                    style={{
                                        ...styles.actionBtns,
                                        ...(hoveredRow === `file-${data.fileId}` ? styles.actionBtnsVisible : {})
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {filter !== 'trash' ? (
                                        <>
                                            <button
                                                style={styles.actionBtn}
                                                title="Đổi tên"
                                                onClick={() => handleOpenRename(data.fileId, data.originalFilename, 'file')}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                style={styles.actionBtn}
                                                title="Tải xuống"
                                                onClick={() => handleDownload(data.fileId, data.originalFilename)}
                                            >
                                                ⬇️
                                            </button>
                                            <button
                                                style={{ ...styles.actionBtn, ...styles.actionBtnDanger }}
                                                title="Xóa"
                                                onClick={() => handleDelete(data.fileId, data.originalFilename, false)}
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                style={{ ...styles.actionBtn, background: '#dcfce7', color: '#16a34a' }}
                                                title="Khôi phục"
                                                onClick={() => handleRestore(data.fileId)}
                                            >
                                                ♻️
                                            </button>
                                            <button
                                                style={{ ...styles.actionBtn, ...styles.actionBtnDanger }}
                                                title="Xóa vĩnh viễn"
                                                onClick={() => handleDelete(data.fileId, data.originalFilename, true)}
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    }
                })}

                {paginatedItems.length === 0 && (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>{filter === 'trash' ? '🗑️' : '📂'}</div>
                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#0f172a' }}>
                            {filter === 'trash' ? 'Thùng rác trống' : 'Thư mục trống'}
                        </div>
                        <div style={{ fontSize: '14px', marginTop: '8px' }}>
                            {filter === 'trash' ? 'Các file đã xóa sẽ xuất hiện ở đây' : 'Chưa có file hoặc thư mục nào được tạo'}
                        </div>
                    </div>
                )}
            </div>



            {/* Bulk Action Bar */}
            {
                selectedItems.length > 0 && (
                    <div style={styles.bulkBar}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontWeight: 600 }}>Đã chọn: {selectedItems.length}</span>
                            <button
                                onClick={() => setSelectedItems([])}
                                style={{ ...styles.bulkBtn, background: 'transparent', padding: '4px 8px' }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={async () => {
                                    const fileIds = selectedItems.filter(i => i.startsWith('file-')).map(i => parseInt(i.replace('file-', '')));
                                    for (const id of fileIds) {
                                        const file = files.find(f => f.fileId === id);
                                        if (file) await handleDownload(id, file.originalFilename);
                                    }
                                }}
                                style={styles.bulkBtn}
                            >
                                ⬇️ Tải về
                            </button>
                            <button
                                onClick={async () => {
                                    if (!window.confirm(`Xóa ${selectedItems.length} item?`)) return;
                                    const fileIds = selectedItems.filter(i => i.startsWith('file-')).map(i => parseInt(i.replace('file-', '')));
                                    const folderIds = selectedItems.filter(i => i.startsWith('folder-')).map(i => parseInt(i.replace('folder-', '')));
                                    for (const id of fileIds) await storageApi.deleteFile(id, false);
                                    for (const id of folderIds) await storageApi.deleteFolder(id);
                                    setSelectedItems([]);
                                    loadStorageData();
                                }}
                                style={{ ...styles.bulkBtn, background: '#dc2626' }}
                            >
                                🗑️ Xóa
                            </button>
                        </div>
                    </div>
                )
            }


            {/* Pagination Footer - Style matching EmployeesPage */}
            {totalPages > 0 && (
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#ffffff',
                    borderRadius: '16px'
                }}>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                        Hiển thị <b>{startIndex + 1}</b> - <b>{Math.min(endIndex, totalItems)}</b> trên tổng <b>{totalItems}</b>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                border: '1px solid #e2e8f0', background: 'white', padding: '6px 10px',
                                borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                color: currentPage === 1 ? '#cbd5e1' : '#475569', display: 'flex'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>

                        {/* Page Numbers */}
                        {[...Array(totalPages)].map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentPage(idx + 1)}
                                style={{
                                    border: currentPage === idx + 1 ? 'none' : '1px solid #e2e8f0',
                                    background: currentPage === idx + 1 ? '#3b82f6' : 'white',
                                    color: currentPage === idx + 1 ? 'white' : '#475569',
                                    width: 32, height: 32, borderRadius: 6, fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {idx + 1}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                border: '1px solid #e2e8f0', background: 'white', padding: '6px 10px',
                                borderRadius: 6, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                color: currentPage === totalPages ? '#cbd5e1' : '#475569', display: 'flex'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Create Folder Modal */}
            {
                showCreateFolderModal && (
                    <div style={styles.modal} onClick={() => setShowCreateFolderModal(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <h3 style={styles.modalTitle}>📁 Tạo thư mục mới</h3>
                            <input
                                type="text"
                                placeholder="Nhập tên thư mục..."
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                style={styles.modalInput}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            />
                            <div style={styles.modalBtns}>
                                <button
                                    style={styles.secondaryBtn}
                                    onClick={() => { setShowCreateFolderModal(false); setNewFolderName(''); }}
                                >
                                    Hủy
                                </button>
                                <button
                                    style={styles.primaryBtn}
                                    onClick={handleCreateFolder}
                                >
                                    ✓ Tạo thư mục
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Rename Modal */}
            {
                showRenameModal && (
                    <div style={styles.modal} onClick={() => setShowRenameModal(false)}>
                        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <h3 style={styles.modalTitle}>✏️ Đổi tên {renameData.type === 'folder' ? 'thư mục' : 'file'}</h3>
                            <input
                                type="text"
                                placeholder="Nhập tên mới..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                style={styles.modalInput}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            />
                            <div style={styles.modalBtns}>
                                <button
                                    style={styles.secondaryBtn}
                                    onClick={() => { setShowRenameModal(false); setNewName(''); }}
                                >
                                    Hủy
                                </button>
                                <button
                                    style={styles.primaryBtn}
                                    onClick={handleRename}
                                >
                                    ✓ Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
