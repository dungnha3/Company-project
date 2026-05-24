package DoAn.BE.hrm.dto;

import java.time.LocalDate;

import DoAn.BE.hrm.entity.LeaveRequest.LeaveType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequestRequest {

    // employeeId nullable — if null, auto-resolve from currentUser
    private Long employeeId;

    @NotNull(message = "Leave type cannot be null")
    private LeaveType leaveType;

    @NotNull(message = "Start date cannot be null")
    private LocalDate startDate;

    @NotNull(message = "End date cannot be null")
    private LocalDate endDate;

    private String reason;

    // Optional: gắn nghỉ phép với dự án
    private Long projectId;
    private String projectName;
}
