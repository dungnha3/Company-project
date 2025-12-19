import { useState } from 'react'
import { messageApi } from '../api/messageApi'
import { storageApi } from '../../storage/api/storageApi'
import { colors, typography, spacing } from '@/shared/styles/theme'

export default function FileUploadModal({ isOpen, onClose, roomId, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File quá lớn. Tối đa 10MB')
        return
      }
      setSelectedFile(file)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      setError('')

      // Step 1: Upload file to storage (mock for now)
      // In production, call actual storage API
      // Step 1: Upload file to storage
      const uploadResponse = await storageApi.uploadFile(selectedFile)
      const fileId = uploadResponse.fileId

      // Step 2: Send message with file
      const messageType = selectedFile.type.startsWith('image/') ? 'IMAGE' : 'FILE'

      if (messageType === 'IMAGE') {
        await messageApi.sendImageMessage(roomId, fileId, caption)
      } else {
        await messageApi.sendFileMessage(roomId, fileId, caption)
      }

      if (onSuccess) {
        onSuccess()
      }

      handleClose()
    } catch (err) {
      setError('Không thể tải file lên')
      setUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setCaption('')
    setError('')
    setUploading(false)
    onClose()
  }

  const getFileIcon = () => {
    if (!selectedFile) return '📄'

    if (selectedFile.type.startsWith('image/')) return '🖼️'
    if (selectedFile.type.startsWith('video/')) return '🎥'
    if (selectedFile.type.includes('pdf')) return '📕'
    if (selectedFile.type.includes('word')) return '📘'
    if (selectedFile.type.includes('excel')) return '📗'
    return '📄'
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Gửi file</h3>
          <button style={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div style={styles.content}>
          {error && (
            <div style={styles.errorBox}>⚠️ {error}</div>
          )}

          {!selectedFile ? (
            <div style={styles.uploadArea}>
              <input
                type="file"
                id="file-input"
                style={styles.fileInput}
                onChange={handleFileSelect}
              />
              <label htmlFor="file-input" style={styles.uploadLabel}>
                <div style={styles.uploadIcon}>📎</div>
                <div style={styles.uploadText}>Chọn file để tải lên</div>
                <div style={styles.uploadHint}>Tối đa 10MB</div>
              </label>
            </div>
          ) : (
            <>
              <div style={styles.filePreview}>
                <div style={styles.fileIcon}>{getFileIcon()}</div>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{selectedFile.name}</div>
                  <div style={styles.fileSize}>{formatFileSize(selectedFile.size)}</div>
                </div>
                <button
                  style={styles.removeBtn}
                  onClick={() => setSelectedFile(null)}
                >
                  ×
                </button>
              </div>

              <div style={styles.captionInput}>
                <input
                  type="text"
                  placeholder="Thêm chú thích (tùy chọn)..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  style={styles.input}
                />
              </div>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <button
            onClick={handleClose}
            style={styles.cancelBtn}
            disabled={uploading}
          >
            Hủy
          </button>
          <button
            onClick={handleUpload}
            style={{
              ...styles.uploadBtn,
              ...(uploading || !selectedFile ? styles.btnDisabled : {})
            }}
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Đang gửi...' : 'Gửi'}
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
    borderRadius: spacing.lg,
    width: '90%',
    maxWidth: '500px',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottom: `1px solid ${colors.border}`
  },
  title: {
    fontSize: typography.lg,
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
    fontSize: '24px',
    cursor: 'pointer'
  },
  content: {
    padding: spacing.xl
  },
  errorBox: {
    padding: spacing.md,
    backgroundColor: '#fef2f2',
    border: `1px solid ${colors.error}`,
    borderRadius: spacing.md,
    color: colors.error,
    marginBottom: spacing.lg,
    fontSize: typography.sm
  },
  uploadArea: {
    border: `2px dashed ${colors.border}`,
    borderRadius: spacing.lg,
    padding: spacing['6xl'],
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  fileInput: {
    display: 'none'
  },
  uploadLabel: {
    cursor: 'pointer'
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: spacing.lg
  },
  uploadText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm
  },
  uploadHint: {
    fontSize: typography.sm,
    color: colors.textSecondary
  },
  filePreview: {
    display: 'flex',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: spacing.lg,
    marginBottom: spacing.lg
  },
  fileIcon: {
    fontSize: '32px',
    marginRight: spacing.md
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  fileSize: {
    fontSize: typography.sm,
    color: colors.textSecondary
  },
  removeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    background: colors.error,
    color: colors.white,
    fontSize: '20px',
    cursor: 'pointer'
  },
  captionInput: {
    marginBottom: spacing.lg
  },
  input: {
    width: '100%',
    padding: spacing.md,
    border: `1px solid ${colors.border}`,
    borderRadius: spacing.md,
    fontSize: typography.base,
    outline: 'none'
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
    borderRadius: spacing.md,
    background: colors.white,
    color: colors.textPrimary,
    fontSize: typography.base,
    cursor: 'pointer'
  },
  uploadBtn: {
    padding: `${spacing.md} ${spacing.xl}`,
    border: 'none',
    borderRadius: spacing.md,
    background: colors.primary,
    color: colors.white,
    fontSize: typography.base,
    cursor: 'pointer'
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  }
}
