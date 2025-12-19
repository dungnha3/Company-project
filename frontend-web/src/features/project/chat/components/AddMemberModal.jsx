import { useState } from 'react'
import { chatRoomApi } from '../api/chatRoomApi'
import { userApi } from '../../projects/api/userApi'
import { useToast } from '@/shared/components/ui'

export default function AddMemberModal({ isOpen, onClose, roomId, currentMembers = [], onSuccess }) {
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  if (!isOpen) return null

  const handleSearch = async () => {
    if (!searchEmail.trim()) return
    try {
      const users = await userApi.searchUsers(searchEmail)
      const filtered = users.filter(user => !currentMembers.find(m => m.userId === user.userId))
      setSearchResults(filtered)
    } catch (err) {
      setError('Không thể tìm kiếm người dùng')
    }
  }

  const handleAddMember = async (user) => {
    try {
      setLoading(true)
      setError('')
      await chatRoomApi.addMember(roomId, user.userId)
      toast.success(`Đã thêm ${user.username} vào nhóm`)
      if (onSuccess) onSuccess()
      handleClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể thêm thành viên')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSearchEmail('')
    setSearchResults([])
    setError('')
    setLoading(false)
    onClose()
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Thêm thành viên</h3>
          <button style={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div style={styles.content}>
          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          <div style={styles.searchBox}>
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Nhập email hoặc username..."
              style={styles.input}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} style={styles.searchBtn}>🔍</button>
          </div>

          {searchResults.length > 0 && (
            <div style={styles.resultsList}>
              {searchResults.map(user => (
                <div key={user.userId} style={styles.userItem}>
                  <div style={styles.userAvatar}>{user.username?.charAt(0).toUpperCase()}</div>
                  <div style={styles.userInfo}>
                    <div style={styles.userName}>{user.username}</div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => handleAddMember(user)}
                    disabled={loading}
                    style={{ ...styles.addBtn, opacity: loading ? 0.6 : 1 }}
                  >+</button>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchEmail && (
            <div style={styles.noResults}>Không tìm thấy người dùng</div>
          )}
        </div>
      </div>
    </div>
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
    maxHeight: '75vh',
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
    padding: '24px',
    overflowY: 'auto',
  },
  errorBox: {
    padding: '14px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '12px',
    color: '#dc2626',
    marginBottom: '20px',
    fontSize: '14px',
  },
  searchBox: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '14px 18px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  searchBtn: {
    padding: '14px 20px',
    border: 'none',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #0084ff 0%, #0077e6 100%)',
    color: '#FFFFFF',
    fontSize: '18px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)',
  },
  resultsList: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  userAvatar: {
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
  userInfo: { flex: 1 },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  addBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#FFFFFF',
    fontSize: '22px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '14px',
  },
}
