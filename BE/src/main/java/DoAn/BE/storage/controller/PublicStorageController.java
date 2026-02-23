package DoAn.BE.storage.controller;

import DoAn.BE.common.exception.StorageFileNotFoundException;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.service.MinioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

// Public controller for accessing files without authentication.
// Used for displaying company logos, public images, etc.
@RestController
@RequestMapping("/api/public/files")
@RequiredArgsConstructor
@Slf4j
public class PublicStorageController {

    private final FileRepository fileRepository;
    private final MinioService minioService;

    @Value("${storage.type:local}")
    private String storageType;

// Download a file without authentication.
// This endpoint is intended for publicly accessible files like company logos.
    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> downloadPublicFile(@PathVariable Long fileId) {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new StorageFileNotFoundException("Không tìm thấy file"));

        // Check if file is deleted
        if (file.getIsDeleted()) {
            throw new StorageFileNotFoundException("File đã bị xóa");
        }

        // Check if file is public - prevent file enumeration attack
        if (!Boolean.TRUE.equals(file.getIsPublic())) {
            throw new StorageFileNotFoundException("File không được phép truy cập công khai");
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
                log.debug("Public file download: {} ({})", file.getOriginalFilename(), fileId);

                // Determine content disposition based on file type
                String contentDisposition = file.getMimeType() != null && file.getMimeType().startsWith("image/")
                        ? "inline" // Display images inline in browser
                        : "attachment"; // Download other files

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(
                                file.getMimeType() != null ? file.getMimeType() : "application/octet-stream"))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                contentDisposition + "; filename=\"" + file.getOriginalFilename() + "\"")
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400") // Cache for 24 hours
                        .body(resource);
            } else {
                throw new StorageFileNotFoundException(
                        "File không tồn tại hoặc không thể đọc: " + file.getOriginalFilename());
            }
        } catch (MalformedURLException ex) {
            throw new StorageFileNotFoundException("File không tồn tại: " + file.getOriginalFilename());
        }
    }
}
