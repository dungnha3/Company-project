package DoAn.BE.storage.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;
import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "files", indexes = {
        // Index cho query: findByFolder (Files trong folder)
        @jakarta.persistence.Index(name = "idx_file_folder", columnList = "folder_id"),
        // Index cho query: findByOwner (User's files)
        @jakarta.persistence.Index(name = "idx_file_owner", columnList = "owner_id"),
        // Index cho query: findByIsDeleted (Non-deleted files)
        @jakarta.persistence.Index(name = "idx_file_deleted", columnList = "is_deleted"),
        // Index cho query: findByMimeType (File type filter)
        @jakarta.persistence.Index(name = "idx_file_mimetype", columnList = "mime_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class File extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    @EqualsAndHashCode.Include
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "version")
    private Integer version = 1;

    @ManyToOne(fetch = FetchType.LAZY)
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

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = false; // Mặc định là private

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

    public String getFileExtension() {
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf(".") + 1);
        }
        return "";
    }

    // Format kích thước file (B, KB, MB, GB, TB)
    public String getFileSizeFormatted() {
        if (fileSize == null)
            return "0 B";

        double size = fileSize;
        String[] units = { "B", "KB", "MB", "GB", "TB" };
        int unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024.0;
            unitIndex++;
        }

        return String.format("%.1f %s", size, units[unitIndex]);
    }

    public boolean isImage() {
        return mimeType != null && mimeType.startsWith("image/");
    }

    public boolean isDocument() {
        return mimeType != null && (mimeType.startsWith("application/pdf") ||
                mimeType.startsWith("application/msword") ||
                mimeType.startsWith("application/vnd.openxmlformats-officedocument"));
    }

    public boolean isVideo() {
        return mimeType != null && mimeType.startsWith("video/");
    }

    public boolean isLatestVersion() {
        return parentFile == null;
    }

    // Tăng version của file
    public void incrementVersion() {
        this.version++;
        this.updatedAt = LocalDateTime.now();
    }

    public String getUrl() {
        return "/api/files/" + this.fileId; // Basic download URL
    }
}
