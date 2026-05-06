package DoAn.BE.hrm.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import DoAn.BE.hrm.entity.LeaveRequest.LeaveType;
import DoAn.BE.hrm.entity.LeaveRequest.LeaveStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequestDTO {
    private Long leaveRequestId;
    private Long employeeId;
    private String employeeName;
    private String avatarUrl;
    private LeaveType leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer totalDays;
    private String reason;
    private LeaveStatus status;

    // Approval info
    private Long approverId;
    private String approverName;
    private LocalDateTime approvedAt;
    private String approvalNote;

    // Project link (optional)
    private Long projectId;
    private String projectName;

    private LocalDateTime createdAt;
}
