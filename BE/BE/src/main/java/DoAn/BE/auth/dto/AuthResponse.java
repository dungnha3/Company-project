package DoAn.BE.auth.dto;

import java.util.List;

import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.Plan;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO cho response sau khi đăng nhập thành công
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private Long expiresIn; // Thời gian sống của token (seconds)
    private UserInfo user;
    private PersonalWorkspaceInfo personalWorkspace; // [NEW] Personal workspace info
    private List<CompanyDTO> companies; // Danh sách công ty user thuộc về
    private Long selectedCompanyId; // Company đã chọn (nếu có)

    // Thông tin user cơ bản
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long userId;
        private String username;
        private String email;
        private Boolean isActive;
        private Boolean isSystemAdmin; // [SAAS] Flag để Frontend phân biệt System Admin
        private Plan personalPlan; // [NEW] User's personal subscription plan
    }

    // [NEW] Thông tin Personal Workspace
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonalWorkspaceInfo {
        private Long workspaceId;
        private String name;
        private Plan plan;
    }

    // Thông tin công ty
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyDTO {
        private Long companyId;
        private String name;
        private String slug;
        private CompanyRole role; // Vai trò của user trong công ty này
        private DoAn.BE.company.entity.UserPermissions permissions; // [NEW] Granular permissions
        private String logoUrl;
    }
}
