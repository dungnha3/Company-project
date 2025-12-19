package DoAn.BE.storage.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.storage.dto.FileDTO;
import DoAn.BE.storage.dto.FileUploadResponse;
import DoAn.BE.storage.dto.StorageStatsDTO;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.repository.FolderRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.notification.service.StorageNotificationService;
import DoAn.BE.storage.validator.FileValidator;
import DoAn.BE.audit.service.AuditLogService;
import DoAn.BE.audit.entity.AuditLog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

// Service quản lý file storage (upload, download, delete, quota, versioning)
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final StorageNotificationService storageNotificationService;
    private final StorageProjectFileUploadListener projectFileUploadListener;
    private final FileValidator fileValidator;
    private final AuditLogService auditLogService;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.storage.user-quota-gb:5}")
    private Long userQuotaGB;

    @Value("${app.storage.admin-quota-gb:10}")
    private Long adminQuotaGB;

    private Path fileStorageLocation;

    @Transactional
    public FileUploadResponse uploadFile(MultipartFile file, Long folderId, Long userId, String ipAddress,
            String userAgent) {
        // Validate user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        // ✅ SECURITY: Validate file (extension, MIME type, size, malicious content)
        fileValidator.validateFile(file);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());

        // Check quota
        checkStorageQuota(userId, file.getSize());

        // Validate folder if provided
        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thư mục"));

            // Check permission: owner OR project member
            if (!canAccessFolder(folder, userId)) {
                throw new ForbiddenException("Bạn không có quyền upload vào thư mục này");
            }
        }

        try {
            // Initialize storage location
            initializeStorage();

            // Generate unique filename
            String fileExtension = getFileExtension(originalFilename);
            String storedFilename = UUID.randomUUID().toString() + (fileExtension.isEmpty() ? "" : "." + fileExtension);

            // Determine storage path
            Path targetLocation = fileStorageLocation.resolve(storedFilename);

            // Copy file to target location
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Save file metadata to database
            File fileEntity = new File();
            fileEntity.setFilename(storedFilename);
            fileEntity.setOriginalFilename(originalFilename);
            fileEntity.setFilePath(targetLocation.toString());
            fileEntity.setFileSize(file.getSize());
            fileEntity.setMimeType(file.getContentType());
            fileEntity.setFolder(folder);
            fileEntity.setOwner(user);
            fileEntity.setUploadIp(ipAddress);
            fileEntity.setUploadUserAgent(userAgent);
            fileEntity.setVersion(1);
            fileEntity.setIsDeleted(false);

            fileEntity = fileRepository.save(fileEntity);

            // Gửi notification cho user về file upload thành công
            log.info("File uploaded successfully: {} by user {}", originalFilename, userId);
            storageNotificationService.createFileUploadNotification(
                    userId,
                    originalFilename,
                    fileEntity.getFileSizeFormatted());

            // Notify project members if this is a project file
            projectFileUploadListener.notifyProjectMembersOnFileUpload(fileEntity);

            // Build response
            FileUploadResponse response = new FileUploadResponse();
            response.setFileId(fileEntity.getFileId());
            response.setFilename(storedFilename);
            response.setOriginalFilename(originalFilename);
            response.setFileSize(file.getSize());
            response.setFileSizeFormatted(fileEntity.getFileSizeFormatted());
            response.setMimeType(file.getContentType());
            response.setDownloadUrl("/api/storage/files/" + fileEntity.getFileId() + "/download");
            response.setMessage("Upload file thành công");

            return response;

        } catch (IOException ex) {
            throw new FileStorageException("Không thể lưu file: " + originalFilename, ex);
        }
    }

    @Transactional(readOnly = true)
    public Resource downloadFile(Long fileId, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        // Check permission: owner OR project member
        if (!canAccessFile(file, userId)) {
            // Audit failed download attempt
            auditLogService.logFailedAction(
                    user,
                    "DOWNLOAD_FILE",
                    "FILE",
                    fileId,
                    "Unauthorized access attempt to file: " + file.getOriginalFilename(),
                    null,
                    null);
            throw new ForbiddenException("Bạn không có quyền tải file này");
        }

        // Check if file is deleted
        if (file.getIsDeleted()) {
            throw new StorageFileNotFoundException("File đã bị xóa");
        }

        try {
            Path filePath = Paths.get(file.getFilePath()).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                // Log successful file download
                auditLogService.logAction(
                        user,
                        "DOWNLOAD_FILE",
                        "FILE",
                        fileId,
                        null,
                        file.getOriginalFilename(),
                        AuditLog.Severity.INFO,
                        null,
                        null);

                log.info("User {} downloaded file: {} ({} bytes)",
                        user.getUsername(), file.getOriginalFilename(), file.getFileSize());

                return resource;
            } else {
                throw new StorageFileNotFoundException(
                        "File không tồn tại hoặc không thể đọc: " + file.getOriginalFilename());
            }
        } catch (MalformedURLException ex) {
            throw new StorageFileNotFoundException("File không tồn tại: " + file.getOriginalFilename());
        }
    }

    @Transactional(readOnly = true)
    public FileDTO getFileById(Long fileId, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        // Check permission: owner OR project member
        if (!canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền xem file này");
        }

        return convertToDTO(file);
    }

    @Transactional(readOnly = true)
    public List<FileDTO> getUserFiles(Long userId) {
        return getFiles(userId, "personal");
    }

    @Transactional(readOnly = true)
    public List<FileDTO> getFiles(Long userId, String filter) {
        userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        List<File> files;

        switch (filter.toLowerCase()) {
            case "company":
                // Get files in COMPANY folders
                files = fileRepository.findByFolder_FolderType(Folder.FolderType.COMPANY);
                break;

            case "project":
                // Get project folders where user is a member
                List<Long> userProjectIds = projectMemberRepository.findByUser_UserId(userId)
                        .stream()
                        .map(pm -> pm.getProject().getProjectId())
                        .collect(Collectors.toList());

                if (userProjectIds.isEmpty()) {
                    files = List.of();
                } else {
                    List<Folder> projectFolders = userProjectIds.stream()
                            .flatMap(projectId -> folderRepository.findByProject_ProjectId(projectId).stream())
                            .collect(Collectors.toList());

                    files = projectFolders.stream()
                            .flatMap(folder -> fileRepository.findByFolder_FolderId(folder.getFolderId()).stream())
                            .filter(f -> !f.getIsDeleted())
                            .distinct()
                            .collect(Collectors.toList());
                }
                break;

            case "trash":
                // 1. Personal files (owned by user)
                List<File> myDeletedFiles = fileRepository.findByOwner_UserId(userId);

                // 2. Project files (user is member of)
                List<Long> myProjectIds = projectMemberRepository.findByUser_UserId(userId)
                        .stream()
                        .map(pm -> pm.getProject().getProjectId())
                        .collect(Collectors.toList());

                List<File> myProjectFiles = List.of();
                if (!myProjectIds.isEmpty()) {
                    List<Folder> projectsFolders = myProjectIds.stream()
                            .flatMap(pid -> folderRepository.findByProject_ProjectId(pid).stream())
                            .collect(Collectors.toList());

                    myProjectFiles = projectsFolders.stream()
                            .flatMap(f -> fileRepository.findByFolder_FolderId(f.getFolderId()).stream())
                            .collect(Collectors.toList());
                }

                // Combine and filter
                java.util.Set<File> allDeleted = new java.util.HashSet<>();
                allDeleted.addAll(myDeletedFiles);
                allDeleted.addAll(myProjectFiles);

                return allDeleted.stream()
                        .filter(File::getIsDeleted)
                        .map(this::convertToDTO)
                        .sorted((f1, f2) -> f2.getUpdatedAt().compareTo(f1.getUpdatedAt()))
                        .collect(Collectors.toList());

            case "all":
                // 1. Personal files
                List<File> personalFiles = fileRepository.findByOwner_UserId(userId);

                // 2. Company files
                List<File> companyFiles = fileRepository.findByFolder_FolderType(Folder.FolderType.COMPANY);

                // 3. Project files
                List<Long> projectIds = projectMemberRepository.findByUser_UserId(userId)
                        .stream()
                        .map(pm -> pm.getProject().getProjectId())
                        .collect(Collectors.toList());

                List<File> projFiles = List.of();
                if (!projectIds.isEmpty()) {
                    List<Folder> projFolders = projectIds.stream()
                            .flatMap(projectId -> folderRepository.findByProject_ProjectId(projectId).stream())
                            .collect(Collectors.toList());

                    projFiles = projFolders.stream()
                            .flatMap(folder -> fileRepository.findByFolder_FolderId(folder.getFolderId()).stream())
                            .filter(f -> !f.getIsDeleted())
                            .collect(Collectors.toList());
                }

                // Combine all
                java.util.Set<File> allFilesSet = new java.util.HashSet<>();
                allFilesSet.addAll(personalFiles);
                allFilesSet.addAll(companyFiles);
                allFilesSet.addAll(projFiles);

                return allFilesSet.stream()
                        .filter(f -> !f.getIsDeleted())
                        .map(this::convertToDTO)
                        .sorted((f1, f2) -> f2.getCreatedAt().compareTo(f1.getCreatedAt()))
                        .collect(Collectors.toList());

            case "personal":
            default:
                files = fileRepository.findByOwner_UserId(userId);
                break;
        }

        return files.stream()
                .filter(f -> !f.getIsDeleted())
                .map(this::convertToDTO)
                .sorted((f1, f2) -> f2.getCreatedAt().compareTo(f1.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FileDTO> getFolderFiles(Long folderId, Long userId) {
        // Validate folder
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thư mục"));

        // Check permission: owner OR project member
        if (!canAccessFolder(folder, userId)) {
            throw new ForbiddenException("Bạn không có quyền xem thư mục này");
        }

        List<File> files = fileRepository.findByFolder_FolderId(folderId);
        return files.stream()
                .filter(f -> !f.getIsDeleted())
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteFile(Long fileId, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        // Check permission: owner OR project member
        if (!canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền xóa file này");
        }

        file.setIsDeleted(true);
        fileRepository.save(file);
    }

    @Transactional
    public void permanentDeleteFile(Long fileId, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        // Check permission: owner OR project member
        if (!canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền xóa file này");
        }

        try {
            // Delete physical file
            Path filePath = Paths.get(file.getFilePath());
            Files.deleteIfExists(filePath);

            // Delete from database
            fileRepository.delete(file);
        } catch (IOException ex) {
            throw new FileStorageException("Không thể xóa file vật lý", ex);
        }
    }

    @Transactional
    public FileDTO renameFile(Long fileId, String newName, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        // Check permission
        if (!canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền đổi tên file này");
        }

        // Update name
        file.setOriginalFilename(newName);
        file = fileRepository.save(file);

        return convertToDTO(file);
    }

    @Transactional
    public void restoreFile(Long fileId, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        // Check permission
        if (!canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền khôi phục file này");
        }

        file.setIsDeleted(false);
        fileRepository.save(file);
    }

    @Transactional(readOnly = true)
    public StorageStatsDTO getStorageStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        // Get ALL accessible folders (owned + project)
        List<Folder> ownedFolders = folderRepository.findByOwner_UserId(userId);

        // Get project folders where user is a member
        List<Long> userProjectIds = projectMemberRepository.findByUser_UserId(userId)
                .stream()
                .map(pm -> pm.getProject().getProjectId())
                .toList();

        List<Folder> projectFolders = userProjectIds.isEmpty()
                ? List.of()
                : userProjectIds.stream()
                        .flatMap(projectId -> folderRepository.findByProject_ProjectId(projectId).stream())
                        .filter(f -> !ownedFolders.contains(f)) // Avoid duplicates
                        .toList();

        // Combine all accessible folders
        List<Folder> allFolders = new java.util.ArrayList<>(ownedFolders);
        allFolders.addAll(projectFolders);

        // Get ALL accessible files (owned + in accessible folders)
        List<File> ownedFiles = fileRepository.findByOwner_UserId(userId);

        // Get files from accessible project folders
        List<File> projectFiles = projectFolders.stream()
                .flatMap(folder -> fileRepository.findByFolder_FolderId(folder.getFolderId()).stream())
                .filter(f -> !ownedFiles.contains(f)) // Avoid duplicates
                .filter(f -> !f.getIsDeleted())
                .toList();

        // Combine all accessible files
        List<File> allFiles = new java.util.ArrayList<>(ownedFiles);
        allFiles.addAll(projectFiles);

        // Calculate stats
        long totalFiles = allFiles.stream().filter(f -> !f.getIsDeleted()).count();
        long totalFolders = allFolders.size();
        long totalSize = allFiles.stream()
                .filter(f -> !f.getIsDeleted())
                .mapToLong(File::getFileSize)
                .sum();

        // Count file types
        long fileTypes = allFiles.stream()
                .filter(f -> !f.getIsDeleted())
                .map(f -> f.getMimeType() != null ? f.getMimeType().split("/")[0] : "unknown")
                .distinct()
                .count();

        // Determine quota based on role
        long quotaBytes = (user.getRole().name().equals("ADMIN") ? adminQuotaGB : userQuotaGB) * 1024 * 1024 * 1024;
        long remainingQuota = quotaBytes - totalSize;
        double usagePercentage = (double) totalSize / quotaBytes * 100;

        StorageStatsDTO stats = new StorageStatsDTO();
        stats.setTotalFiles(totalFiles);
        stats.setTotalFolders(totalFolders);
        stats.setTotalSize(totalSize);
        stats.setTotalSizeFormatted(formatSize(totalSize));
        stats.setQuotaLimit(quotaBytes);
        stats.setQuotaLimitFormatted(formatSize(quotaBytes));
        stats.setRemainingQuota(remainingQuota);
        stats.setRemainingQuotaFormatted(formatSize(remainingQuota));
        stats.setUsagePercentage(Math.round(usagePercentage * 100.0) / 100.0);
        stats.setFileTypes(fileTypes);

        return stats;
    }

    // Helper methods
    private void initializeStorage() throws IOException {
        if (fileStorageLocation == null) {
            fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(fileStorageLocation);
        }
    }

    private void checkStorageQuota(Long userId, long fileSize) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        List<File> userFiles = fileRepository.findByOwner_UserId(userId);
        long currentUsage = userFiles.stream()
                .filter(f -> !f.getIsDeleted())
                .mapToLong(File::getFileSize)
                .sum();

        long quotaBytes = (user.getRole().name().equals("ADMIN") ? adminQuotaGB : userQuotaGB) * 1024 * 1024 * 1024;
        long newUsage = currentUsage + fileSize;

        // Kiểm tra vượt quota
        if (newUsage > quotaBytes) {
            // Gửi notification khi hết quota
            storageNotificationService.createQuotaExceededNotification(userId);
            log.warn("User {} exceeded storage quota: {} / {}", userId, formatSize(newUsage), formatSize(quotaBytes));

            throw new StorageQuotaExceededException(
                    String.format("Vượt quá dung lượng cho phép. Đã dùng: %s, Giới hạn: %s",
                            formatSize(currentUsage), formatSize(quotaBytes)));
        }

        // Cảnh báo khi dùng > 80% quota
        double usagePercent = (double) newUsage / quotaBytes * 100;
        if (usagePercent > 80 && usagePercent <= 90) {
            storageNotificationService.createQuotaWarningNotification(userId, (int) Math.round(usagePercent));
            log.info("User {} storage usage warning: {}%", userId, Math.round(usagePercent));
        } else if (usagePercent > 90) {
            storageNotificationService.createQuotaWarningNotification(userId, (int) Math.round(usagePercent));
            log.warn("User {} storage usage critical: {}%", userId, Math.round(usagePercent));
        }
    }

    private String getFileExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf(".") + 1);
        }
        return "";
    }

    private String formatSize(long bytes) {
        if (bytes == 0)
            return "0 B";

        String[] units = { "B", "KB", "MB", "GB", "TB" };
        int unitIndex = 0;
        double size = bytes;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return String.format("%.2f %s", size, units[unitIndex]);
    }

    /**
     * Check if user can access folder (owner or project member)
     * Also checks parent folder recursively for subfolders in project folders
     */
    private boolean canAccessFolder(Folder folder, Long userId) {
        // Owner can always access
        if (folder.getOwner().getUserId().equals(userId)) {
            return true;
        }

        // Company folder is accessible by everyone
        if (folder.isCompanyFolder()) {
            return true;
        }

        // If folder is PROJECT type, check if user is project member
        if (folder.getFolderType() == Folder.FolderType.PROJECT && folder.getProject() != null) {
            return projectMemberRepository.findByProject_ProjectIdAndUser_UserId(
                    folder.getProject().getProjectId(), userId).isPresent();
        }

        // ✅ NEW: Check parent folder recursively
        // If this is a subfolder inside a project folder, check parent permission
        if (folder.getParentFolder() != null) {
            return canAccessFolder(folder.getParentFolder(), userId);
        }

        return false;
    }

    /**
     * Check if user can access file (owner or project member if file in project
     * folder)
     */
    private boolean canAccessFile(File file, Long userId) {
        // Owner can always access
        if (file.getOwner().getUserId().equals(userId)) {
            return true;
        }

        // If file is in a PROJECT folder, check if user is project member
        if (file.getFolder() != null) {
            return canAccessFolder(file.getFolder(), userId);
        }

        return false;
    }

    private FileDTO convertToDTO(File file) {
        FileDTO dto = new FileDTO();
        dto.setFileId(file.getFileId());
        dto.setFilename(file.getFilename());
        dto.setOriginalFilename(file.getOriginalFilename());
        dto.setFilePath(file.getFilePath());
        dto.setFileSize(file.getFileSize());
        dto.setFileSizeFormatted(file.getFileSizeFormatted());
        dto.setMimeType(file.getMimeType());
        dto.setFileExtension(file.getFileExtension());

        if (file.getFolder() != null) {
            dto.setFolderId(file.getFolder().getFolderId());
            dto.setFolderName(file.getFolder().getName());

            // Populate projectId if exists
            if (file.getFolder().getProject() != null) {
                dto.setProjectId(file.getFolder().getProject().getProjectId());
            } else if (file.getFolder().getParentFolder() != null) {
                // Try parent folder (recursive usually needed but simple 1-level check here)
                // Ideally backend ensures subfolders have project_id or we traverse
            }
        }

        dto.setOwnerId(file.getOwner().getUserId());
        dto.setOwnerName(file.getOwner().getUsername());
        dto.setVersion(file.getVersion());
        dto.setIsLatestVersion(file.isLatestVersion());
        dto.setCreatedAt(file.getCreatedAt());
        dto.setUpdatedAt(file.getUpdatedAt());
        dto.setIsImage(file.isImage());
        dto.setIsDocument(file.isDocument());
        dto.setIsVideo(file.isVideo());

        return dto;
    }
}
