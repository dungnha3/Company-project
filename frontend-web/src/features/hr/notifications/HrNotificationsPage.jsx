import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '@/shared/services/notification.service'
import CreateNotificationModal from '@/shared/components/notification/CreateNotificationModal'
import { useToast } from '@/shared/components/ui'
import './HrNotificationsPage.css'

export default function HrNotificationsPage() {
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
            // HR uses same API as their own notifications for now
            const response = await notificationService.getMyNotifications(page, pageSize)
            if (Array.isArray(response)) {
                setNotifications(response)
                setTotalItems(response.length)
                setTotalPages(Math.ceil(response.length / pageSize))
            } else if (response?.content) {
                setNotifications(response.content)
                setTotalPages(response.totalPages || 0)
                setTotalItems(response.totalElements || 0)
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
            'KHAN_CAP': { label: 'Khẩn cấp', className: 'priority-urgent' },
            'CAO': { label: 'Cao', className: 'priority-high' },
            'BINH_THUONG': { label: 'Bình thường', className: 'priority-normal' },
            'THAP': { label: 'Thấp', className: 'priority-low' },
        }
        const p = priorityMap[priority] || priorityMap['BINH_THUONG']
        return <span className={`hr-notif-badge ${p.className}`}>{p.label}</span>
    }

    const getTypeBadge = (type) => {
        const typeMap = {
            'GENERAL': '📢 Chung',
            'HE_THONG': '⚙️ Hệ thống',
            'NGHI_PHEP_CHO_DUYET': '📋 Nghỉ phép',
            'NGHI_PHEP_DA_DUYET': '✅ Đã duyệt',
            'LUONG_DA_DUYET': '💰 Lương',
            'HOP_DONG_HET_HAN': '📄 Hợp đồng',
            'WELCOME_NEW_EMPLOYEE': '👋 Chào mừng',
            'SINH_NHAT': '🎂 Sinh nhật',
        }
        return typeMap[type] || type
    }

    return (
        <div className="hr-notif-container">
            {/* Header */}
            <div className="hr-notif-header">
                <div>
                    <h2 className="hr-notif-title">📢 Quản Lý Thông Báo</h2>
                    <p className="hr-notif-subtitle">Xem và gửi thông báo đến nhân viên</p>
                </div>
                <button className="hr-notif-create-btn" onClick={() => setShowCreateModal(true)}>
                    <i className="fa-solid fa-plus"></i>
                    Tạo thông báo mới
                </button>
            </div>

            {/* Stats */}
            <div className="hr-notif-stats">
                <div className="hr-notif-stat-card">
                    <span className="hr-notif-stat-value">{totalItems}</span>
                    <span className="hr-notif-stat-label">Tổng thông báo</span>
                </div>
                <div className="hr-notif-stat-card">
                    <span className="hr-notif-stat-value text-green">
                        {notifications.filter(n => n.isRead || n.trangThai === 'DA_DOC').length}
                    </span>
                    <span className="hr-notif-stat-label">Đã đọc</span>
                </div>
                <div className="hr-notif-stat-card">
                    <span className="hr-notif-stat-value text-orange">
                        {notifications.filter(n => !n.isRead && n.trangThai !== 'DA_DOC').length}
                    </span>
                    <span className="hr-notif-stat-label">Chưa đọc</span>
                </div>
            </div>

            {/* Table */}
            <div className="hr-notif-table-container">
                {loading ? (
                    <div className="hr-notif-loading">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        Đang tải...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="hr-notif-empty">
                        <div className="hr-notif-empty-icon">📭</div>
                        <div className="hr-notif-empty-text">Chưa có thông báo nào</div>
                        <button className="hr-notif-create-btn" onClick={() => setShowCreateModal(true)}>
                            Tạo thông báo đầu tiên
                        </button>
                    </div>
                ) : (
                    <table className="hr-notif-table">
                        <thead>
                            <tr>
                                <th>Tiêu đề</th>
                                <th>Loại</th>
                                <th className="text-center">Ưu tiên</th>
                                <th className="text-center">Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th className="text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notifications.map((notif) => (
                                <tr key={notif.notificationId || notif.thongbaoId}>
                                    <td>
                                        <div className="hr-notif-title-cell">
                                            <strong>{notif.title || notif.tieuDe}</strong>
                                            <span className="hr-notif-preview">{(notif.content || notif.noiDung)?.substring(0, 50)}...</span>
                                        </div>
                                    </td>
                                    <td>{getTypeBadge(notif.type || notif.loai)}</td>
                                    <td className="text-center">{getPriorityBadge(notif.uuTien || 'BINH_THUONG')}</td>
                                    <td className="text-center">
                                        <span className={`hr-notif-badge ${(notif.isRead || notif.trangThai === 'DA_DOC') ? 'status-read' : 'status-unread'}`}>
                                            {(notif.isRead || notif.trangThai === 'DA_DOC') ? '✓ Đã đọc' : '○ Chưa đọc'}
                                        </span>
                                    </td>
                                    <td>{formatDate(notif.createdAt || notif.ngayTao)}</td>
                                    <td className="text-center">
                                        <button
                                            className="hr-notif-delete-btn"
                                            onClick={() => handleDelete(notif.notificationId || notif.thongbaoId)}
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
                <div className="hr-notif-pagination">
                    <div className="hr-notif-page-info">
                        Trang {page + 1} / {totalPages} ({totalItems} thông báo)
                    </div>
                    <div className="hr-notif-page-buttons">
                        <button
                            className="hr-notif-page-btn"
                            onClick={() => setPage(0)}
                            disabled={page === 0}
                        >
                            <i className="fa-solid fa-angles-left"></i>
                        </button>
                        <button
                            className="hr-notif-page-btn"
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>

                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            let pageNum = page - 2 + i
                            if (pageNum < 0) pageNum = i
                            if (pageNum >= totalPages) return null

                            return (
                                <button
                                    key={pageNum}
                                    className={`hr-notif-page-btn ${pageNum === page ? 'active' : ''}`}
                                    onClick={() => setPage(pageNum)}
                                >
                                    {pageNum + 1}
                                </button>
                            )
                        })}

                        <button
                            className="hr-notif-page-btn"
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                        >
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                        <button
                            className="hr-notif-page-btn"
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
