import { useState, useEffect } from 'react'
import { notificationService } from '@/shared/services/notification.service'
import { usersService } from '@/shared/services/users.service'
import { colors, typography, spacing } from '@/shared/styles/theme'

// Notification types matching backend LoaiThongBao enum EXACTLY
const NOTIFICATION_TYPES = [
    { value: 'GENERAL', label: '📢 Thông báo chung' },
    { value: 'SYSTEM_MAINTENANCE', label: '⚙️ Bảo trì hệ thống' },
    { value: 'NGHI_PHEP_CHO_DUYET', label: '📋 Nghỉ phép cần duyệt' },
    { value: 'NGHI_PHEP_DA_DUYET', label: '✅ Nghỉ phép đã duyệt' },
    { value: 'NGHI_PHEP_TU_CHOI', label: '❌ Nghỉ phép từ chối' },
    { value: 'LUONG_DA_DUYET', label: '💰 Lương đã duyệt' },
    { value: 'LUONG_DA_THANH_TOAN', label: '💵 Lương đã thanh toán' },
    { value: 'HOP_DONG_HET_HAN', label: '📄 Hợp đồng hết hạn' },
    { value: 'WELCOME_NEW_EMPLOYEE', label: '👋 Chào mừng nhân viên mới' },
    { value: 'SINH_NHAT', label: '🎂 Sinh nhật' },
    { value: 'PROJECT_ASSIGNED', label: '📁 Được giao dự án' },
    { value: 'PROJECT_DEADLINE', label: '⏰ Deadline dự án' },
    { value: 'DANH_GIA_NHAN_VIEN', label: '⭐ Đánh giá nhân viên' },
]

const PRIORITY_LEVELS = [
    { value: 'THAP', label: '🟢 Thấp' },
    { value: 'BINH_THUONG', label: '🟡 Bình thường' },
    { value: 'CAO', label: '🟠 Cao' },
    { value: 'KHAN_CAP', label: '🔴 Khẩn cấp' },
]

