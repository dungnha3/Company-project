package DoAn.BE.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {

    // Overview Stats
    private OverviewStats overview;

    // Attendance by Department Chart
    private List<DepartmentAttendanceStats> attendanceByDepartment;

    // Salary by Month Chart
    private List<MonthlySalaryStats> salaryByMonth;

    // Leave Stats
    private List<LeaveStats> leaveStats;

    // Contract Stats
    private ContractStats contractStats;

    // Employee by Age Chart
    private List<EmployeeAgeStats> employeeByAge;

    // Employee by Gender Chart
    private Map<String, Long> employeeByGender;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OverviewStats {
        private long totalEmployees;
        private long activeEmployees;
        private long resignedEmployees;
        private long pendingLeaveRequests;
        private long pendingSalaries;
        private long expiringContracts;
        private long unreadNotifications;
        private BigDecimal totalMonthlyCost;
        private BigDecimal totalRevenue;
        private BigDecimal totalProfit;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentAttendanceStats {
        private String departmentName;
        private long totalEmployees;
        private long lateEmployees;
        private long earlyLeaveEmployees;
        private long onTimeEmployees;
        private double onTimeRate; // %
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlySalaryStats {
        private String monthYear; // MM/yyyy
        private BigDecimal totalSalary;
        private long totalEmployees;
        private BigDecimal averageSalary;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveStats {
        private String leaveType;
        private long count;
        private long pending;
        private long approved;
        private long rejected;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContractStats {
        private long totalContracts;
        private long activeContracts;
        private long expiredContracts;
        private long expiringContracts; // Next 30 days
        private Map<String, Long> contractsByType;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeAgeStats {
        private String ageGroup; // "20-25", "26-30", etc.
        private long count;
        private double percentage; // %
    }
}
