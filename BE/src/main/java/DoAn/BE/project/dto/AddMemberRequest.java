package DoAn.BE.project.dto;

import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Request DTO thêm thành viên vào dự án
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddMemberRequest {
    @NotNull(message = "User ID không được để trống")
    private Long userId;
    
    @NotNull(message = "Role không được để trống")
    private ProjectRole role;
}