export default function CreateNotificationModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        loai: 'GENERAL',
        tieuDe: '',
        noiDung: '',
        nguoiNhanId: '',
        urlLienKet: '',
        uuTien: 'BINH_THUONG',
        guiEmail: false,
    })
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (isOpen) {
            loadUsers()
        }
    }, [isOpen])

    const loadUsers = async () => {
        try {
            setLoadingUsers(true)
            const data = await usersService.getAll()
            setUsers(data || [])
        } catch (err) {
            console.error('Error loading users:', err)
        } finally {
            setLoadingUsers(false)
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.tieuDe.trim()) {
            setError('Vui lòng nhập tiêu đề')
            return
        }
        if (!formData.noiDung.trim()) {
            setError('Vui lòng nhập nội dung')
            return
        }
        if (!formData.nguoiNhanId) {
            setError('Vui lòng chọn người nhận')
            return
        }

        try {
            setLoading(true)
            await notificationService.createNotification({
                loai: formData.loai,
                tieuDe: formData.tieuDe,
                noiDung: formData.noiDung,
                nguoiNhanId: parseInt(formData.nguoiNhanId),
                urlLienKet: formData.urlLienKet || null,
                uuTien: formData.uuTien,
                guiEmail: formData.guiEmail,
            })

            // Reset form
            setFormData({
                loai: 'GENERAL',
                tieuDe: '',
                noiDung: '',
                nguoiNhanId: '',
                urlLienKet: '',
                uuTien: 'BINH_THUONG',
                guiEmail: false,
            })

            onSuccess?.()
            onClose()
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra khi tạo thông báo')
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!isOpen) return null

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <h2 style={styles.title}>📢 Tạo Thông Báo Mới</h2>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {error && <div style={styles.error}>{error}</div>}

                    {/* Loại thông báo */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Loại thông báo *</label>
                        <select
                            name="loai"
                            value={formData.loai}
                            onChange={handleChange}
                            style={styles.select}
                        >
                            {NOTIFICATION_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tiêu đề */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tiêu đề *</label>
                        <input
                            type="text"
                            name="tieuDe"
                            value={formData.tieuDe}
                            onChange={handleChange}
                            placeholder="Nhập tiêu đề thông báo..."
                            style={styles.input}
                        />
                    </div>

                    {/* Nội dung */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Nội dung *</label>
                        <textarea
                            name="noiDung"
                            value={formData.noiDung}
                            onChange={handleChange}
                            placeholder="Nhập nội dung thông báo..."
                            style={styles.textarea}
                            rows={4}
                        />
                    </div>

                    {/* Người nhận */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Người nhận *</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="🔍 Tìm kiếm người dùng..."
                            style={styles.searchInput}
                        />
                        <select
                            name="nguoiNhanId"
                            value={formData.nguoiNhanId}
                            onChange={handleChange}
                            style={styles.select}
                            disabled={loadingUsers}
                        >
                            <option value="">{loadingUsers ? 'Đang tải...' : '-- Chọn người nhận --'}</option>
                            {filteredUsers.map(user => (
                                <option key={user.userId} value={user.userId}>
                                    {user.username} ({user.email}) - {user.role}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Mức độ ưu tiên */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mức độ ưu tiên</label>
                        <select
                            name="uuTien"
                            value={formData.uuTien}
                            onChange={handleChange}
                            style={styles.select}
                        >
                            {PRIORITY_LEVELS.map(level => (
                                <option key={level.value} value={level.value}>{level.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Link liên kết */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>
                            Link chuyển hướng (tùy chọn)
                            <span style={styles.labelHint}>Khi user click thông báo sẽ mở trang này</span>
                        </label>
                        <input
                            type="text"
                            name="urlLienKet"
                            value={formData.urlLienKet}
                            onChange={handleChange}
                            placeholder="Ví dụ: /hr/leaves hoặc /projects/123"
                            style={styles.input}
                        />
                        <div style={styles.fieldHint}>
                            💡 Để trống nếu không cần chuyển hướng. Ví dụ: /hr/leaves, /projects/5
                        </div>
                    </div>

                    {/* Gửi email */}
                    <div style={styles.checkboxGroup}>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                name="guiEmail"
                                checked={formData.guiEmail}
                                onChange={handleChange}
                                style={styles.checkbox}
                            />
                            📧 Đồng thời gửi email thông báo
                        </label>
                    </div>

                    {/* Buttons */}
                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={onClose} style={styles.cancelBtn}>
                            Hủy
                        </button>
                        <button type="submit" disabled={loading} style={styles.submitBtn}>
                            {loading ? '⏳ Đang gửi...' : '📤 Gửi thông báo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
    },
    modal: {
        background: colors.white,
        borderRadius: spacing.xl,
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.xl,
        borderBottom: `1px solid ${colors.borderLight}`,
        position: 'sticky',
        top: 0,
        background: colors.white,
        zIndex: 1,
    },
    title: {
        margin: 0,
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },
    closeBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        background: colors.background,
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textSecondary,
        transition: 'all 0.2s',
    },
    form: {
        padding: spacing.xl,
    },
    formGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        display: 'block',
        marginBottom: spacing.sm,
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
    input: {
        width: '100%',
        padding: spacing.md,
        border: `1px solid ${colors.border}`,
        borderRadius: spacing.md,
        fontSize: typography.base,
        transition: 'all 0.2s',
        boxSizing: 'border-box',
    },
    searchInput: {
        width: '100%',
        padding: spacing.sm,
        border: `1px solid ${colors.borderLight}`,
        borderRadius: spacing.sm,
        fontSize: typography.sm,
        marginBottom: spacing.sm,
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%',
        padding: spacing.md,
        border: `1px solid ${colors.border}`,
        borderRadius: spacing.md,
        fontSize: typography.base,
        resize: 'vertical',
        minHeight: '100px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: spacing.md,
        border: `1px solid ${colors.border}`,
        borderRadius: spacing.md,
        fontSize: typography.base,
        background: colors.white,
        cursor: 'pointer',
        boxSizing: 'border-box',
    },
    checkboxGroup: {
        marginBottom: spacing.xl,
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        cursor: 'pointer',
        fontSize: typography.base,
        color: colors.textPrimary,
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
    },
    error: {
        background: colors.error + '10',
        border: `1px solid ${colors.error}`,
        color: colors.error,
        padding: spacing.md,
        borderRadius: spacing.md,
        marginBottom: spacing.lg,
        fontSize: typography.sm,
    },
    buttonGroup: {
        display: 'flex',
        gap: spacing.md,
        justifyContent: 'flex-end',
        paddingTop: spacing.lg,
        borderTop: `1px solid ${colors.borderLight}`,
    },
    cancelBtn: {
        padding: `${spacing.md} ${spacing.xl}`,
        border: `1px solid ${colors.border}`,
        borderRadius: spacing.md,
        background: colors.white,
        color: colors.textSecondary,
        fontSize: typography.base,
        fontWeight: typography.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    submitBtn: {
        padding: `${spacing.md} ${spacing.xl}`,
        border: 'none',
        borderRadius: spacing.md,
        background: colors.primary,
        color: colors.white,
        fontSize: typography.base,
        fontWeight: typography.semibold,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    labelHint: {
        display: 'block',
        fontSize: '12px',
        fontWeight: 'normal',
        color: '#94a3b8',
        marginTop: '2px',
    },
    fieldHint: {
        marginTop: '6px',
        fontSize: '12px',
        color: '#64748b',
        fontStyle: 'italic',
    },
}
