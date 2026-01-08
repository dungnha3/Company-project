package DoAn.BE.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {

    // Employee Stats
    private long totalEmployees;
    private long activeEmployees;
    private long resignedEmployees;

    // Leave Stats
    private long pendingLeaveRequests;
    private long approvedLeaveRequests;
    private long rejectedLeaveRequests;

    // Salary Stats
    private long unpaidSalaries;
    private long paidSalaries;
    private BigDecimal totalMonthlySalary;

    // Contract Stats
    private long activeContracts;
    private long expiringContracts; // In 30 days
    private long expiredContracts;

    // Attendance Stats
    private long totalAttendanceThisMonth;
    private long lateEmployees;
    private long earlyLeaveEmployees;

    // Action Required Lists
    private List<ExpiringContractDTO> expiringContractsList;
    private List<PendingLeaveRequestDTO> pendingLeaveRequestsList;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpiringContractDTO {
        private Long contractId;
        private String employeeName;
        private String endDate;
        private int daysRemaining;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingLeaveRequestDTO {
        private Long leaveRequestId;
        private String employeeName;
        private String leaveType;
        private String startDate;
        private String endDate;
        private int totalDays;
    }
}
