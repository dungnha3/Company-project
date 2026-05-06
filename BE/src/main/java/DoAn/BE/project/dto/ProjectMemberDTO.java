package DoAn.BE.project.dto;

import DoAn.BE.project.entity.ProjectMember.MemberStatus;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberDTO {
    private Long id;
    private Long userId;
    private String username;
    private String fullName;
    private String email;
    private String avatarUrl;
    private ProjectRole role;
    private LocalDateTime joinedAt;

    // Project-centric HR fields (Module 2)
    private String position;
    private Integer allocationRate;
    private MemberStatus memberStatus;
    private LocalDate joinDate;
    private LocalDate leaveDate;
    private Integer yearsOfExperience;
    private BigDecimal billingRate;
    private String skillNotes;

    // Computed stats (từ API)
    private Long completedIssues;
    private Long totalIssues;
    private Double totalLoggedHours;
}
