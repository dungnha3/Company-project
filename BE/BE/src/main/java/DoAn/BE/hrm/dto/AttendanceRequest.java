package DoAn.BE.hrm.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import DoAn.BE.hrm.entity.Attendance.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRequest {

    @NotNull(message = "Employee ID cannot be null")
    private Long employeeId;

    @NotNull(message = "Attendance date cannot be null")
    private LocalDate attendanceDate;

    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private AttendanceStatus status;
    private String note;
}
