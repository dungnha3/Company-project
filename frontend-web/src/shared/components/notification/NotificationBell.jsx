import { useState, useEffect, useRef } from 'react'
import { notificationService } from '@/shared/services/notification.service'
import { colors, typography, spacing } from '@/shared/styles/theme'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const dropdownRef = useRef(null)
  const listRef = useRef(null)

  const INITIAL_DISPLAY = 4  // Show 4 items initially
  const PAGE_SIZE = 10
  const EXPANDED_PAGE_SIZE = 20

  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (showDropdown && notifications.length === 0) {
      loadNotifications()
    }
  }, [showDropdown])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
        setExpanded(false)
        setPage(0)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  // Infinite scroll handler
  useEffect(() => {
    const listElement = listRef.current
    if (!listElement || !expanded) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = listElement
      // Load more when scrolled to 80% of the list
      if (scrollTop + clientHeight >= scrollHeight * 0.8 && hasMore && !loadingMore) {
        loadMoreNotifications()
      }
    }

    listElement.addEventListener('scroll', handleScroll)
    return () => listElement.removeEventListener('scroll', handleScroll)
  }, [expanded, hasMore, loadingMore, notifications])

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount()
      setUnreadCount(count || 0)
    } catch (error) {
      // Silently fail
    }
  }

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getMyNotifications(0, PAGE_SIZE)
      setNotifications(data || [])
      setHasMore((data || []).length >= PAGE_SIZE)
      setPage(0)
      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
  }

  const loadMoreNotifications = async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = page + 1
      const data = await notificationService.getMyNotifications(nextPage, EXPANDED_PAGE_SIZE)

      if (data && data.length > 0) {
        setNotifications(prev => [...prev, ...data])
        setPage(nextPage)
        setHasMore(data.length >= EXPANDED_PAGE_SIZE)
      } else {
        setHasMore(false)
      }
      setLoadingMore(false)
    } catch (error) {
      setLoadingMore(false)
    }
  }

  const handleExpandClick = async () => {
    setExpanded(true)
    // Load more notifications when expanding
    if (notifications.length <= PAGE_SIZE) {
      setLoadingMore(true)
      try {
        const data = await notificationService.getMyNotifications(0, 30)
        setNotifications(data || [])
        setHasMore((data || []).length >= 30)
      } catch (error) {
        // Ignore
      }
      setLoadingMore(false)
    }
  }

  const handleNotificationClick = async (notification) => {
    if (notification.isRead === false) {
      try {
        await notificationService.markAsRead(notification.notificationId)
        setUnreadCount(prev => Math.max(0, prev - 1))
        setNotifications(notifications.map(n =>
          n.notificationId === notification.notificationId
            ? { ...n, isRead: true }
            : n
        ))
      } catch (error) {
        // Ignore
      }
    }

    // Navigate to link if exists
    if (notification.link) {
      window.location.href = notification.link
    }

    setShowDropdown(false)
    setExpanded(false)
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setUnreadCount(0)
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      // Ignore
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Vừa xong'
    if (minutes < 60) return `${minutes} phút trước`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} giờ trước`

    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} ngày trước`

    return date.toLocaleDateString('vi-VN')
  }

  const getNotificationIcon = (type) => {
    if (type?.includes('CHAT')) return '💬'
    if (type?.includes('MESSAGE')) return '✉️'
    if (type?.includes('MENTION')) return '🔔'
    if (type?.includes('MEMBER')) return '👥'
    if (type?.includes('PROJECT')) return '🏭'
    if (type?.includes('LEAVE')) return '📋'
    if (type?.includes('HR')) return '👤'
    return '📢'
  }

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        style={styles.bellButton}
        onClick={() => {
          setShowDropdown(!showDropdown)
          if (!showDropdown) {
            setExpanded(false)
          }
        }}
        title="Thông báo"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div style={{
          ...styles.dropdown,
          ...(expanded ? styles.dropdownExpanded : {})
        }}>
          <div style={styles.dropdownHeader}>
            <h3 style={styles.dropdownTitle}>Thông báo</h3>
            <div style={styles.headerActions}>
              {unreadCount > 0 && (
                <button style={styles.markAllBtn} onClick={handleMarkAllRead}>
                  Đánh dấu đã đọc
                </button>
              )}
              {expanded && (
                <button style={styles.collapseBtn} onClick={() => setExpanded(false)}>
                  Thu gọn
                </button>
              )}
            </div>
          </div>

          <div
            ref={listRef}
            style={{
              ...styles.notificationList,
              ...(expanded ? styles.notificationListExpanded : {})
            }}
          >
            {loading ? (
              <div style={styles.loading}>Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>🔔</div>
                <div>Không có thông báo mới</div>
              </div>
            ) : (
              <>
                {(expanded ? notifications : notifications.slice(0, INITIAL_DISPLAY)).map((notif) => (
                  <div
                    key={notif.notificationId}
                    style={{
                      ...styles.notificationItem,
                      ...(notif.isRead ? {} : styles.notificationItemUnread)
                    }}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div style={styles.notifIcon}>{getNotificationIcon(notif.type)}</div>
                    <div style={styles.notifContent}>
                      <div style={styles.notifTitle}>{notif.title}</div>
                      {notif.content && (
                        <div style={styles.notifMessage}>{notif.content}</div>
                      )}
                      <div style={styles.notifTime}>{formatTime(notif.createdAt)}</div>
                    </div>
                    {!notif.isRead && <div style={styles.unreadDot} />}
                  </div>
                ))}
                {loadingMore && (
                  <div style={styles.loadingMore}>
                    <div style={styles.spinner}></div>
                    Đang tải thêm...
                  </div>
                )}
                {expanded && !hasMore && notifications.length > INITIAL_DISPLAY && (
                  <div style={styles.endMessage}>Đã xem hết thông báo</div>
                )}
              </>
            )}
          </div>

          {notifications.length > INITIAL_DISPLAY && !expanded && (
            <div style={styles.dropdownFooter}>
              <button style={styles.viewAllBtn} onClick={handleExpandClick}>
                Xem tất cả ({notifications.length - INITIAL_DISPLAY}+)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


const styles = {
  container: {
    position: 'relative'
  },
  bellButton: {
    position: 'relative',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: colors.background,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.textPrimary,
    transition: 'all 0.2s',
    ':hover': {
      background: colors.border
    }
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    background: colors.error,
    color: colors.white,
    fontSize: '10px',
    fontWeight: typography.bold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px'
  },
  dropdown: {
    position: 'absolute',
    top: '50px',
    right: 0,
    width: '380px',
    maxHeight: '600px',
    background: colors.white,
    borderRadius: spacing.lg,
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.borderLight}`
  },
  dropdownTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    margin: 0
  },
  markAllBtn: {
    border: 'none',
    background: 'none',
    color: colors.primary,
    fontSize: typography.sm,
    cursor: 'pointer',
    fontWeight: typography.semibold
  },
  notificationList: {
    flex: 1,
    overflow: 'hidden',  // Hidden initially
    maxHeight: 'auto'
  },
  loading: {
    padding: spacing['6xl'],
    textAlign: 'center',
    color: colors.textSecondary
  },
  empty: {
    padding: spacing['6xl'],
    textAlign: 'center',
    color: colors.textSecondary
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: spacing.md
  },
  notificationItem: {
    display: 'flex',
    padding: spacing.md,
    cursor: 'pointer',
    transition: 'background 0.2s',
    borderBottom: `1px solid ${colors.borderLight}`,
    ':hover': {
      background: colors.background
    }
  },
  notificationItemUnread: {
    background: colors.primary + '08'
  },
  notifIcon: {
    fontSize: '24px',
    marginRight: spacing.md,
    flexShrink: 0
  },
  notifContent: {
    flex: 1,
    minWidth: 0
  },
  notifTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  notifMessage: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  notifTime: {
    fontSize: typography.xs,
    color: colors.textSecondary
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: colors.primary,
    flexShrink: 0,
    marginLeft: spacing.sm
  },
  dropdownFooter: {
    borderTop: `1px solid ${colors.borderLight}`,
    padding: spacing.md
  },
  viewAllBtn: {
    width: '100%',
    padding: spacing.md,
    border: 'none',
    background: colors.background,
    color: colors.primary,
    fontSize: typography.base,
    fontWeight: typography.semibold,
    borderRadius: spacing.md,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  // Expanded mode styles
  dropdownExpanded: {
    maxHeight: '80vh',
    height: '600px'
  },
  notificationListExpanded: {
    maxHeight: '400px',
    overflowY: 'auto',
    scrollBehavior: 'smooth'
  },
  headerActions: {
    display: 'flex',
    gap: spacing.md,
    alignItems: 'center'
  },
  collapseBtn: {
    border: 'none',
    background: 'none',
    color: colors.textSecondary,
    fontSize: typography.sm,
    cursor: 'pointer',
    fontWeight: typography.medium,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: spacing.sm,
    transition: 'all 0.2s'
  },
  loadingMore: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    color: colors.textSecondary,
    fontSize: typography.sm
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: `2px solid ${colors.borderLight}`,
    borderTop: `2px solid ${colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  endMessage: {
    textAlign: 'center',
    padding: spacing.lg,
    color: colors.textSecondary,
    fontSize: typography.sm,
    fontStyle: 'italic'
  }
}

// Add keyframes for spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  if (!document.querySelector('style[data-notification-bell]')) {
    style.setAttribute('data-notification-bell', 'true')
    document.head.appendChild(style)
  }
}

