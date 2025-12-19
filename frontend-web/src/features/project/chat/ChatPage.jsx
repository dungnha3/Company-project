import { useState, useEffect, useCallback } from 'react'
import { chatRoomApi } from './api/chatRoomApi'
import websocketService from './services/websocketService'
import ConversationList from './components/ConversationList'
import ChatRoom from './components/ChatRoom'

export default function ChatPage({ glassMode }) {
  const [chatRooms, setChatRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)

  // Computed styles based on glassMode
  const computedStyles = {
    container: {
      ...styles.container,
      backgroundColor: glassMode ? 'rgba(255, 255, 255, 0.6)' : styles.container.backgroundColor,
      backdropFilter: glassMode ? 'blur(10px)' : 'none',
      border: glassMode ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
      height: glassMode ? 'calc(100vh - 40px)' : styles.container.height,
      margin: glassMode ? 0 : styles.container.margin
    },
    sidebar: {
      ...styles.sidebar,
      backgroundColor: glassMode ? 'rgba(255, 255, 255, 0.4)' : styles.sidebar.backgroundColor,
      borderRight: glassMode ? '1px solid rgba(255, 255, 255, 0.5)' : styles.sidebar.borderRight
    },
    mainArea: {
      ...styles.mainArea,
      backgroundColor: glassMode ? 'transparent' : styles.mainArea.backgroundColor
    }
  }

  // Handle new message to update conversation list
  const handleNewMessage = useCallback((roomId, messageData) => {
    setChatRooms(prevRooms => {
      return prevRooms.map(room => {
        if (room.roomId === roomId) {
          return {
            ...room,
            lastMessage: messageData,
            lastMessageAt: messageData.sentAt || new Date().toISOString()
          }
        }
        return room
      }).sort((a, b) => {
        // Sort by last message time, newest first
        const timeA = a.lastMessageAt || a.lastMessageTime || a.createdAt || ''
        const timeB = b.lastMessageAt || b.lastMessageTime || b.createdAt || ''
        return new Date(timeB) - new Date(timeA)
      })
    })
  }, [])

  useEffect(() => {
    loadChatRooms()
    connectWebSocket()
    return () => websocketService.disconnect()
  }, [])

  const loadChatRooms = async () => {
    try {
      setLoading(true)
      const rooms = await chatRoomApi.getMyChatRooms()
      setChatRooms(rooms)
      if (rooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(rooms[0].roomId)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
  }

  const connectWebSocket = () => {
    websocketService.connect(
      () => setWsConnected(true),
      () => setWsConnected(false)
    )
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <div style={styles.loadingText}>Đang tải...</div>
      </div>
    )
  }

  return (
    <div style={computedStyles.container}>
      {/* Sidebar */}
      <div style={computedStyles.sidebar}>
        <ConversationList
          rooms={chatRooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          onRoomCreated={(newRoom) => {
            setChatRooms([newRoom, ...chatRooms])
            setSelectedRoomId(newRoom.roomId)
          }}
        />
      </div>

      {/* Main Area */}
      <div style={computedStyles.mainArea}>
        {selectedRoomId ? (
          <ChatRoom
            roomId={selectedRoomId}
            wsConnected={wsConnected}
            onNewMessage={(messageData) => handleNewMessage(selectedRoomId, messageData)}
          />
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💬</div>
            <h2 style={styles.emptyTitle}>Messenger</h2>
            <p style={styles.emptyText}>
              Chọn một cuộc trò chuyện để bắt đầu nhắn tin
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 160px)',
    minHeight: '500px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    margin: '20px',
  },
  sidebar: {
    width: '340px',
    flexShrink: 0,
    borderRight: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '20px',
    backgroundColor: '#f8fafc',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #0084ff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '15px',
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '60px',
    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
  },
  emptyIcon: {
    fontSize: '80px',
    marginBottom: '24px',
    filter: 'drop-shadow(0 4px 12px rgba(0, 132, 255, 0.2))',
  },
  emptyTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '12px',
    letterSpacing: '-0.5px',
  },
  emptyText: {
    fontSize: '15px',
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: '320px',
    lineHeight: '1.6',
  },
}
