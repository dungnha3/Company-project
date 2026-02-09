package DoAn.BE.project.dto;

import DoAn.BE.project.entity.IssueDependency.DependencyType;
import DoAn.BE.project.entity.Issue.Priority;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs for Gantt Chart API
 */
public class GanttDto {

    // ==================== GANTT ITEM ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Gantt chart item (phase or issue)")
    public static class GanttItem {
        private Long id;
        private String type; // "phase" or "issue"
        private String key; // Issue key or phase name
        private String title;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer progress; // 0-100
        private Priority priority;
        private String status;
        private String statusColor;
        private Long assigneeId;
        private String assigneeName;
        private Long parentId; // Phase ID for issues
        private List<Long> dependencies; // IDs of predecessor items
        private Boolean isExpanded;
        private String color; // For phases
    }

    // ==================== GANTT RESPONSE ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Complete Gantt chart data for a project")
    public static class GanttResponse {
        private Long projectId;
        private String projectName;
        private LocalDate projectStartDate;
        private LocalDate projectEndDate;
        private List<GanttItem> items;
        private List<DependencyLink> dependencies;
        private GanttStats stats;
    }

    // ==================== DEPENDENCY LINK ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Dependency link between Gantt items")
    public static class DependencyLink {
        private Long dependencyId;
        private Long predecessorId;
        private Long successorId;
        private DependencyType type;
        private Integer lagDays;
    }

    // ==================== STATS ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GanttStats {
        private Integer totalItems;
        private Integer totalPhases;
        private Integer totalIssues;
        private Integer completedItems;
        private Integer overdueitems;
        private Double overallProgress;
    }

    // ==================== REQUESTS ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request to update item dates")
    public static class DateUpdateRequest {
        @NotNull(message = "Start date is required")
        private LocalDate startDate;

        @NotNull(message = "End date is required")
        private LocalDate endDate;

        private Boolean moveSuccessors; // Auto-shift dependent items
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Request to create dependency")
    public static class CreateDependencyRequest {
        @NotNull(message = "Predecessor issue ID is required")
        private Long predecessorId;

        @NotNull(message = "Successor issue ID is required")
        private Long successorId;

        @Builder.Default
        private DependencyType dependencyType = DependencyType.FINISH_TO_START;

        @Builder.Default
        private Integer lagDays = 0;
    }

    // ==================== DEPENDENCY RESPONSE ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Dependency details")
    public static class DependencyResponse {
        private Long dependencyId;
        private Long predecessorId;
        private String predecessorKey;
        private String predecessorTitle;
        private Long successorId;
        private String successorKey;
        private String successorTitle;
        private DependencyType dependencyType;
        private Integer lagDays;
        private LocalDateTime createdAt;
    }
}
