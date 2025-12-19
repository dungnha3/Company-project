package DoAn.BE.project.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.util.Map;

// DTO thống kê dashboard dự án (issues, sprints, members)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectStatsDTO {
    private Long projectId;
    private String projectName;
    private String projectKey;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    
    // Issue Statistics
    private int totalIssues;
    private int completedIssues;
    private int inProgressIssues;
    private int todoIssues;
    private int overdueIssues;
    private double completionRate;
    
    // Sprint Statistics
    private int totalSprints;
    private int activeSprints;
    private int completedSprints;
    
    // Team Statistics
    private int totalMembers;
    private Map<String, Integer> memberWorkload; // userId -> issue count
    
    // Priority Distribution
    private Map<String, Integer> priorityDistribution; // priority -> count
    
    // Status Distribution
    private Map<String, Integer> statusDistribution; // status -> count
    
    // Recent Activity Count
    private int recentActivityCount; // Last 7 days
    private int recentCommentCount; // Last 7 days
}
