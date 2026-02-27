package DoAn.BE.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// PersonalWorkspace - Không gian làm việc cá nhân của User
// Mỗi User có đúng 1 PersonalWorkspace (1:1 relationship)
// Tự động tạo khi User đăng ký
// /
@Entity
@Table(name = "personal_workspaces")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = { "user" })
public class PersonalWorkspace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "workspace_id")
    private Long workspaceId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "name", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    @Builder.Default
    private String name = "My Workspace";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public static PersonalWorkspace createFor(User user) {
        return PersonalWorkspace.builder()
                .user(user)
                .name(user.getUsername() + "'s Workspace")
                .createdAt(LocalDateTime.now())
                .build();
    }
}
