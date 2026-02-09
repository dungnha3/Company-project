package DoAn.BE.sysadmin.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class SysAdminUserDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserResponse {
        private Long userId;
        private String username;
        private String email;
        private Boolean isActive;
        private Boolean isSystemAdminAccount;
        private String companyName;
        private List<String> roles;
        private LocalDateTime lastLoginAt;
        private LocalDateTime createdAt;
    }
}
