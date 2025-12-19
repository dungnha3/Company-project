import { useState, useEffect, useRef } from 'react'
import { chatRoomApi } from '../api/chatRoomApi'
import AddMemberModal from './AddMemberModal'
import { useToast } from '@/shared/components/ui'

export default function RoomSettingsModal({ isOpen, onClose, roomId, roomInfo, onRoomUpdated }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(roomInfo?.avatarUrl || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    if (isOpen && roomId) {
      loadMembers()
      setAvatarUrl(roomInfo?.avatarUrl || '')
    }
  }, [isOpen, roomId, roomInfo?.avatarUrl])

  if (!isOpen) return null

  const loadMembers = async () => {
    try {
      setLoading(true)
      const membersList = await chatRoomApi.getRoomMembers(roomId)
      setMembers(membersList)
      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    const roomType = roomInfo?.roomType || roomInfo?.type
    if (roomType === 'GROUP') {
      fileInputRef.current?.click()
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.warning('Vui lòng chọn file ảnh!')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Ảnh không được lớn hơn 2MB!')
      return
    }

    try {
      setUploadingAvatar(true)

      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result

        try {
          await chatRoomApi.updateRoomSettings(roomId, { avatarUrl: base64 })
          setAvatarUrl(base64)
          toast.success('Đã cập nhật ảnh đại diện!')
          if (onRoomUpdated) onRoomUpdated()
        } catch (error) {
          toast.error('Không thể cập nhật ảnh đại diện!')
        } finally {
          setUploadingAvatar(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setUploadingAvatar(false)
      toast.error('Lỗi khi tải ảnh!')
    }
  }

  const handleRemoveMember = async (userId, username) => {
    if (!confirm(`Xóa ${username} khỏi nhóm?`)) return
    try {
      await chatRoomApi.removeMember(roomId, userId)
      toast.success(`Đã xóa ${username}`)
      loadMembers()
    } catch (error) {
      toast.error('Không thể xóa thành viên')
    }
  }

  const handleLeaveRoom = async () => {
    if (!confirm('Bạn có chắc muốn rời khỏi nhóm này?')) return
    try {
      await chatRoomApi.leaveRoom(roomId)
      toast.success('Đã rời khỏi nhóm')
      onClose()
      window.location.reload()
    } catch (error) {
      toast.error('Không thể rời nhóm')
    }
  }

  const getAvatarContent = () => {
    const roomType = roomInfo?.roomType || roomInfo?.type
    if (avatarUrl) {
      return <img src={avatarUrl} alt="Avatar" style={styles.avatarImage} />
    }
    if (roomType === 'PROJECT') return '🏭'
    if (roomType === 'GROUP') return '👥'
    if (roomType === 'DIRECT') return '👤'
    return '💬'
  }

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h3 style={styles.title}>Thông tin nhóm</h3>
            <button style={styles.closeBtn} onClick={onClose}>×</button>
          </div>

          <div style={styles.content}>
            {/* Room Info */}
            <div style={styles.roomInfoSection}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              {(() => {
                const roomType = roomInfo?.roomType || roomInfo?.type
                const isGroup = roomType === 'GROUP'
                return (
                  <>
                    <div
                      style={{
                        ...styles.roomAvatar,
                        cursor: isGroup ? 'pointer' : 'default',
                        position: 'relative',
                      }}
                      onClick={handleAvatarClick}
                      title={isGroup ? 'Nhấn để đổi ảnh đại diện' : ''}
                    >
                      {uploadingAvatar ? (
                        <div style={styles.uploadingSpinner}>⏳</div>
                      ) : (
                        getAvatarContent()
                      )}
                      {isGroup && !uploadingAvatar && (
                        <div style={styles.avatarOverlay}>
                          <span style={styles.cameraIcon}>📷</span>
                        </div>
                      )}
                    </div>
                    <h2 style={styles.roomName}>{roomInfo?.name || 'Cuộc trò chuyện'}</h2>
                    <div style={styles.roomType}>
                      {roomType === 'PROJECT' && 'Chat dự án'}
                      {roomType === 'GROUP' && 'Nhóm chat'}
                      {roomType === 'DIRECT' && 'Chat trực tiếp'}
                    </div>
                    {isGroup && (
                      <div style={styles.avatarHint}>Nhấn vào ảnh để thay đổi</div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Members */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h4 style={styles.sectionTitle}>Thành viên ({members.length})</h4>
                {(roomInfo?.roomType || roomInfo?.type) === 'GROUP' && (
                  <button onClick={() => setShowAddMember(true)} style={styles.addMemberBtn}>+ Thêm</button>
                )}
              </div>

              {loading ? (
                <div style={styles.loadingText}>Đang tải...</div>
              ) : (
                <div style={styles.membersList}>
                  {members.map(member => {
                    const username = member.user?.username || member.username || 'Unknown'
                    const userId = member.user?.userId || member.userId
                    const role = member.role
                    return (
                      <div key={userId} style={styles.memberItem}>
                        <div style={styles.memberAvatar}>{username?.charAt(0).toUpperCase()}</div>
                        <div style={styles.memberInfo}>
                          <div style={styles.memberName}>{username}</div>
                          <div style={styles.memberRole}>
                            {role === 'ADMIN' ? '👑 Quản trị viên' : 'Thành viên'}
                          </div>
                        </div>
                        {(roomInfo?.roomType || roomInfo?.type) === 'GROUP' && role !== 'ADMIN' && (
                          <button
                            onClick={() => handleRemoveMember(userId, username)}
                            style={styles.removeBtn}
                          >×</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            {(roomInfo?.roomType || roomInfo?.type) === 'GROUP' && (
              <div style={styles.section}>
                <button onClick={handleLeaveRoom} style={styles.leaveBtn}>🚪 Rời khỏi nhóm</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        roomId={roomId}
        currentMembers={members}
        onSuccess={() => { setShowAddMember(false); loadMembers() }}
      />
    </>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #f3f4f6',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    background: '#f3f4f6',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
  },
  roomInfoSection: {
    padding: '32px 24px',
    textAlign: 'center',
    borderBottom: '1px solid #f3f4f6',
    background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
  },
  roomAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    margin: '0 auto 16px auto',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
  },
  roomName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px',
  },
  roomType: {
    fontSize: '14px',
    color: '#6b7280',
  },
  section: {
    padding: '20px 24px',
    borderBottom: '1px solid #f3f4f6',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },
  addMemberBtn: {
    padding: '8px 16px',
    border: '2px solid #0084ff',
    borderRadius: '10px',
    background: '#FFFFFF',
    color: '#0084ff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loadingText: {
    textAlign: 'center',
    padding: '24px',
    color: '#6b7280',
    fontSize: '14px',
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '14px',
    backgroundColor: '#f9fafb',
    transition: 'all 0.2s',
  },
  memberAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    color: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
    marginRight: '12px',
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  memberRole: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  removeBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    border: 'none',
    background: '#fef2f2',
    color: '#ef4444',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  leaveBtn: {
    width: '100%',
    padding: '14px',
    border: '2px solid #ef4444',
    borderRadius: '12px',
    background: '#FFFFFF',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: '20px',
    objectFit: 'cover',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '30px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
    borderRadius: '0 0 20px 20px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '4px',
    opacity: 0.8,
  },
  cameraIcon: {
    fontSize: '14px',
  },
  uploadingSpinner: {
    fontSize: '30px',
    animation: 'spin 1s linear infinite',
  },
  avatarHint: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '8px',
  },
}
