package DoAn.BE.project.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

// Entity quản lý comment/thảo luận trên Issue
@Entity
@Table(name = "issue_comments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueComment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_id")
    private Long commentId;

    @ManyToOne
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @ManyToOne
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(columnDefinition = "NVARCHAR(MAX)", nullable = false)
    private String content;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_edited", nullable = false)
    private Boolean isEdited = false;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        this.isEdited = true;
    }

    // Constructor
    public IssueComment(Issue issue, User author, String content) {
        this.issue = issue;
        this.author = author;
        this.content = content;
    }

    // Helper methods
    public boolean canBeEditedBy(User user) {
        return this.author.getUserId().equals(user.getUserId());
    }

    public boolean canBeDeletedBy(User user, boolean isProjectManager) {
        // Author có thể xóa comment của mình
        // Project Manager có thể xóa bất kỳ comment nào trong dự án
        return this.author.getUserId().equals(user.getUserId()) || isProjectManager;
    }
}
