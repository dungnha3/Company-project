package DoAn.BE.integration.dto;

import DoAn.BE.integration.entity.Integration.IntegrationType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTOs for Integration management
 */
public class IntegrationDto {

    // ==================== REQUEST DTOs ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request to connect an integration")
    public static class ConnectRequest {
        @NotNull(message = "Integration type is required")
        private IntegrationType integrationType;

        private String name;

        private Map<String, String> config; // e.g., {"webhookUrl": "...", "token": "..."}
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request to update integration config")
    public static class UpdateRequest {
        private String name;
        private Map<String, String> config;
        private Boolean isActive;
    }

    // ==================== RESPONSE DTOs ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Integration details")
    public static class IntegrationResponse {
        private Long integrationId;
        private IntegrationType integrationType;
        private String name;
        private String displayName;
        private String icon;
        private Boolean isActive;
        private LocalDateTime connectedAt;
        private LocalDateTime lastSyncAt;
        private String lastError;
        private String connectedByName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Available integration in marketplace")
    public static class AvailableIntegration {
        private IntegrationType type;
        private String name;
        private String description;
        private String icon;
        private String category;
        private List<String> features;
        private Boolean isConnected;
        private Boolean isPremium;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Integration sync status")
    public static class SyncStatus {
        private Long integrationId;
        private IntegrationType type;
        private Boolean isRunning;
        private LocalDateTime lastRunAt;
        private Integer itemsSynced;
        private String error;
    }
}
