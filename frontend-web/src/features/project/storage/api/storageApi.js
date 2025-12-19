import { apiService } from '@/shared/services/api.service'

// Storage API for file and folder management
export const storageApi = {
  // ==================== FOLDER APIs ====================

  // Create folder
  createFolder: (folderData) => {
    return apiService.post('/api/storage/folders', folderData)
  },

  // Get folder by ID
  getFolderById: (folderId) => {
    return apiService.get(`/api/storage/folders/${folderId}`)
  },

  // Get my folders
  getMyFolders: (filter = 'personal') => {
    return apiService.get(`/api/storage/folders/my-folders?filter=${filter}`)
  },

  // Get subfolders
  getSubFolders: (folderId) => {
    return apiService.get(`/api/storage/folders/${folderId}/subfolders`)
  },

  // Get project folders
  getProjectFolders: (projectId) => {
    return apiService.get(`/api/storage/folders/project/${projectId}`)
  },

  // Update folder name
  updateFolder: (folderId, name) => {
    return apiService.put(`/api/storage/folders/${folderId}?name=${encodeURIComponent(name)}`)
  },

  // Delete folder
  deleteFolder: (folderId) => {
    return apiService.delete(`/api/storage/folders/${folderId}`)
  },

  // ==================== FILE APIs ====================

  // Rename file
  renameFile: (fileId, newName) => {
    return apiService.put(`/api/storage/files/${fileId}?name=${encodeURIComponent(newName)}`)
  },

  // Restore file
  restoreFile: (fileId) => {
    return apiService.put(`/api/storage/files/${fileId}/restore`)
  },

  // Upload file
  uploadFile: (file, folderId = null) => {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) {
      formData.append('folderId', folderId)
    }
    return apiService.post('/api/storage/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Get file by ID
  getFileById: (fileId) => {
    return apiService.get(`/api/storage/files/${fileId}`)
  },

  // Download file
  downloadFile: (fileId) => {
    return apiService.get(`/api/storage/files/${fileId}/download`, {
      responseType: 'blob'
    })
  },

  // Get my files
  getMyFiles: (filter = 'personal') => {
    return apiService.get(`/api/storage/files/my-files?filter=${filter}`)
  },

  // Get folder files
  getFolderFiles: (folderId) => {
    return apiService.get(`/api/storage/folders/${folderId}/files`)
  },

  // Delete file
  deleteFile: (fileId, permanent = false) => {
    return apiService.delete(`/api/storage/files/${fileId}?permanent=${permanent}`)
  },

  // Get storage stats
  getStorageStats: () => {
    return apiService.get('/api/storage/stats')
  }
}
