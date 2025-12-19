import { useState } from 'react'
import CreateGroupModal from './CreateGroupModal'
import CreatePersonalChatModal from './CreatePersonalChatModal'

export default function ConversationList({
  rooms = [],
  selectedRoomId,
  onSelectRoom,
  onRoomCreated,
}) {
  const [activeTab, setActiveTab] = useState('personal') // 'personal', 'group', 'project'
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPersonalModal, setShowPersonalModal] = useState(false)
  const [hoveredRoom, setHoveredRoom] = useState(null)

  // Filter rooms based on active tab and search term
  const filteredRooms = rooms.filter(room => {
    // 1. Filter by search term
    const matchesSearch = room.name?.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    // 2. Filter by tab types
    const roomType = room.roomType || room.type
    if (activeTab === 'personal') {
      return roomType === 'DIRECT'
    }
    if (activeTab === 'group') {
      return roomType === 'GROUP'
    }
    if (activeTab === 'project') {
      return roomType === 'PROJECT'
    }
    return true
  })

  const getRoomName = (room) => {
    const roomType = room.roomType || room.type
    if (roomType === 'DIRECT' && room.members?.length === 2) {
      const otherMember = room.members.find(m => m.userId !== room.currentUserId)
      return otherMember?.username || 'Unknown User'
    }
    return room.name || 'Cuộc trò chuyện'
  }

  const getRoomIcon = (room) => {
    const roomType = room.roomType || room.type
    if (room.avatarUrl) {
      return <img src={room.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }} />
    }
    if (roomType === 'PROJECT') return '🏭'
    if (roomType === 'GROUP') return '👥'
    return '👤'
  }

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    if (diff < 60000) return 'Vừa xong'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}p`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Tin nhắn</h1>
        {activeTab === 'group' && (
          <button
            style={styles.newChatBtn}
            onClick={() => setShowCreateModal(true)}
            title="Tạo nhóm mới"
          >
            ✏️
          </button>
        )}
        {activeTab === 'personal' && (
          <button
            style={styles.newChatBtn}
            onClick={() => setShowPersonalModal(true)}
            title="Tin nhắn mới"
          >
            ✏️
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'personal' ? styles.activeTabBtn : {}) }}
          onClick={() => setActiveTab('personal')}
        >
          Cá nhân
        </button>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'group' ? styles.activeTabBtn : {}) }}
          onClick={() => setActiveTab('group')}
        >
          Nhóm
        </button>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'project' ? styles.activeTabBtn : {}) }}
          onClick={() => setActiveTab('project')}
        >
          Dự án
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchWrapper}>
        <div style={styles.searchContainer}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div style={styles.listContainer}>
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => {
            const isSelected = selectedRoomId === room.roomId
            const isHovered = hoveredRoom === room.roomId

            return (
              <div
                key={room.roomId}
                style={{
                  ...styles.roomItem,
                  backgroundColor: isSelected
                    ? 'rgba(0, 132, 255, 0.08)'
                    : isHovered
                      ? '#f9fafb'
                      : 'transparent',
                  borderLeft: isSelected
                    ? '3px solid #0084ff'
                    : '3px solid transparent',
                }}
                onClick={() => onSelectRoom(room.roomId)}
                onMouseEnter={() => setHoveredRoom(room.roomId)}
                onMouseLeave={() => setHoveredRoom(null)}
              >
                <div style={{
                  ...styles.roomAvatar,
                  background: isSelected
                    ? 'linear-gradient(135deg, #0084ff 0%, #0066cc 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}>
                  {getRoomIcon(room)}
                </div>
                <div style={styles.roomContent}>
                  <div style={styles.roomHeader}>
                    <span style={{
                      ...styles.roomName,
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected ? '#0084ff' : '#1f2937',
                    }}>
                      {getRoomName(room)}
                    </span>
                    <span style={styles.roomTime}>
                      {getTimeAgo(room.lastMessageAt || room.lastMessageTime)}
                    </span>
                  </div>
                  <div style={styles.roomPreview}>
                    {(() => {
                      const msg = room.lastMessage
                      if (!msg) return 'Chưa có tin nhắn'
                      if (typeof msg === 'string') return msg
                      if (msg.content) return msg.content
                      if (msg.messageType === 'IMAGE') return '[Hình ảnh]'
                      if (msg.messageType === 'FILE') return '[Tập tin]'
                      return 'Tin nhắn mới'
                    })()}
                  </div>
                </div>
                {room.unreadCount > 0 && (
                  <div style={styles.unreadBadge}>
                    {room.unreadCount > 9 ? '9+' : room.unreadCount}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💬</div>
            <div style={styles.emptyText}>
              {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện'}
            </div>
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newRoom) => {
          setShowCreateModal(false)
          if (onRoomCreated) onRoomCreated(newRoom)
        }}
      />

      <CreatePersonalChatModal
        isOpen={showPersonalModal}
        onClose={() => setShowPersonalModal(false)}
        onSuccess={(newRoom) => {
          setShowPersonalModal(false)
          if (onRoomCreated) onRoomCreated(newRoom)
        }}
      />
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 16px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1f2937',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  newChatBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #0084ff 0%, #0066cc 100%)',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0, 132, 255, 0.35)',
    transition: 'all 0.2s ease',
  },
  tabsContainer: {
    display: 'flex',
    padding: '0 20px',
    gap: '12px',
    marginBottom: '8px',
  },
  tabBtn: {
    flex: 1,
    padding: '8px 4px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderBottom: '2px solid transparent',
  },
  activeTabBtn: {
    color: '#0084ff',
    backgroundColor: 'rgba(0, 132, 255, 0.08)',
    borderBottom: '2px solid #0084ff',
  },
  searchWrapper: {
    padding: '12px 16px',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    fontSize: '14px',
    opacity: 0.5,
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 42px',
    border: 'none',
    borderRadius: '14px',
    fontSize: '14px',
    backgroundColor: '#f3f4f6',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  roomItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px 12px 13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  roomAvatar: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
    marginRight: '14px',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
  },
  roomContent: {
    flex: 1,
    minWidth: 0,
  },
  roomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  roomName: {
    fontSize: '15px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '160px',
    transition: 'color 0.15s ease',
  },
  roomTime: {
    fontSize: '12px',
    color: '#9ca3af',
    flexShrink: 0,
    marginLeft: '8px',
  },
  roomPreview: {
    fontSize: '13px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unreadBadge: {
    minWidth: '22px',
    height: '22px',
    borderRadius: '11px',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#FFFFFF',
    fontSize: '11px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    marginLeft: '10px',
    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.6,
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center',
  },
}
