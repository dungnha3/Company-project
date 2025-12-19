import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '@/shared/services/notification.service'
import CreateNotificationModal from '@/shared/components/notification/CreateNotificationModal'
import { colors, typography, spacing } from '@/shared/styles/theme'
import { useToast } from '@/shared/components/ui'

export default function NotificationsManagementPage({ glassMode = false }) {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [totalItems, setTotalItems] = useState(0)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const pageSize = 10
    const toast = useToast()

    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true)
            const response = await notificationService.getAllNotifications(page, pageSize)

            if (response?.content) {
                setNotifications(response.content)
                setTotalPages(response.totalPages || 0)
                setTotalItems(response.totalElements || 0)
            } else {
                setNotifications(response || [])
            }
        } catch (error) {
            console.error('Error loading notifications:', error)
            setNotifications([])
        } finally {
            setLoading(false)
        }
    }, [page])

    useEffect(() => {
        loadNotifications()
    }, [loadNotifications])

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) return

        try {
            await notificationService.deleteNotification(id)
            loadNotifications()
        } catch (error) {
            console.error('Error deleting notification:', error)
            toast.error('Có lỗi xảy ra khi xóa thông báo')
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getPriorityBadge = (priority) => {
        const priorityMap = {
            'KHAN_CAP': { label: 'Khẩn cấp', color: '#ef4444', bg: '#fef2f2' },
            'CAO': { label: 'Cao', color: '#f97316', bg: '#fff7ed' },
            'BINH_THUONG': { label: 'Bình thường', color: '#3b82f6', bg: '#eff6ff' },
            'THAP': { label: 'Thấp', color: '#22c55e', bg: '#f0fdf4' },
        }
        const p = priorityMap[priority] || priorityMap['BINH_THUONG']
        return (
            <span style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                color: p.color,
                background: p.bg,
                whiteSpace: 'nowrap'
            }}>
                {p.label}
            </span>
        )
    }

    const getTypeBadge = (type) => {
        const typeMap = {
            'GENERAL': '📢 Chung',
            'HE_THONG': '⚙️ Hệ thống',
            'NGHI_PHEP_CHO_DUYET': '📋 Nghỉ phép',
            'LUONG_DA_DUYET': '💰 Lương',
            'HOP_DONG_HET_HAN': '📄 Hợp đồng',
            'WELCOME_NEW_EMPLOYEE': '👋 Chào mừng',
            'SINH_NHAT': '🎂 Sinh nhật',
        }
        return typeMap[type] || type
    }

    const containerStyle = glassMode ? {
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '24px',
        minHeight: '100%'
    } : {
        padding: '24px'
    }

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>📢 Quản Lý Thông Báo</h2>
                    <p style={styles.subtitle}>Quản lý và gửi thông báo đến người dùng trong hệ thống</p>
                </div>
                <button style={styles.createBtn} onClick={() => setShowCreateModal(true)}>
                    <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i>
                    Tạo thông báo mới
                </button>
            </div>

            {/* Stats Bar */}
            <div style={styles.statsBar}>
                <div style={styles.statItem}>
                    <span style={styles.statValue}>{totalItems}</span>
                    <span style={styles.statLabel}>Tổng thông báo</span>
                </div>
                <div style={styles.statItem}>
                    <span style={{ ...styles.statValue, color: '#22c55e' }}>
                        {notifications.filter(n => n.trangThai === 'DA_DOC').length}
                    </span>
                    <span style={styles.statLabel}>Đã đọc</span>
                </div>
                <div style={styles.statItem}>
                    <span style={{ ...styles.statValue, color: '#f97316' }}>
                        {notifications.filter(n => n.trangThai === 'CHUA_DOC').length}
                    </span>
                    <span style={styles.statLabel}>Chưa đọc</span>
                </div>
            </div>

            {/* Table */}
            <div style={styles.tableContainer}>
                {loading ? (
                    <div style={styles.loading}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                        Đang tải...
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={styles.empty}>
                        <div style={styles.emptyIcon}>📭</div>
                        <div style={styles.emptyText}>Chưa có thông báo nào</div>
                        <button style={styles.emptyBtn} onClick={() => setShowCreateModal(true)}>
                            Tạo thông báo đầu tiên
                        </button>
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Tiêu đề</th>
                                <th style={styles.th}>Loại</th>
                                <th style={styles.th}>Người nhận</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Ưu tiên</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Trạng thái</th>
                                <th style={styles.th}>Ngày tạo</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notifications.map((notif) => (
                                <tr key={notif.thongbaoId} style={styles.tr}>
                                    <td style={styles.td}>
                                        <div style={styles.titleCell}>
                                            <strong>{notif.tieuDe}</strong>
                                            <div style={styles.contentPreview}>{notif.noiDung?.substring(0, 50)}...</div>
                                        </div>
                                    </td>
                                    <td style={styles.td}>{getTypeBadge(notif.loai)}</td>
                                    <td style={styles.td}>
                                        <div style={styles.userCell}>
                                            <span>{notif.nguoiNhanUsername || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>{getPriorityBadge(notif.uuTien)}</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            background: notif.trangThai === 'DA_DOC' ? '#dcfce7' : '#fef3c7',
                                            color: notif.trangThai === 'DA_DOC' ? '#16a34a' : '#d97706'
                                        }}>
                                            {notif.trangThai === 'DA_DOC' ? '✓ Đã đọc' : '○ Chưa đọc'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>{formatDate(notif.ngayTao)}</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <button
                                            style={styles.deleteBtn}
                                            onClick={() => handleDelete(notif.thongbaoId)}
                                            title="Xóa"
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <div style={styles.pageInfo}>
                        Trang {page + 1} / {totalPages} ({totalItems} thông báo)
                    </div>
                    <div style={styles.pageButtons}>
                        <button
                            style={{ ...styles.pageBtn, opacity: page === 0 ? 0.5 : 1 }}
                            onClick={() => setPage(0)}
                            disabled={page === 0}
                        >
                            <i className="fa-solid fa-angles-left"></i>
                        </button>
                        <button
                            style={{ ...styles.pageBtn, opacity: page === 0 ? 0.5 : 1 }}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>

                        {/* Page Numbers */}
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            let pageNum = page - 2 + i
                            if (pageNum < 0) pageNum = i
                            if (pageNum >= totalPages) return null

                            return (
                                <button
                                    key={pageNum}
                                    style={{
                                        ...styles.pageBtn,
                                        ...(pageNum === page ? styles.pageBtnActive : {})
                                    }}
                                    onClick={() => setPage(pageNum)}
                                >
                                    {pageNum + 1}
                                </button>
                            )
                        })}

                        <button
                            style={{ ...styles.pageBtn, opacity: page === totalPages - 1 ? 0.5 : 1 }}
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                        >
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                        <button
                            style={{ ...styles.pageBtn, opacity: page === totalPages - 1 ? 0.5 : 1 }}
                            onClick={() => setPage(totalPages - 1)}
                            disabled={page === totalPages - 1}
                        >
                            <i className="fa-solid fa-angles-right"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            <CreateNotificationModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    loadNotifications()
                    setShowCreateModal(false)
                }}
            />
        </div>
    )
}

