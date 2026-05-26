package DoAn.BE.storage.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import DoAn.BE.company.entity.Company;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import DoAn.BE.user.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileEntity extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    private Long id;

    @Column(nullable = false)
    private String fileName;

    @Column(name = "google_drive_file_id", nullable = false)
    private String googleDriveFileId;

    private Long fileSize;

    private String contentType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @JsonIgnore
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id")
    @JsonIgnore
    private Issue issue;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    @JsonIgnore
    private Company company;

    @Column(name = "folder", length = 255)
    private String folder;
}
