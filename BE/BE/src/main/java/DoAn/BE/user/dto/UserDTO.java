package DoAn.BE.user.dto;

import java.time.LocalDateTime;
import java.util.List;

import DoAn.BE.company.entity.CompanyRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO cho response user (không expose password)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long userId;
    private String username;
    private String fullName; // Tên hiển thị từ nhân viên
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private CompanyRole role;
    private Boolean isActive;
    private Boolean isOnline;
    private LocalDateTime lastSeen;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;
    private Long nhanvienId; // ID nhân viên nếu user có liên kết với NhanVien

    // [SAAS] System Admin flag
    private Boolean isSystemAdmin;

    // [SAAS] Danh sách công ty và role user tham gia
    private List<CompanyMembershipInfo> companyMemberships;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyMembershipInfo {
        private Long companyId;
        private String companyName;
        private String role; // CompanyRole as string
        private Boolean isActive;
    }
}
