package DoAn.BE.storage.config;

import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Configuration cho file security
 * Whitelist/Blacklist file types và max file size
 */
@Configuration
@ConfigurationProperties(prefix = "app.storage.security")
@Getter
public class FileSecurityConfig {
    
    // Max file size (50MB default)
    private long maxFileSize = 50 * 1024 * 1024;
    
    // Whitelist extensions (chỉ cho phép các loại này)
    private Set<String> allowedExtensions = new HashSet<>(Arrays.asList(
        // Documents
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "txt", "rtf", "odt", "ods", "odp",
        
        // Images
        "jpg", "jpeg", "png", "gif", "bmp", "webp", "svg",
        
        // Archives
        "zip", "rar", "7z", "tar", "gz",
        
        // Development files (cho project files)
        "java", "js", "ts", "jsx", "tsx", "json", "xml", "yaml", "yml",
        "html", "css", "scss", "sass", "md", "sql",
        
        // Config files
        "properties", "conf", "config"
    ));
    
    // Blacklist extensions (KHÔNG BAO GIỜ cho phép)
    private Set<String> blockedExtensions = new HashSet<>(Arrays.asList(
        // Executable files
        "exe", "bat", "cmd", "com", "msi", "ps1",
        "sh", "bash", "app", "dmg", "pkg",
        
        // Script files (nguy hiểm)
        "vbs", "vbe", "wsf", "wsh", "scr",
        
        // Dangerous files
        "dll", "sys", "drv"
    ));
    
    // Whitelist MIME types
    private Set<String> allowedMimeTypes = new HashSet<>(Arrays.asList(
        // Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/rtf",
        
        // Images
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/webp",
        "image/svg+xml",
        
        // Archives
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
        "application/x-tar",
        "application/gzip",
        
        // Text/Code
        "text/html",
        "text/css",
        "text/javascript",
        "application/json",
        "application/xml",
        "text/markdown"
    ));
    
    // Setters for Spring Boot configuration
    public void setMaxFileSize(long maxFileSize) {
        this.maxFileSize = maxFileSize;
    }
    
    public void setAllowedExtensions(Set<String> allowedExtensions) {
        this.allowedExtensions = allowedExtensions;
    }
    
    public void setBlockedExtensions(Set<String> blockedExtensions) {
        this.blockedExtensions = blockedExtensions;
    }
    
    public void setAllowedMimeTypes(Set<String> allowedMimeTypes) {
        this.allowedMimeTypes = allowedMimeTypes;
    }
    
    /**
     * Kiểm tra extension có được phép không
     */
    public boolean isExtensionAllowed(String extension) {
        if (extension == null || extension.isEmpty()) {
            return false;
        }
        
        String ext = extension.toLowerCase();
        
        // Check blacklist trước
        if (blockedExtensions.contains(ext)) {
            return false;
        }
        
        // Check whitelist
        return allowedExtensions.contains(ext);
    }
    
    /**
     * Kiểm tra MIME type có được phép không
     */
    public boolean isMimeTypeAllowed(String mimeType) {
        if (mimeType == null || mimeType.isEmpty()) {
            return false;
        }
        
        return allowedMimeTypes.contains(mimeType.toLowerCase());
    }
    
    /**
     * Kiểm tra file size có vượt quá giới hạn không
     */
    public boolean isFileSizeAllowed(long fileSize) {
        return fileSize <= maxFileSize;
    }
}
