package DoAn.BE.hrm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import DoAn.BE.hrm.entity.Attendance.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDTO {
    private Long attendanceId;
    private Long employeeId;
    private String employeeName;
    private LocalDate attendanceDate;
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private BigDecimal workingHours;
    private AttendanceStatus status;
    private String note;
    private LocalDateTime createdAt;

    // New fields for UI display
    private String department;
    private String avatarUrl;

    // Computed fields
    private Boolean isLate;
    private Boolean isEarlyLeave;
}
