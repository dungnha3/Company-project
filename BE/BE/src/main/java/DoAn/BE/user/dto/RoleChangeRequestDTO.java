package DoAn.BE.user.dto;

import DoAn.BE.company.entity.CompanyRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleChangeRequestDTO {
    private Long requestId;
    private Long userId;
    private String userFullName;
    private CompanyRole currentRole;
    private CompanyRole requestedRole;
    private String reason;
    private LocalDateTime createdAt;
}
