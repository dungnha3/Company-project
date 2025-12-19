package DoAn.BE.storage.entity;

import DoAn.BE.user.entity.User;
import DoAn.BE.project.entity.Project;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

// Entity quản lý folder (PERSONAL, SHARED, PROJECT) với cấu trúc tree
@Entity
@Table(name = "folders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "folder_id")
    private Long folderId;

    @Column(name = "name", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String name;

    @ManyToOne
    @JoinColumn(name = "parent_folder_id")
    private Folder parentFolder;

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(name = "folder_type", length = 20)
    private FolderType folderType = FolderType.PERSONAL;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "parentFolder", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Folder> subFolders;

    @OneToMany(mappedBy = "folder", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<File> files;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Lấy đường dẫn đầy đủ của folder
    public String getFullPath() {
        if (parentFolder != null) {
            return parentFolder.getFullPath() + "/" + name;
        }
        return name;
    }

    // Kiểm tra folder gốc (không có parent)
    public boolean isRoot() {
        return parentFolder == null;
    }

    // Kiểm tra folder của project
    public boolean isProjectFolder() {
        return folderType == FolderType.PROJECT;
    }

    // Kiểm tra folder được share
    public boolean isSharedFolder() {
        return folderType == FolderType.SHARED;
    }

    // Kiểm tra folder công ty
    public boolean isCompanyFolder() {
        return folderType == FolderType.COMPANY;
    }

    public enum FolderType {
        PERSONAL,
        SHARED,
        PROJECT,
        COMPANY
    }
}
