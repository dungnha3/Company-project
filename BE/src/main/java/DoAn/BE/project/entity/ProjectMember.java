package DoAn.BE.project.entity;

import jakarta.persistence.*;
import lombok.*;
import DoAn.BE.user.entity.User;
@Entity
@Table(name = "project_members", uniqueConstraints = @UniqueConstraint(columnNames = { "project_id",
        "user_id" }), indexes = {
                // Index cho query: findByProject_ProjectId (Project members list)
                @jakarta.persistence.Index(name = "idx_pm_project", columnList = "project_id"),
                // Index cho query: findByUser_UserId (User's projects)
                @jakarta.persistence.Index(name = "idx_pm_user", columnList = "user_id")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class ProjectMember extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProjectRole role = ProjectRole.MEMBER;

    // Constructor
    public ProjectMember(Project project, User user, ProjectRole role) {
        this.project = project;
        this.user = user;
        this.role = role;
    }

    public boolean isOwner() {
        return this.role == ProjectRole.OWNER;
    }

    public boolean isManager() {
        return this.role == ProjectRole.MANAGER;
    }

    public boolean canManageProject() {
        return this.role == ProjectRole.OWNER || this.role == ProjectRole.MANAGER;
    }

    // Enum
    public enum ProjectRole {
        OWNER, // Chủ project - full permissions
        MANAGER, // Quản lý - manage issues, sprints
        MEMBER // Thành viên - view, create issues
    }
}
