package DoAn.BE.storage.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import DoAn.BE.user.entity.User;
import DoAn.BE.project.entity.Project;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.Filter;
@Entity
@Table(name = "folders", indexes = {
        // Index cho query: findByOwner (User's folders)
        @jakarta.persistence.Index(name = "idx_folder_owner", columnList = "owner_id"),
        // Index cho query: findByParentFolder (Subfolder lookup)
        @jakarta.persistence.Index(name = "idx_folder_parent", columnList = "parent_folder_id"),
        // Index cho query: findByFolderType (Type filter)
        @jakarta.persistence.Index(name = "idx_folder_type", columnList = "folder_type"),
        // Index cho query: findByProject (Project folders)
        @jakarta.persistence.Index(name = "idx_folder_project", columnList = "project_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Folder extends TenantScopedEntity {

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

    public String getFullPath() {
        if (parentFolder != null) {
            return parentFolder.getFullPath() + "/" + name;
        }
        return name;
    }

    public boolean isRoot() {
        return parentFolder == null;
    }

    public boolean isProjectFolder() {
        return folderType == FolderType.PROJECT;
    }

    public boolean isSharedFolder() {
        return folderType == FolderType.SHARED;
    }

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
