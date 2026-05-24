package DoAn.BE.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for Performance Dashboard aggregation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceDashboardDTO {

    // ── Company-wide stats ──────────────────────────────────────────────────
    private int totalEmployees;
    private BigDecimal averagePerformance;
    private BigDecimal averageSpeed;
    private BigDecimal averageQuality;
    private BigDecimal averageVolume;
    private long totalCompletedTasks;
    private long totalOverdueTasks;
    private long totalReworks;

    // ── Top / At-risk employees ─────────────────────────────────────────────
    private List<EmployeeSummary> topPerformers;
    private List<EmployeeSummary> atRiskEmployees;

    // ── Performance by project ─────────────────────────────────────────────
    private List<ProjectPerformance> performanceByProject;

    // ── Trend data ──────────────────────────────────────────────────────────
    private List<TrendPoint> performanceTrend;

    // ── Employee individual summary ─────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeSummary {
        private Long employeeId;
        private Long userId;
        private String employeeName;
        private String employeeAvatar;
        private BigDecimal overallScore;
        private BigDecimal speedScore;
        private BigDecimal qualityScore;
        private BigDecimal volumeScore;
        private Integer completedTasks;
        private Integer overdueTasks;
        private Integer reworks;
        private List<String> projectNames;
    }

    // ── My stats (personal) ──────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MyStats {
        private BigDecimal totalPerformanceScore;
        private BigDecimal performance;
        private BigDecimal speedScore;
        private BigDecimal qualityScore;
        private BigDecimal volumeScore;
        private Integer completedTasks;
        private Integer overdueTasks;
        private Integer lateTasks;
        private Integer reworks;
        private BigDecimal totalHoursLogged;
        private Integer storyPointsCompleted;
    }

    // ── Project performance ──────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectPerformance {
        private Long projectId;
        private String projectName;
        private BigDecimal averagePerformance;
        private int employeeCount;
    }

    // ── Trend point ─────────────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private String week; // "2026-W18"
        private BigDecimal avgPerformance;
        private BigDecimal avgSpeed;
        private BigDecimal avgQuality;
        private BigDecimal avgVolume;
    }
}
