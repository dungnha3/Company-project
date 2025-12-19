package DoAn.BE.storage.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import DoAn.BE.user.entity.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Entity quản lý file (upload, download, versioning, soft delete, quota)
@Entity
@Table(name = "files")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class File {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    private Long fileId;

    @Column(name = "filename", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String filename;

    @Column(name = "original_filename", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String originalFilename;

    @Column(name = "file_path", nullable = false, length = 500, columnDefinition = "NVARCHAR(500)")
    private String filePath;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "mime_type", length = 100, columnDefinition = "NVARCHAR(100)")
    private String mimeType;

    @ManyToOne
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "version")
    private Integer version = 1;

    @ManyToOne
    @JoinColumn(name = "parent_file_id")
    private File parentFile;

    @Column(name = "upload_ip", length = 50)
    private String uploadIp;

    @Column(name = "upload_user_agent", length = 255)
    private String uploadUserAgent;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @OneToMany(mappedBy = "parentFile", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<File> versions;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Lấy extension của file
    public String getFileExtension() {
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf(".") + 1);
        }
        return "";
    }

    // Format kích thước file (B, KB, MB, GB, TB)
    public String getFileSizeFormatted() {
        if (fileSize == null) return "0 B";
        
        long size = fileSize;
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return size + " " + units[unitIndex];
    }

    // Kiểm tra file là ảnh
    public boolean isImage() {
        return mimeType != null && mimeType.startsWith("image/");
    }

    // Kiểm tra file là document (PDF, Word, Excel)
    public boolean isDocument() {
        return mimeType != null && (
            mimeType.startsWith("application/pdf") ||
            mimeType.startsWith("application/msword") ||
            mimeType.startsWith("application/vnd.openxmlformats-officedocument")
        );
    }

    // Kiểm tra file là video
    public boolean isVideo() {
        return mimeType != null && mimeType.startsWith("video/");
    }

    // Kiểm tra đây có phải phiên bản mới nhất không
    public boolean isLatestVersion() {
        return parentFile == null;
    }

    // Tăng version của file
    public void incrementVersion() {
        this.version++;
        this.updatedAt = LocalDateTime.now();
    }
}
