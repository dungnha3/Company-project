export default function MessageBubble({ message, isOwn }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const getInitial = (name) => {
    return name?.charAt(0)?.toUpperCase() || '?'
  }

  const renderMessageContent = () => {
    // File message
    if (message.messageType === 'FILE' && message.file) {
      return (
        <div style={styles.fileContent}>
          <div style={styles.fileIcon}>📄</div>
          <div style={styles.fileDetails}>
            <div style={{
              ...styles.fileName,
              color: isOwn ? '#FFFFFF' : '#1f2937'
            }}>{message.file.originalFilename}</div>
            <div style={{
              ...styles.fileSize,
              color: isOwn ? 'rgba(255,255,255,0.8)' : '#6b7280'
            }}>{(message.file.fileSize / 1024).toFixed(0)} KB</div>
          </div>
        </div>
      )
    }

    // Image message
    if (message.messageType === 'IMAGE' && message.file) {
      return (
        <img
          src={message.file.fileUrl || `/api/storage/files/${message.file.fileId}`}
          alt={message.file.originalFilename}
          style={styles.imageContent}
        />
      )
    }

    // Text message - Default
    return (
      <div style={styles.textContent}>
        {typeof message.content === 'object' ? JSON.stringify(message.content) : (message.content || 'Tin nhắn trống')}
      </div>
    )
  }

  return (
    <div style={{
      ...styles.messageRow,
      justifyContent: isOwn ? 'flex-end' : 'flex-start',
    }}>
      {/* Avatar for other's messages */}
      {!isOwn && (
        <div style={styles.avatarOther}>
          {getInitial(message.senderName)}
        </div>
      )}

      {/* Message Content */}
      <div style={{
        ...styles.messageWrapper,
        alignItems: isOwn ? 'flex-end' : 'flex-start',
      }}>
        {/* Sender name for group chats */}
        {!isOwn && message.senderName && (
          <div style={styles.senderName}>{typeof message.senderName === 'string' ? message.senderName : 'Unknown'}</div>
        )}

        {/* Bubble */}
        <div style={{
          ...styles.bubble,
          background: isOwn
            ? 'linear-gradient(135deg, #0084ff 0%, #0066cc 100%)'
            : '#FFFFFF',
          color: isOwn ? '#FFFFFF' : '#1f2937',
          borderRadius: isOwn
            ? '20px 20px 4px 20px'
            : '20px 20px 20px 4px',
          boxShadow: isOwn
            ? '0 2px 12px rgba(0, 132, 255, 0.3)'
            : '0 1px 8px rgba(0, 0, 0, 0.06)',
          border: isOwn ? 'none' : '1px solid #e5e7eb',
        }}>
          {renderMessageContent()}

          {message.isDeleted && (
            <div style={styles.deletedText}>
              <em>Tin nhắn đã bị xóa</em>
            </div>
          )}
        </div>

        {/* Time and status */}
        <div style={{
          ...styles.metaInfo,
          justifyContent: isOwn ? 'flex-end' : 'flex-start',
        }}>
          <span style={styles.timeText}>{formatTime(message.sentAt)}</span>
          {message.editedAt && (
            <span style={styles.editedText}> • Đã sửa</span>
          )}
          {isOwn && message.seen && (
            <span style={styles.seenIndicator}>✓✓</span>
          )}
        </div>
      </div>

      {/* Avatar for own messages */}
      {isOwn && (
        <div style={styles.avatarOwn}>
          {getInitial(message.senderName)}
        </div>
      )}
    </div>
  )
}

const styles = {
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    marginBottom: '12px',
    paddingLeft: '16px',
    paddingRight: '16px',
  },
  avatarOther: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0,
  },
  avatarOwn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0,
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '65%',
  },
  senderName: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: '4px',
    marginLeft: '4px',
  },
  bubble: {
    padding: '12px 16px',
    maxWidth: '100%',
    wordWrap: 'break-word',
    wordBreak: 'break-word',
  },
  textContent: {
    fontSize: '15px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  fileContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  fileIcon: {
    fontSize: '28px',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px',
  },
  fileSize: {
    fontSize: '12px',
  },
  imageContent: {
    maxWidth: '280px',
    borderRadius: '12px',
    display: 'block',
  },
  deletedText: {
    fontSize: '14px',
    opacity: 0.7,
  },
  metaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
    marginLeft: '4px',
    marginRight: '4px',
  },
  timeText: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  editedText: {
    fontSize: '11px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  seenIndicator: {
    fontSize: '12px',
    color: '#0084ff',
    marginLeft: '4px',
  },
}
