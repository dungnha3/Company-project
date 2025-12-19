package DoAn.BE.project.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;
import DoAn.BE.user.entity.User;

// Entity quản lý thành viên dự án (roles: OWNER, MANAGER, DEVELOPER, QA, VIEWER)
@Entity
@Table(
    name = "project_members",
    uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "user_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMember {
    
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

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        this.joinedAt = LocalDateTime.now();
    }

    // Constructor
    public ProjectMember(Project project, User user, ProjectRole role) {
        this.project = project;
        this.user = user;
        this.role = role;
    }

    // Helper methods
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
        OWNER,    // Chủ project - full permissions
        MANAGER,  // Quản lý - manage issues, sprints
        MEMBER    // Thành viên - view, create issues
    }
}