const styles = {
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    title: {
        margin: 0,
        fontSize: '24px',
        fontWeight: 700,
        color: '#1e293b',
    },
    subtitle: {
        margin: '4px 0 0 0',
        fontSize: '14px',
        color: '#64748b',
    },
    createBtn: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
        transition: 'all 0.2s',
    },
    statsBar: {
        display: 'flex',
        gap: '20px',
        marginBottom: '24px',
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        minWidth: '120px',
    },
    statValue: {
        fontSize: '28px',
        fontWeight: 700,
        color: '#1e293b',
    },
    statLabel: {
        fontSize: '13px',
        color: '#64748b',
        marginTop: '4px',
    },
    tableContainer: {
        background: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        textAlign: 'left',
        padding: '16px',
        background: '#f8fafc',
        color: '#64748b',
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '1px solid #e2e8f0',
    },
    tr: {
        transition: 'background 0.15s',
        cursor: 'default',
    },
    td: {
        padding: '16px',
        borderBottom: '1px solid #f1f5f9',
        fontSize: '14px',
        color: '#334155',
    },
    titleCell: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    contentPreview: {
        fontSize: '12px',
        color: '#94a3b8',
        maxWidth: '250px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    userCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    deleteBtn: {
        padding: '8px 12px',
        border: 'none',
        borderRadius: '8px',
        background: '#fef2f2',
        color: '#ef4444',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    loading: {
        padding: '48px',
        textAlign: 'center',
        color: '#64748b',
    },
    empty: {
        padding: '64px',
        textAlign: 'center',
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px',
    },
    emptyText: {
        fontSize: '16px',
        color: '#64748b',
        marginBottom: '24px',
    },
    emptyBtn: {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    pagination: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        background: 'white',
        borderTop: '1px solid #f1f5f9',
    },
    pageInfo: {
        fontSize: '14px',
        color: '#64748b',
    },
    pageButtons: {
        display: 'flex',
        gap: '8px',
    },
    pageBtn: {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        background: 'white',
        color: '#64748b',
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontSize: '14px',
    },
    pageBtnActive: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
    },
}
