package DoAn.BE.company.dto;

import DoAn.BE.company.entity.Plan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO trả về thông tin Plan limits cho frontend
// /
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanLimitDto {

    // Current plan info
    private Plan currentPlan;
    private String planName;

    // User limits
    private int maxUsers;
    private long currentUsers;
    private int remainingUsers; // -1 = unlimited

    // Project limits
    private int maxProjects;
    private long currentProjects;
    private int remainingProjects; // -1 = unlimited

    // Storage limits
    private long maxStorageBytes;
    private long usedStorageBytes;
    private long remainingStorageBytes; // -1 = unlimited
    private String maxStorageDisplay; // "10 GB"

    // Feature flags
    private boolean hrEnabled;
    private boolean apiEnabled;

    private boolean canAddMember;
    private boolean canCreateProject;
}
