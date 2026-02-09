package DoAn.BE.workspace.dto;

import DoAn.BE.company.entity.Plan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho workspace responses
 */
public class WorkspaceDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkspaceResponse {
        private Long id;
        private String name;
        private WorkspaceType type;
        private Plan plan;
        private java.util.List<String> roles; // Changed: Array of all roles, not just first one
        private Boolean isActive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonalWorkspaceResponse {
        private Long workspaceId;
        private String name;
        private Plan plan; // User's personal plan
        private java.time.LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SwitchWorkspaceRequest {
        private WorkspaceType type;
        private Long companyId; // Only required when type = COMPANY
    }

    public enum WorkspaceType {
        PERSONAL,
        COMPANY
    }
}
