import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { chatRoomApi } from '../api/chatRoomApi'
import { messageApi } from '../api/messageApi'
import { meetingApi } from '../api/meetingApi'
import websocketService from '../services/websocketService'
import MessageBubble from './MessageBubble'
import FileUploadModal from './FileUploadModal'
import RoomSettingsModal from './RoomSettingsModal'
import CreateMeetingModal from './CreateMeetingModal'
import JitsiMeeting from './JitsiMeeting'
import EmojiPicker from './EmojiPicker'
import { useToast } from '@/shared/components/ui'

export default function ChatRoom({ roomId, wsConnected, onNewMessage }) {
  const { user } = useAuth()
  const [roomInfo, setRoomInfo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [activeMeetings, setActiveMeetings] = useState([])
  const [showVideoMeeting, setShowVideoMeeting] = useState(false)
  const [currentMeeting, setCurrentMeeting] = useState(null)
  const [inputFocused, setInputFocused] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    if (roomId) {
      loadRoomData()
      subscribeToRoom()
    }
    return () => {
      if (roomId) websocketService.unsubscribeFromRoom(roomId)
    }
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadRoomData = async () => {
    try {
      setLoading(true)
      const [roomData, messagesData] = await Promise.all([
        chatRoomApi.getById(roomId),
        messageApi.getMessages(roomId)
      ])
      const transformedMessages = messagesData.map(msg => ({
        ...msg,
        senderName: msg.sender?.username,
        senderId: msg.sender?.userId
      }))
      setRoomInfo(roomData)
      setMessages(transformedMessages)
      setLoading(false)
      loadActiveMeetings()
    } catch (error) {
      setLoading(false)
    }
  }

  const loadActiveMeetings = async () => {
    try {
      const meetings = await meetingApi.getMeetingsByRoom(roomId)
      const active = meetings.filter(m => m.status === 'IN_PROGRESS' || m.status === 'SCHEDULED')
      setActiveMeetings(active)
    } catch (error) {
      setActiveMeetings([])
    }
  }

  const handleJoinMeeting = async (meeting) => {
    try { await meetingApi.joinMeeting(meeting.meetingId) } catch { }
    setCurrentMeeting(meeting)
    setShowVideoMeeting(true)
  }

  const subscribeToRoom = () => {
    websocketService.subscribeToRoom(roomId, (wsMessage) => {
      if (wsMessage.type === 'CHAT_MESSAGE') {
        const messageData = wsMessage.data
        if (!messageData) return
        const message = {
          ...messageData,
          senderName: messageData.sender?.username || wsMessage.username,
          senderId: messageData.sender?.userId || wsMessage.userId
        }
        setMessages(prev => [...prev, message])
        scrollToBottom()

        // Notify parent component for realtime conversation list update
        if (onNewMessage) {
          onNewMessage(messageData)
        }
      }
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return
    try {
      setSending(true)
      await messageApi.sendMessage(roomId, newMessage)
      setNewMessage('')
      setSending(false)
    } catch (error) {
      setSending(false)
      toast.error('Không thể gửi tin nhắn')
    }
  }

  const getRoomTitle = () => {
    if (!roomInfo) return 'Đang tải...'
    if (roomInfo.type === 'DIRECT' && roomInfo.members?.length === 2) {
      const otherMember = roomInfo.members.find(m => m.userId !== user?.userId)
      return otherMember?.username || 'Unknown User'
    }
    return roomInfo.name || 'Cuộc trò chuyện'
  }

  const getRoomSubtitle = () => {
    if (!roomInfo) return ''
    if (roomInfo.type === 'PROJECT') return `Dự án: ${roomInfo.project?.name || 'N/A'}`
    if (roomInfo.type === 'GROUP') return `${roomInfo.members?.length || 0} thành viên`
    return 'Đang hoạt động'
  }

  const getRoomIcon = () => {
    if (roomInfo?.type === 'PROJECT') return '🏭'
    if (roomInfo?.type === 'GROUP') return '👥'
    return '👤'
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Đang tải tin nhắn...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerAvatar}>{getRoomIcon()}</div>
          <div style={styles.headerInfo}>
            <div style={styles.headerTitle}>{getRoomTitle()}</div>
            <div style={styles.headerSubtitle}>
              {wsConnected && <span style={styles.onlineDot}></span>}
              {getRoomSubtitle()}
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.actionBtn}
            onClick={() => setShowMeetingModal(true)}
            title="Bắt đầu cuộc họp video"
          >
            <span style={styles.actionIcon}>📹</span>
          </button>
          <button
            style={styles.actionBtnSecondary}
            onClick={() => setShowSettings(true)}
            title="Cài đặt phòng chat"
          >
            <span style={styles.actionIcon}>⚙️</span>
          </button>
        </div>
      </div>

      {/* Active Meeting Banner */}
      {activeMeetings.length > 0 && (
        <div style={styles.meetingBanner}>
          <div style={styles.meetingLeft}>
            <span style={styles.liveDot}></span>
            <span style={styles.meetingTitle}>{activeMeetings[0].title || 'Cuộc họp'} đang diễn ra</span>
          </div>
          <button style={styles.joinBtn} onClick={() => handleJoinMeeting(activeMeetings[0])}>
            Tham gia ngay
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div style={styles.messagesContainer}>
        {messages.length > 0 ? (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.messageId || index}
                message={message}
                isOwn={message.sender?.userId === user?.userId || message.senderId === user?.userId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💬</div>
            <div style={styles.emptyTitle}>Bắt đầu cuộc trò chuyện</div>
            <div style={styles.emptyText}>Gửi tin nhắn đầu tiên để bắt đầu!</div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={styles.inputContainer}>
        <div style={styles.inputWrapper}>
          <button
            style={styles.attachButton}
            onClick={() => setShowFileModal(true)}
            title="Đính kèm file"
          >
            📎
          </button>
          <div style={styles.emojiButtonWrapper}>
            <button
              style={{
                ...styles.emojiButton,
                backgroundColor: showEmojiPicker ? 'rgba(0, 132, 255, 0.1)' : 'transparent',
              }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Chèn emoji"
            >
              😊
            </button>
            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onSelect={(emoji) => {
                setNewMessage(prev => prev + emoji)
                setShowEmojiPicker(false)
                inputRef.current?.focus()
              }}
            />
          </div>
          <form onSubmit={handleSendMessage} style={styles.inputForm}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={sending}
              style={{
                ...styles.textInput,
                borderColor: inputFocused ? '#0084ff' : 'transparent',
                boxShadow: inputFocused ? '0 0 0 2px rgba(0, 132, 255, 0.15)' : 'none',
              }}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              style={{
                ...styles.sendButton,
                opacity: sending || !newMessage.trim() ? 0.5 : 1,
                cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                transform: !sending && newMessage.trim() ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              <span style={styles.sendIcon}>➤</span>
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      <FileUploadModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        roomId={roomId}
        onSuccess={() => { setShowFileModal(false); loadRoomData() }}
      />

      <RoomSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        roomId={roomId}
        roomInfo={roomInfo}
      />

      <CreateMeetingModal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        roomId={roomId}
        roomInfo={roomInfo}
        onMeetingCreated={() => loadActiveMeetings()}
      />

      {showVideoMeeting && currentMeeting && (
        <JitsiMeeting
          meetingId={currentMeeting.meetingId}
          meetingTitle={currentMeeting.title}
          roomInfo={roomInfo}
          onClose={() => {
            setShowVideoMeeting(false)
            setCurrentMeeting(null)
            loadActiveMeetings()
          }}
        />
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #0084ff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  headerTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: '-0.3px',
  },
  headerSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
  },
  actionBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
    transition: 'all 0.2s ease',
  },
  actionBtnSecondary: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    border: 'none',
    background: '#f3f4f6',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  actionIcon: {
    fontSize: '20px',
  },

  // Meeting Banner
  meetingBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    borderBottom: '1px solid #fcd34d',
    flexShrink: 0,
  },
  meetingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  liveDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  meetingTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
  },
  joinBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)',
    transition: 'all 0.2s ease',
  },

  // Messages
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '20px 0',
    backgroundColor: '#f8fafc',
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
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
  },

  // Input
  inputContainer: {
    padding: '16px 20px 20px 20px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '28px',
    padding: '6px 6px 6px 16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(0, 0, 0, 0.04)',
  },
  attachButton: {
    width: '40px',
    height: '40px',
    border: 'none',
    background: 'transparent',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    transition: 'all 0.2s ease',
  },
  inputForm: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  textInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    borderRadius: '20px',
    fontSize: '15px',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(255, 255, 255, 0.8)',
  },
  sendButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #0084ff 0%, #0066cc 100%)',
    color: '#FFFFFF',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0, 132, 255, 0.4)',
    transition: 'all 0.15s ease',
  },
  sendIcon: {
    transform: 'rotate(-45deg) translateX(1px)',
  },
  emojiButtonWrapper: {
    position: 'relative',
  },
  emojiButton: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
}
