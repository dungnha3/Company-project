package DoAn.BE.project.dto;

import java.time.LocalDate;
import DoAn.BE.project.entity.ProjectPhase;
import lombok.*;

public class ProjectPhaseDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        private Long projectId;
        private String name;
        private String description;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer orderIndex;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateRequest {
        private String name;
        private String description;
        private LocalDate startDate;
        private LocalDate endDate;
        private ProjectPhase.PhaseStatus status;
        private Integer orderIndex;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long phaseId;
        private Long projectId;
        private String name;
        private String description;
        private LocalDate startDate;
        private LocalDate endDate;
        private ProjectPhase.PhaseStatus status;
        private Integer orderIndex;
        private Long createdByUserId;
        private Long issueCount;

        public static Response fromEntity(ProjectPhase phase) {
            return Response.builder()
                    .phaseId(phase.getPhaseId())
                    .projectId(phase.getProject() != null ? phase.getProject().getProjectId() : null)
                    .name(phase.getName())
                    .description(phase.getDescription())
                    .startDate(phase.getStartDate())
                    .endDate(phase.getEndDate())
                    .status(phase.getStatus())
                    .orderIndex(phase.getOrderIndex())
                    .createdByUserId(phase.getCreatedBy() != null ? phase.getCreatedBy().getUserId() : null)
                    .build();
        }
    }
}
