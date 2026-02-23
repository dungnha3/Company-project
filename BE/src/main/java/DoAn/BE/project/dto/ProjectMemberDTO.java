package DoAn.BE.project.dto;

import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [DTO thông tin thành viên dự án] (Role: Data Transfer)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberDTO {
    private Long id;
    private Long userId;
    private String username;
    private String email;
    private String avatarUrl;
    private ProjectRole role;
    private LocalDateTime joinedAt;
}
