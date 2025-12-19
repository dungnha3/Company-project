package DoAn.BE.storage.validator;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.storage.config.FileSecurityConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Validator cho file upload security
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FileValidator {
    
    private final FileSecurityConfig fileSecurityConfig;
    
    /**
     * Validate file upload (extension, MIME type, size)
     */
    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File không được để trống");
        }
        
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new BadRequestException("Tên file không hợp lệ");
        }
        
        // 1. Check filename không chứa path traversal
        if (originalFilename.contains("..")) {
            log.warn("⚠️ Path traversal attempt detected: {}", originalFilename);
            throw new BadRequestException("❌ Tên file không hợp lệ: chứa ký tự nguy hiểm");
        }
        
        // 2. Check file extension
        String extension = getFileExtension(originalFilename);
        if (!fileSecurityConfig.isExtensionAllowed(extension)) {
            log.warn("⚠️ Blocked file extension: {} ({})", extension, originalFilename);
            throw new BadRequestException(
                String.format("❌ Loại file .%s không được phép upload. " +
                    "Chỉ chấp nhận: %s", 
                    extension, 
                    String.join(", ", fileSecurityConfig.getAllowedExtensions())
                )
            );
        }
        
        // 3. Check MIME type
        String mimeType = file.getContentType();
        if (mimeType != null && !fileSecurityConfig.isMimeTypeAllowed(mimeType)) {
            log.warn("⚠️ Blocked MIME type: {} for file {}", mimeType, originalFilename);
            throw new BadRequestException(
                String.format("❌ Loại file (MIME: %s) không được phép upload", mimeType)
            );
        }
        
        // 4. Check file size
        long fileSize = file.getSize();
        if (!fileSecurityConfig.isFileSizeAllowed(fileSize)) {
            log.warn("⚠️ File too large: {} bytes for file {}", fileSize, originalFilename);
            throw new BadRequestException(
                String.format("❌ File quá lớn: %.2f MB. Giới hạn: %.2f MB",
                    fileSize / (1024.0 * 1024.0),
                    fileSecurityConfig.getMaxFileSize() / (1024.0 * 1024.0))
            );
        }
        
        // 5. Check for null bytes (possible malicious file)
        try {
            byte[] bytes = file.getBytes();
            for (int i = 0; i < Math.min(bytes.length, 1000); i++) {
                if (bytes[i] == 0 && i < 100) {
                    // Null byte found early in file (suspicious)
                    log.warn("⚠️ Suspicious null byte detected in file: {}", originalFilename);
                    // Don't throw, just log (some binary files có null bytes hợp lệ)
                    break;
                }
            }
        } catch (Exception e) {
            log.error("Error reading file bytes: {}", e.getMessage());
        }
        
        log.info("✅ File validation passed: {} ({}, {} bytes)", 
            originalFilename, extension, fileSize);
    }
    
    /**
     * Validate filename only (không cần MultipartFile)
     */
    public void validateFilename(String filename) {
        if (filename == null || filename.isEmpty()) {
            throw new BadRequestException("Tên file không hợp lệ");
        }
        
        if (filename.contains("..")) {
            throw new BadRequestException("Tên file không hợp lệ: chứa ký tự nguy hiểm");
        }
        
        String extension = getFileExtension(filename);
        if (!fileSecurityConfig.isExtensionAllowed(extension)) {
            throw new BadRequestException(
                String.format("Loại file .%s không được phép", extension)
            );
        }
    }
    
    /**
     * Get file extension
     */
    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}
