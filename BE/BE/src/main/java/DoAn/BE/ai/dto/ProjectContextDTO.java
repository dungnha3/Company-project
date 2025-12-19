package DoAn.BE.ai.dto;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO chứa context của project để cung cấp cho AI
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectContextDTO {
    
    // Thông tin cơ bản của project
    private Long projectId;
    private String projectKey;
    private String projectName;
    private String description;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private String createdByName;
    private String departmentName;
    
    // Thống kê project
    private ProjectStats stats;
    
    // Sprint hiện tại
    private SprintInfo currentSprint;
    
    // Danh sách members
    private List<MemberInfo> members;
    
    // Issues gần đây
    private List<IssueInfo> recentIssues;
    
    // Issues quá hạn
    private List<IssueInfo> overdueIssues;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProjectStats {
        private int totalIssues;
        private int completedIssues;
        private int inProgressIssues;
        private int todoIssues;
        private int overdueIssues;
        private double completionPercentage;
        private int totalMembers;
        private int totalSprints;
        private int activeSprints;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SprintInfo {
        private Long sprintId;
        private String name;
        private String goal;
        private LocalDate startDate;
        private LocalDate endDate;
        private String status;
        private int totalIssues;
        private int completedIssues;
        private int daysRemaining;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberInfo {
        private Long userId;
        private String username;
        private String role;
        private int assignedIssues;
        private int completedIssues;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class IssueInfo {
        private Long issueId;
        private String issueKey;
        private String title;
        private String status;
        private String priority;
        private String assigneeName;
        private LocalDate dueDate;
        private boolean overdue;
    }
}
