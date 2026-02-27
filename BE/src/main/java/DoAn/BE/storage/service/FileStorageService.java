package DoAn.BE.storage.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.*;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.storage.dto.FileDTO;
import DoAn.BE.storage.dto.FileUploadResponse;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.repository.FolderRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
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

// Core CRUD operations for file storage: upload, download, delete, rename,
// restore.
// Read-only queries are handled by {@link StorageQueryService}.
// /
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final StorageProjectFileUploadListener projectFileUploadListener;
    private final FileValidator fileValidator;
    private final AuditLogService auditLogService;
    private final MinioService minioService;
    private final AccessControlService accessControlService;
    private final DoAn.BE.common.service.QuotaService quotaService;
    private final FileAccessHelper accessHelper;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${storage.type:local}")
    private String storageType;

    private Path fileStorageLocation;

    @Transactional
    public FileUploadResponse uploadFile(MultipartFile file, Long folderId, Long userId, String ipAddress,
            String userAgent) {
        if (TenantContext.getCompanyId() != null) {
            accessControlService.checkStorageUploadPermission();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        fileValidator.validateFile(file);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());

        quotaService.validateFileSize(file.getSize());
        quotaService.validateStorageQuota(file.getSize());

        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findById(folderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục"));

            if (!accessHelper.canAccessFolder(folder, userId)) {
                throw new ForbiddenException("Bạn không có quyền upload vào thư mục này");
            }
        }

        try {
            String filePath;

            if ("minio".equalsIgnoreCase(storageType)) {
                String fileExtension = getFileExtension(originalFilename);
                String uniqueFilename = UUID.randomUUID().toString()
                        + (fileExtension.isEmpty() ? "" : "." + fileExtension);
                String objectName = "users/" + userId + "/" + uniqueFilename;

                minioService.uploadFile(file, objectName);
                filePath = objectName;
            } else {
                initializeStorage();

                String fileExtension = getFileExtension(originalFilename);
                String storedFilename = UUID.randomUUID().toString()
                        + (fileExtension.isEmpty() ? "" : "." + fileExtension);

                Path targetLocation = fileStorageLocation.resolve(storedFilename);
                Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
                filePath = targetLocation.toString();
            }

            File fileEntity = new File();
            String storedFilename = Paths.get(filePath).getFileName().toString();

            fileEntity.setFilename(storedFilename);
            fileEntity.setOriginalFilename(originalFilename);
            fileEntity.setFilePath(filePath);
            fileEntity.setFileSize(file.getSize());
            fileEntity.setMimeType(file.getContentType());
            fileEntity.setFolder(folder);
            fileEntity.setOwner(user);
            fileEntity.setUploadIp(ipAddress);
            fileEntity.setUploadUserAgent(userAgent);
            fileEntity.setVersion(1);
            fileEntity.setIsDeleted(false);

            fileEntity = fileRepository.save(fileEntity);

            log.info("File uploaded successfully: {} by user {}", originalFilename, userId);

            projectFileUploadListener.notifyProjectMembersOnFileUpload(fileEntity);

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
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (!accessHelper.canAccessFile(file, userId)) {
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

        if (file.getIsDeleted()) {
            throw new StorageFileNotFoundException("File đã bị xóa");
        }

        try {
            Resource resource;
            if ("minio".equalsIgnoreCase(storageType)) {
                java.io.InputStream inputStream = minioService.getFile(file.getFilePath());
                resource = new org.springframework.core.io.InputStreamResource(inputStream);
            } else {
                Path filePath = Paths.get(file.getFilePath()).normalize();
                resource = new UrlResource(filePath.toUri());
            }

            if (resource.exists() || "minio".equalsIgnoreCase(storageType)) {
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

        if (!accessHelper.canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền xem file này");
        }

        return convertToDTO(file);
    }

    @Transactional(readOnly = true)
    public List<FileDTO> getFolderFiles(Long folderId, Long userId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thư mục"));

        if (!accessHelper.canAccessFolder(folder, userId)) {
            throw new ForbiddenException("Bạn không có quyền xem thư mục này");
        }

        List<File> files = fileRepository.findByFolder_FolderId(folderId);
        return files.stream()
                .filter(f -> !f.getIsDeleted())
                .map(this::convertToDTO)
                .toList();
    }

    @Transactional
    public void deleteFile(Long fileId, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        if (!accessHelper.canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền xóa file này");
        }

        file.setIsDeleted(true);
        fileRepository.save(file);
    }

    @Transactional
    public void permanentDeleteFile(Long fileId, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        if (!accessHelper.canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền xóa file này");
        }

        try {
            if ("minio".equalsIgnoreCase(storageType)) {
                minioService.deleteFile(file.getFilePath());
            } else {
                Path filePath = Paths.get(file.getFilePath());
                Files.deleteIfExists(filePath);
            }

            fileRepository.delete(file);
        } catch (IOException ex) {
            throw new FileStorageException("Không thể xóa file vật lý", ex);
        }
    }

    @Transactional
    public FileDTO renameFile(Long fileId, String newName, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        if (!accessHelper.canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền đổi tên file này");
        }

        file.setOriginalFilename(newName);
        file = fileRepository.save(file);

        return convertToDTO(file);
    }

    @Transactional
    public void restoreFile(Long fileId, Long userId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        if (!accessHelper.canAccessFile(file, userId)) {
            throw new ForbiddenException("Bạn không có quyền khôi phục file này");
        }

        file.setIsDeleted(false);
        fileRepository.save(file);
    }

    private void initializeStorage() throws IOException {
        if (fileStorageLocation == null) {
            fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(fileStorageLocation);
        }
    }

    private String getFileExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf(".") + 1);
        }
        return "";
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

            if (file.getFolder().getProject() != null) {
                dto.setProjectId(file.getFolder().getProject().getProjectId());
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
