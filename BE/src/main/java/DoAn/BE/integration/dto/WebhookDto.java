package DoAn.BE.integration.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

/**
 * DTOs for Webhook CRUD operations (frontend-facing)
 */
public class WebhookDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Webhook creation/update request")
    public static class WebhookRequest {
        @NotBlank(message = "URL is required")
        private String url;

        private String secret;
        private List<String> events;

        @Builder.Default
        private Boolean isActive = true;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Webhook response")
    public static class WebhookResponse {
        private Long id;
        private String url;
        private String secret;
        private List<String> events;
        private Boolean isActive;
    }
}
