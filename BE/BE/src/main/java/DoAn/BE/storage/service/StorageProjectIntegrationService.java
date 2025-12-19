package DoAn.BE.storage.service;

import DoAn.BE.project.entity.Project;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.repository.FolderRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.common.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service tích hợp Storage với Project
 * - Quản lý files trong projects
 * - Tạo folders cho projects
 * - Get project files
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorageProjectIntegrationService {
    
    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;
    private final ProjectRepository projectRepository;
    
    /**
     * Lấy hoặc tạo folder SHARED cho project
     * CHỈ có 1 folder cho 1 project, được share bởi tất cả members
     */
    @Transactional
    public Folder getOrCreateProjectFolder(Project project, User creator) {
        // Tìm folder theo project (CHỈ 1 folder cho project)
        List<Folder> existingFolders = folderRepository.findByProject(project);
        if (!existingFolders.isEmpty()) {
            log.info("Found existing shared project folder {} for project {}", 
                existingFolders.get(0).getFolderId(), project.getProjectId());
            return existingFolders.get(0);
        }
        
        // Tạo folder SHARED mới với type PROJECT
        Folder folder = new Folder();
        folder.setName(project.getName());
        folder.setOwner(creator); // Creator is owner, but all members can access
        folder.setFolderType(Folder.FolderType.PROJECT);
        folder.setProject(project);
        folder.setCreatedAt(LocalDateTime.now());
        
        folder = folderRepository.save(folder);
        log.info("Created shared project folder {} for project {}", 
            folder.getFolderId(), project.getProjectId());
        
        return folder;
    }
    
    /**
     * Lấy tất cả files trong project
     */
    @Transactional(readOnly = true)
    public List<File> getProjectFiles(Long projectId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new EntityNotFoundException("Project không tồn tại"));
        
        // Lấy project folder
        List<Folder> projectFolders = folderRepository.findByProject(project);
        if (projectFolders.isEmpty()) {
            return List.of();
        }
        
        Folder projectFolder = projectFolders.get(0);
        
        // Lấy tất cả files trong folder
        return fileRepository.findByFolder(projectFolder);
    }
    
    /**
     * Lấy file statistics trong project
     */
    @Transactional(readOnly = true)
    public ProjectFileStats getProjectFileStats(Long projectId) {
        List<File> files = getProjectFiles(projectId);
        
        long totalSize = files.stream()
            .mapToLong(File::getFileSize)
            .sum();
        
        long documentCount = files.stream()
            .filter(f -> f.getMimeType() != null && 
                    (f.getMimeType().contains("document") || 
                     f.getMimeType().contains("pdf") ||
                     f.getMimeType().contains("word") ||
                     f.getMimeType().contains("excel")))
            .count();
        
        long imageCount = files.stream()
            .filter(f -> f.getMimeType() != null && f.getMimeType().startsWith("image/"))
            .count();
        
        long otherCount = files.size() - documentCount - imageCount;
        
        return new ProjectFileStats(files.size(), documentCount, imageCount, otherCount, totalSize);
    }
    
    /**
     * Inner class cho statistics
     */
    public static class ProjectFileStats {
        private final long totalFiles;
        private final long documentCount;
        private final long imageCount;
        private final long otherCount;
        private final long totalSize;
        
        public ProjectFileStats(long totalFiles, long documentCount, long imageCount, long otherCount, long totalSize) {
            this.totalFiles = totalFiles;
            this.documentCount = documentCount;
            this.imageCount = imageCount;
            this.otherCount = otherCount;
            this.totalSize = totalSize;
        }
        
        public long getTotalFiles() { return totalFiles; }
        public long getDocumentCount() { return documentCount; }
        public long getImageCount() { return imageCount; }
        public long getOtherCount() { return otherCount; }
        public long getTotalSize() { return totalSize; }
        public String getTotalSizeFormatted() {
            if (totalSize < 1024) return totalSize + " B";
            if (totalSize < 1024 * 1024) return String.format("%.2f KB", totalSize / 1024.0);
            if (totalSize < 1024 * 1024 * 1024) return String.format("%.2f MB", totalSize / (1024.0 * 1024));
            return String.format("%.2f GB", totalSize / (1024.0 * 1024 * 1024));
        }
    }
}
