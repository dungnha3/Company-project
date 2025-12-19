package DoAn.BE.auth.dto;

import DoAn.BE.user.entity.User;
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
    private Long expiresIn; // Thời gian sống của token (ms)
    private UserInfo user;
    
    // Thông tin user trả về sau khi đăng nhập
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long userId;
        private String username;
        private String email;
        private User.Role role;
        private Boolean isActive;
    }
}