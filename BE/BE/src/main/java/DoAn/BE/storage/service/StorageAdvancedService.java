package DoAn.BE.storage.service;

import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.repository.FolderRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service cung cấp tính năng nâng cao cho Storage
 * - Files shared with me
 * - Recent files
 * - File search
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorageAdvancedService {
    
    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    
    /**
     * Lấy danh sách files được share với user
     * (Đơn giản: files trong SHARED folders mà user có quyền truy cập)
     */
    @Transactional(readOnly = true)
    public List<File> getSharedFiles(Long userId) {
        log.info("Getting shared files for user {}", userId);
        
        // Get all SHARED folders
        List<Folder> sharedFolders = folderRepository.findAll().stream()
            .filter(f -> f.getFolderType() == Folder.FolderType.SHARED)
            .collect(Collectors.toList());
        
        List<File> sharedFiles = new ArrayList<>();
        for (Folder folder : sharedFolders) {
            List<File> folderFiles = fileRepository.findByFolder(folder);
            // Exclude files owned by current user
            sharedFiles.addAll(folderFiles.stream()
                .filter(f -> f.getOwner() != null && !f.getOwner().getUserId().equals(userId))
                .filter(f -> !f.getIsDeleted())
                .collect(Collectors.toList()));
        }
        
        log.info("Found {} shared files for user {}", sharedFiles.size(), userId);
        return sharedFiles;
    }
    
    /**
     * Lấy recent files của user (30 ngày gần nhất)
     */
    @Transactional(readOnly = true)
    public List<File> getRecentFiles(Long userId, int limit) {
        log.info("Getting recent {} files for user {}", limit, userId);
        
        // Get all files of user
        List<File> userFiles = fileRepository.findByOwner_UserId(userId);
        
        // Filter last 30 days and sort by createdAt desc
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<File> recentFiles = userFiles.stream()
            .filter(f -> !f.getIsDeleted())
            .filter(f -> f.getCreatedAt() != null && f.getCreatedAt().isAfter(thirtyDaysAgo))
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .limit(limit)
            .collect(Collectors.toList());
        
        log.info("Found {} recent files for user {}", recentFiles.size(), userId);
        return recentFiles;
    }
    
    /**
     * Search files by filename
     */
    @Transactional(readOnly = true)
    public List<File> searchFiles(Long userId, String keyword) {
        log.info("Searching files for user {} with keyword: {}", userId, keyword);
        
        if (keyword == null || keyword.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        String searchKeyword = keyword.toLowerCase();
        
        // Get all files of user
        List<File> userFiles = fileRepository.findByOwner_UserId(userId);
        
        // Search by original filename
        List<File> results = userFiles.stream()
            .filter(f -> !f.getIsDeleted())
            .filter(f -> f.getOriginalFilename() != null && 
                        f.getOriginalFilename().toLowerCase().contains(searchKeyword))
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .collect(Collectors.toList());
        
        log.info("Found {} files matching keyword: {}", results.size(), keyword);
        return results;
    }
    
    /**
     * Get file statistics for user
     */
    @Transactional(readOnly = true)
    public FileStatistics getUserFileStatistics(Long userId) {
        log.info("Getting file statistics for user {}", userId);
        
        List<File> userFiles = fileRepository.findByOwner_UserId(userId);
        
        long totalFiles = userFiles.stream()
            .filter(f -> !f.getIsDeleted())
            .count();
        
        long totalSize = userFiles.stream()
            .filter(f -> !f.getIsDeleted())
            .mapToLong(File::getFileSize)
            .sum();
        
        // Count by type
        long documentsCount = userFiles.stream()
            .filter(f -> !f.getIsDeleted())
            .filter(f -> isDocument(f.getMimeType()))
            .count();
        
        long imagesCount = userFiles.stream()
            .filter(f -> !f.getIsDeleted())
            .filter(f -> isImage(f.getMimeType()))
            .count();
        
        long videosCount = userFiles.stream()
            .filter(f -> !f.getIsDeleted())
            .filter(f -> isVideo(f.getMimeType()))
            .count();
        
        return new FileStatistics(totalFiles, totalSize, documentsCount, imagesCount, videosCount);
    }
    
    private boolean isDocument(String mimeType) {
        if (mimeType == null) return false;
        return mimeType.contains("pdf") || mimeType.contains("word") || 
               mimeType.contains("excel") || mimeType.contains("text");
    }
    
    private boolean isImage(String mimeType) {
        if (mimeType == null) return false;
        return mimeType.startsWith("image/");
    }
    
    private boolean isVideo(String mimeType) {
        if (mimeType == null) return false;
        return mimeType.startsWith("video/");
    }
    
    /**
     * Inner class for file statistics
     */
    public static class FileStatistics {
        private final long totalFiles;
        private final long totalSize;
        private final long documentsCount;
        private final long imagesCount;
        private final long videosCount;
        
        public FileStatistics(long totalFiles, long totalSize, long documentsCount, 
                            long imagesCount, long videosCount) {
            this.totalFiles = totalFiles;
            this.totalSize = totalSize;
            this.documentsCount = documentsCount;
            this.imagesCount = imagesCount;
            this.videosCount = videosCount;
        }
        
        public long getTotalFiles() { return totalFiles; }
        public long getTotalSize() { return totalSize; }
        public long getDocumentsCount() { return documentsCount; }
        public long getImagesCount() { return imagesCount; }
        public long getVideosCount() { return videosCount; }
        public long getOthersCount() { 
            return totalFiles - documentsCount - imagesCount - videosCount; 
        }
    }
}
