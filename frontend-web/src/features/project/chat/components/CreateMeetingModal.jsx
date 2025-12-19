import { useState, useEffect } from 'react'
import { meetingApi } from '../api/meetingApi'
import { colors, typography, spacing } from '@/shared/styles/theme'
import JitsiMeeting from './JitsiMeeting'
import { useToast } from '@/shared/components/ui'

export default function CreateMeetingModal({
    isOpen,
    onClose,
    roomId,
    roomInfo,
    onMeetingCreated
}) {
    const [mode, setMode] = useState('instant') // 'instant' or 'scheduled'
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [duration, setDuration] = useState(30)
    const [selectedParticipants, setSelectedParticipants] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showVideoMeeting, setShowVideoMeeting] = useState(false)
    const [currentMeeting, setCurrentMeeting] = useState(null)
    const toast = useToast()

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('instant')
            setTitle('')
            setDescription('')
            setDate('')
            setTime('')
            setDuration(30)
            setSelectedParticipants([])
            setError('')
            setShowVideoMeeting(false)
            setCurrentMeeting(null)

            // Set default date and time to now + 1 hour
            const now = new Date()
            now.setHours(now.getHours() + 1)
            now.setMinutes(0)
            setDate(now.toISOString().split('T')[0])
            setTime(now.toTimeString().slice(0, 5))
        }
    }, [isOpen])

    const handleStartInstantMeeting = async () => {
        const meetingTitle = title.trim() || `Cuộc họp - ${roomInfo?.name || 'Nhóm'}`

        // Optionally save to backend
        try {
            setLoading(true)
            setError('')

            const meeting = await meetingApi.startMeetingNow(roomId, meetingTitle)
            setCurrentMeeting(meeting)
            onMeetingCreated?.(meeting)
        } catch (err) {
            console.log('Could not save meeting to server, starting locally:', err)
            // Continue with local meeting even if API fails
            setCurrentMeeting({
                meetingId: `local_${Date.now()}`,
                title: meetingTitle
            })
        } finally {
            setLoading(false)
        }

        // Open VideoMeeting
        setShowVideoMeeting(true)
    }

    const handleScheduleMeeting = async () => {
        if (!title.trim()) {
            setError('Vui lòng nhập tiêu đề cuộc họp')
            return
        }

        if (!date || !time) {
            setError('Vui lòng chọn ngày và giờ họp')
            return
        }

        try {
            setLoading(true)
            setError('')

            const startTime = new Date(`${date}T${time}:00`).toISOString()
            const participantIds = selectedParticipants.map(p => p.userId)

            const meeting = await meetingApi.scheduleMeeting(
                roomId,
                title.trim(),
                startTime,
                duration,
                description.trim(),
                participantIds
            )

            onMeetingCreated?.(meeting)
            onClose()
            toast.success(`Đã hẹn lịch họp "${title}" vào ${new Date(startTime).toLocaleString('vi-VN')}`)
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể hẹn lịch cuộc họp')
        } finally {
            setLoading(false)
        }
    }

    const toggleParticipant = (member) => {
        setSelectedParticipants(prev => {
            const exists = prev.find(p => p.userId === member.userId)
            if (exists) {
                return prev.filter(p => p.userId !== member.userId)
            }
            return [...prev, member]
        })
    }

    const selectAllParticipants = () => {
        if (roomInfo?.members) {
            setSelectedParticipants([...roomInfo.members])
        }
    }

    const durationOptions = [
        { value: 15, label: '15 phút' },
        { value: 30, label: '30 phút' },
        { value: 45, label: '45 phút' },
        { value: 60, label: '1 giờ' },
        { value: 90, label: '1 giờ 30 phút' },
        { value: 120, label: '2 giờ' },
    ]

    if (!isOpen) return null

    // Show Video Meeting when started
    if (showVideoMeeting) {
        return (
            <JitsiMeeting
                meetingId={currentMeeting?.meetingId}
                meetingTitle={currentMeeting?.title || title || `Cuộc họp - ${roomInfo?.name}`}
                roomInfo={roomInfo}
                onClose={() => {
                    setShowVideoMeeting(false)
                    onClose()
                }}
            />
        )
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.headerTitle}>📹 Cuộc họp</h2>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Mode Selection Tabs */}
                <div style={styles.tabContainer}>
                    <button
                        style={{
                            ...styles.tab,
                            ...(mode === 'instant' ? styles.tabActive : {})
                        }}
                        onClick={() => setMode('instant')}
                    >
                        🎥 Họp ngay
                    </button>
                    <button
                        style={{
                            ...styles.tab,
                            ...(mode === 'scheduled' ? styles.tabActive : {})
                        }}
                        onClick={() => setMode('scheduled')}
                    >
                        📅 Hẹn lịch họp
                    </button>
                </div>

                {/* Content */}
                <div style={styles.content}>
                    {error && (
                        <div style={styles.errorMessage}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Meeting Title */}
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Tiêu đề cuộc họp</label>
                        <input
                            type="text"
                            style={styles.input}
                            placeholder={mode === 'instant' ? 'Cuộc họp nhanh (tuỳ chọn)' : 'Nhập tiêu đề cuộc họp'}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {mode === 'scheduled' && (
                        <>
                            {/* Date and Time */}
                            <div style={styles.dateTimeRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Ngày họp</label>
                                    <input
                                        type="date"
                                        style={styles.input}
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Giờ họp</label>
                                    <input
                                        type="time"
                                        style={styles.input}
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Duration */}
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Thời lượng</label>
                                <select
                                    style={styles.select}
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value))}
                                >
                                    {durationOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Mô tả (tuỳ chọn)</label>
                                <textarea
                                    style={styles.textarea}
                                    placeholder="Nhập nội dung cuộc họp..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {/* Participants */}
                            <div style={styles.formGroup}>
                                <div style={styles.participantsHeader}>
                                    <label style={styles.label}>Thành viên tham gia</label>
                                    <button
                                        style={styles.selectAllBtn}
                                        onClick={selectAllParticipants}
                                    >
                                        Chọn tất cả
                                    </button>
                                </div>
                                <div style={styles.participantsList}>
                                    {roomInfo?.members?.map(member => (
                                        <div
                                            key={member.userId}
                                            style={{
                                                ...styles.participantItem,
                                                ...(selectedParticipants.find(p => p.userId === member.userId)
                                                    ? styles.participantItemSelected
                                                    : {})
                                            }}
                                            onClick={() => toggleParticipant(member)}
                                        >
                                            <div style={styles.participantAvatar}>
                                                {member.username?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span style={styles.participantName}>{member.username}</span>
                                            {selectedParticipants.find(p => p.userId === member.userId) && (
                                                <span style={styles.checkmark}>✓</span>
                                            )}
                                        </div>
                                    ))}
                                    {(!roomInfo?.members || roomInfo.members.length === 0) && (
                                        <div style={styles.noMembers}>Không có thành viên</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {mode === 'instant' && (
                        <div style={styles.instantInfo}>
                            <div style={styles.instantIcon}>🎥</div>
                            <h3 style={styles.instantTitle}>Bắt đầu họp ngay lập tức</h3>
                            <p style={styles.instantText}>
                                Cuộc họp sẽ bắt đầu ngay và thông báo sẽ được gửi đến các thành viên trong nhóm
                                <strong> "{roomInfo?.name || 'Nhóm chat'}"</strong>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button
                        style={{
                            ...styles.submitBtn,
                            ...(loading ? styles.submitBtnLoading : {})
                        }}
                        onClick={mode === 'instant' ? handleStartInstantMeeting : handleScheduleMeeting}
                        disabled={loading}
                    >
                        {loading ? '⏳ Đang xử lý...' : (mode === 'instant' ? '🎥 Bắt đầu họp' : '📅 Lên lịch')}
                    </button>
                </div>
            </div>
        </div>
    )
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: colors.white,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.xl,
        borderBottom: `1px solid ${colors.border}`
    },
    headerTitle: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        margin: 0
    },
    closeBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: 'none',
        background: colors.background,
        color: colors.textSecondary,
        fontSize: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    tabContainer: {
        display: 'flex',
        padding: `0 ${spacing.xl}`,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background
    },
    tab: {
        flex: 1,
        padding: `${spacing.md} ${spacing.lg}`,
        border: 'none',
        background: 'none',
        fontSize: typography.base,
        fontWeight: typography.medium,
        color: colors.textSecondary,
        cursor: 'pointer',
        transition: 'all 0.2s',
        borderBottom: '3px solid transparent'
    },
    tabActive: {
        color: colors.primary,
        borderBottomColor: colors.primary,
        backgroundColor: colors.white
    },
    content: {
        padding: spacing.xl,
        overflow: 'auto',
        flex: 1
    },
    errorMessage: {
        padding: spacing.md,
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        borderRadius: '8px',
        marginBottom: spacing.lg,
        fontSize: typography.sm
    },
    formGroup: {
        marginBottom: spacing.lg
    },
    label: {
        display: 'block',
        fontSize: typography.sm,
        fontWeight: typography.medium,
        color: colors.textPrimary,
        marginBottom: spacing.sm
    },
    input: {
        width: '100%',
        padding: spacing.md,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        fontSize: typography.base,
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box'
    },
    select: {
        width: '100%',
        padding: spacing.md,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        fontSize: typography.base,
        outline: 'none',
        backgroundColor: colors.white,
        cursor: 'pointer'
    },
    textarea: {
        width: '100%',
        padding: spacing.md,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        fontSize: typography.base,
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box'
    },
    dateTimeRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: spacing.md
    },
    participantsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm
    },
    selectAllBtn: {
        padding: `${spacing.xs} ${spacing.md}`,
        border: `1px solid ${colors.primary}`,
        borderRadius: '4px',
        background: 'none',
        color: colors.primary,
        fontSize: typography.xs,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    participantsList: {
        maxHeight: '150px',
        overflow: 'auto',
        border: `1px solid ${colors.border}`,
        borderRadius: '8px'
    },
    participantItem: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        cursor: 'pointer',
        transition: 'background 0.2s',
        borderBottom: `1px solid ${colors.border}`
    },
    participantItemSelected: {
        backgroundColor: '#eff6ff'
    },
    participantAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: colors.primary,
        color: colors.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: typography.sm,
        fontWeight: typography.bold
    },
    participantName: {
        flex: 1,
        fontSize: typography.sm,
        color: colors.textPrimary
    },
    checkmark: {
        color: colors.primary,
        fontWeight: typography.bold
    },
    noMembers: {
        padding: spacing.xl,
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: typography.sm
    },
    instantInfo: {
        textAlign: 'center',
        padding: spacing.xl
    },
    instantIcon: {
        fontSize: '64px',
        marginBottom: spacing.lg
    },
    instantTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: spacing.md
    },
    instantText: {
        fontSize: typography.base,
        color: colors.textSecondary,
        lineHeight: 1.6
    },
    footer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: spacing.md,
        padding: spacing.xl,
        borderTop: `1px solid ${colors.border}`
    },
    cancelBtn: {
        padding: `${spacing.md} ${spacing.xl}`,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        background: colors.white,
        color: colors.textPrimary,
        fontSize: typography.base,
        fontWeight: typography.medium,
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    submitBtn: {
        padding: `${spacing.md} ${spacing.xl}`,
        border: 'none',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: colors.white,
        fontSize: typography.base,
        fontWeight: typography.medium,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
    },
    submitBtnLoading: {
        opacity: 0.7,
        cursor: 'not-allowed'
    }
}
