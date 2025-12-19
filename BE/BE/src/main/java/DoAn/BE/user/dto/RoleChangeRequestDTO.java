package DoAn.BE.user.dto;

import DoAn.BE.user.entity.RoleChangeRequest.RequestStatus;
import DoAn.BE.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleChangeRequestDTO {
    
    @NotNull(message = "User ID không được để trống")
    private Long targetUserId;
    
    private String targetUsername;
    
    @NotNull(message = "Role mới không được để trống")
    private User.Role requestedRole;
    
    private User.Role currentRole;
    
    @NotNull(message = "Lý do không được để trống")
    private String reason;
    
    private RequestStatus status;
    
    private Long requestedById;
    private String requestedByUsername;
    
    private Long reviewedById;
    private String reviewedByUsername;
    
    private String reviewNote;
    
    private LocalDateTime createdAt;
    private LocalDateTime reviewedAt;
}
