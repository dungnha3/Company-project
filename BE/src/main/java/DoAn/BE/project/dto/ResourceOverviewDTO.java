package DoAn.BE.project.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Resource Planning Overview — Module 5
 * Mỗi entry = 1 user đang làm việc trong ≥ 1 project.
 * Gộp allocationRate từ tất cả project để detect overload (>100%).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResourceOverviewDTO {

    private Long userId;
    private String fullName;
    private String email;
    private String avatarUrl;

    // Profile details from Employee entity
    private String gender;
    private java.time.LocalDate hireDate;
    private String address;
    private Integer leaveBalance;

    // Tổng allocation (% toàn bộ dự án đang tham gia)
    private Integer totalAllocation;

    // Có quá tải không? (totalAllocation > 100)
    private Boolean overloaded;

    // Danh sách dự án đang tham gia
    private List<ProjectSlot> projects;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectSlot {
        private Long projectId;
        private String projectName;
        private String role;         // OWNER / MANAGER / MEMBER
        private String position;     // vị trí trong dự án
        private Integer allocationRate; // % phân bổ trong dự án này
        private String memberStatus;    // ACTIVE / ON_LEAVE / PART_TIME
        private Double totalLoggedHours;

        // Project member specific fields
        private Integer yearsOfExperience;
        private java.math.BigDecimal billingRate;
        private String skillNotes;
        private java.time.LocalDate joinDate;
        private java.time.LocalDate leaveDate;
        
        // Task statistics
        private Long totalIssues;
        private Long completedIssues;
    }
}
