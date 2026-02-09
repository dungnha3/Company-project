package DoAn.BE.auth.dto;

import DoAn.BE.auth.entity.SsoProvider.ProviderType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTOs for SSO Provider management
 */
public class SsoDto {

    // ==================== REQUEST DTOs ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request to create SSO provider")
    public static class CreateProviderRequest {
        @NotBlank(message = "Name is required")
        private String name;

        @NotNull(message = "Provider type is required")
        private ProviderType providerType;

        @NotBlank(message = "Entity ID is required")
        private String entityId;

        @NotBlank(message = "SSO URL is required")
        private String ssoUrl;

        private String sloUrl;

        private String certificate;

        private String metadataUrl;

        private Map<String, String> attributeMappings;

        @Builder.Default
        private Boolean allowPasswordLogin = true;

        @Builder.Default
        private Boolean autoProvisionUsers = true;

        private String defaultRole;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request to update SSO provider")
    public static class UpdateProviderRequest {
        private String name;
        private String ssoUrl;
        private String sloUrl;
        private String certificate;
        private Map<String, String> attributeMappings;
        private Boolean isActive;
        private Boolean isDefault;
        private Boolean allowPasswordLogin;
        private Boolean autoProvisionUsers;
        private String defaultRole;
    }

    // ==================== RESPONSE DTOs ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "SSO provider details")
    public static class ProviderResponse {
        private Long providerId;
        private String name;
        private ProviderType providerType;
        private String entityId;
        private String ssoUrl;
        private Boolean isActive;
        private Boolean isDefault;
        private Boolean allowPasswordLogin;
        private Boolean autoProvisionUsers;
        private String defaultRole;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "SSO login initiation response")
    public static class LoginInitResponse {
        private String loginUrl;
        private String requestId;
        private String providerName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "SSO callback result")
    public static class SsoAuthResult {
        private boolean success;
        private String accessToken;
        private String refreshToken;
        private String errorMessage;
        private boolean userCreated; // True if new user was auto-provisioned
    }

    // ==================== SAML SPECIFIC ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SamlUserInfo {
        private String email;
        private String firstName;
        private String lastName;
        private String displayName;
        private String nameId;
        private Map<String, String> attributes;
    }
}
