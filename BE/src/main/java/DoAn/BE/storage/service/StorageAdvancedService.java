package DoAn.BE.storage.service;

import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.repository.FolderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
@Service
@RequiredArgsConstructor
@Slf4j
public class StorageAdvancedService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    @Transactional(readOnly = true)
    public List<File> getSharedFiles(Long userId) {
        log.info("Getting shared files for user {}", userId);

        // OPTIMIZED: Use direct query instead of findAll().stream().filter()
        List<Folder> sharedFolders = folderRepository.findByFolderType(Folder.FolderType.SHARED);

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
    // OPTIMIZED: Use repository query with pagination instead of findAll + stream
    @Transactional(readOnly = true)
    public List<File> getRecentFiles(Long userId, int limit) {
        log.info("Getting recent {} files for user {}", limit, userId);

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        // Use optimized repository query
        List<File> recentFiles = fileRepository.findRecentByOwner(
                userId, thirtyDaysAgo, org.springframework.data.domain.PageRequest.of(0, limit));

        log.info("Found {} recent files for user {}", recentFiles.size(), userId);
        return recentFiles;
    }
    // OPTIMIZED: Use repository query with LIKE instead of loading all + stream
    @Transactional(readOnly = true)
    public List<File> searchFiles(Long userId, String keyword) {
        log.info("Searching files for user {} with keyword: {}", userId, keyword);

        if (keyword == null || keyword.trim().isEmpty()) {
            return new ArrayList<>();
        }

        // Use optimized repository query
        List<File> results = fileRepository.searchByOwnerAndFilename(userId, keyword.trim());

        log.info("Found {} files matching keyword: {}", results.size(), keyword);
        return results;
    }
    // OPTIMIZED: Use aggregate queries instead of loading all files
    @Transactional(readOnly = true)
    public FileStatistics getUserFileStatistics(Long userId) {
        log.info("Getting file statistics for user {}", userId);

        // Use optimized COUNT and SUM queries
        long totalFiles = fileRepository.countByOwner_UserIdAndIsDeletedFalse(userId);

        Long totalSizeResult = fileRepository.sumFileSizeByOwner(userId);
        long totalSize = totalSizeResult != null ? totalSizeResult : 0L;

        // Count by type using pattern matching queries
        long imagesCount = fileRepository.countByOwnerAndMimeTypeLike(userId, "image/%");
        long videosCount = fileRepository.countByOwnerAndMimeTypeLike(userId, "video/%");

        // Documents: pdf, word, excel, text
        long pdfCount = fileRepository.countByOwnerAndMimeTypeLike(userId, "%pdf%");
        long wordCount = fileRepository.countByOwnerAndMimeTypeLike(userId, "%word%");
        long excelCount = fileRepository.countByOwnerAndMimeTypeLike(userId, "%excel%");
        long textCount = fileRepository.countByOwnerAndMimeTypeLike(userId, "text/%");
        long documentsCount = pdfCount + wordCount + excelCount + textCount;

        return new FileStatistics(totalFiles, totalSize, documentsCount, imagesCount, videosCount);
    }

// Inner class for file statistics
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

        public long getTotalFiles() {
            return totalFiles;
        }

        public long getTotalSize() {
            return totalSize;
        }

        public long getDocumentsCount() {
            return documentsCount;
        }

        public long getImagesCount() {
            return imagesCount;
        }

        public long getVideosCount() {
            return videosCount;
        }

        public long getOthersCount() {
            return totalFiles - documentsCount - imagesCount - videosCount;
        }
    }
}
