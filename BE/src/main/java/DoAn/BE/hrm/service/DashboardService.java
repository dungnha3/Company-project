package DoAn.BE.hrm.service;

import DoAn.BE.hrm.dto.DashboardDTO;
import DoAn.BE.hrm.dto.DashboardStatsDTO;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.notification.repository.NotificationRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

// Dashboard aggregator — delegates to HRDashboardService and FinancialDashboardService.
@Service
@Transactional(readOnly = true)
@Slf4j
@RequiredArgsConstructor
public class DashboardService {

        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        private final HRDashboardService hrDashboard;
        private final FinancialDashboardService financialDashboard;
        private final NotificationRepository notificationRepository;

        // General Dashboard for Accounting/PM/HR Managers.
        // /
        public DashboardDTO getOverview(User currentUser) {
                log.info("Fetching general dashboard overview");

                DashboardDTO dashboard = new DashboardDTO();

                // 1. Employee Statistics
                dashboard.setTotalEmployees(hrDashboard.getTotalEmployees());
                dashboard.setActiveEmployees(hrDashboard.getActiveEmployees());
                dashboard.setResignedEmployees(hrDashboard.getResignedEmployees());

                // 2. Leave Request Statistics
                dashboard.setPendingLeaveRequests(hrDashboard.getPendingLeaveRequests());
                dashboard.setApprovedLeaveRequests(hrDashboard.getApprovedLeaveRequests());
                dashboard.setRejectedLeaveRequests(hrDashboard.getRejectedLeaveRequests());

                // 3. Salary Statistics
                FinancialDashboardService.SalarySnapshot salary = financialDashboard.getCurrentMonthSalary();
                dashboard.setUnpaidSalaries(salary.unpaid());
                dashboard.setPaidSalaries(salary.paid());
                dashboard.setTotalMonthlySalary(salary.totalSalary());

                // 4. Contract Statistics
                dashboard.setActiveContracts(hrDashboard.getActiveContracts());
                dashboard.setExpiredContracts(hrDashboard.getExpiredContracts());
                List<Contract> expiringContracts = hrDashboard.getExpiringContracts(30);
                dashboard.setExpiringContracts(expiringContracts.size());

                // 5. Attendance Statistics
                var attendance = hrDashboard.getMonthlyAttendance(
                                LocalDate.now().getMonthValue(), LocalDate.now().getYear());
                dashboard.setTotalAttendanceThisMonth(attendance.total());
                dashboard.setLateEmployees(attendance.late());
                dashboard.setEarlyLeaveEmployees(attendance.earlyLeave());

                // 6. List of Expiring Contracts
                LocalDate today = LocalDate.now();
                List<DashboardDTO.ExpiringContractDTO> contractList = expiringContracts.stream()
                                .map(hd -> {
                                        long daysLeft = ChronoUnit.DAYS.between(today, hd.getEndDate());
                                        return new DashboardDTO.ExpiringContractDTO(
                                                        hd.getContractId(),
                                                        hd.getEmployee().getFullName(),
                                                        hd.getEndDate().format(DATE_FORMATTER),
                                                        (int) daysLeft);
                                })
                                .collect(Collectors.toList());
                dashboard.setExpiringContractsList(contractList);

                // 7. List of Pending Leave Requests
                List<LeaveRequest> pendingRequests = hrDashboard.getPendingLeaveRequestsList();
                List<DashboardDTO.PendingLeaveRequestDTO> leaveList = pendingRequests.stream()
                                .map(lr -> new DashboardDTO.PendingLeaveRequestDTO(
                                                lr.getLeaveRequestId(),
                                                lr.getEmployee().getFullName(),
                                                lr.getLeaveType().name(),
                                                lr.getStartDate().toString(),
                                                lr.getEndDate().toString(),
                                                lr.getTotalDays()))
                                .collect(Collectors.toList());
                dashboard.setPendingLeaveRequestsList(leaveList);

                log.info("✅ Dashboard: {} employees, {} pending leave requests, {} expiring contracts",
                                dashboard.getTotalEmployees(), dashboard.getPendingLeaveRequests(),
                                dashboard.getExpiringContracts());

                return dashboard;
        }

        // Monthly Statistics for Managers.
        // /
        public DashboardDTO getMonthlyStats(int month, int year, User currentUser) {
                log.info("Fetching monthly dashboard stats for {}/{}", month, year);

                DashboardDTO dashboard = new DashboardDTO();

                // 1. Employee Statistics
                dashboard.setTotalEmployees(hrDashboard.getTotalEmployees());
                dashboard.setActiveEmployees(hrDashboard.getActiveEmployees());
                dashboard.setResignedEmployees(hrDashboard.getResignedEmployees());

                // 2. Salary Statistics for that month
                FinancialDashboardService.SalarySnapshot salary = financialDashboard.getSalaryForMonth(month, year);
                dashboard.setUnpaidSalaries(salary.unpaid());
                dashboard.setPaidSalaries(salary.paid());
                dashboard.setTotalMonthlySalary(salary.totalSalary());

                // 3. Attendance Statistics for that month
                var attendance = hrDashboard.getMonthlyAttendance(month, year);
                dashboard.setTotalAttendanceThisMonth(attendance.total());
                dashboard.setLateEmployees(attendance.late());
                dashboard.setEarlyLeaveEmployees(attendance.earlyLeave());

                return dashboard;
        }

        // Advanced Dashboard with charts and detailed stats.
        // /
        public DashboardStatsDTO getDashboardStats(User currentUser) {
                log.info("Fetching advanced dashboard statistics");

                DashboardStatsDTO stats = new DashboardStatsDTO();

                // 1. Overview
                DashboardStatsDTO.OverviewStats overview = new DashboardStatsDTO.OverviewStats();
                overview.setTotalEmployees(hrDashboard.getTotalEmployees());
                overview.setActiveEmployees(hrDashboard.getActiveEmployees());
                overview.setResignedEmployees(hrDashboard.getResignedEmployees());
                overview.setPendingLeaveRequests(hrDashboard.getPendingLeaveRequests());

                FinancialDashboardService.SalarySnapshot salarySnap = financialDashboard.getCurrentMonthSalary();
                overview.setPendingSalaries(salarySnap.unpaid());

                overview.setExpiringContracts(hrDashboard.getExpiringContracts(30).size());
                overview.setUnreadNotifications(
                                notificationRepository.countByUser_UserIdAndIsReadFalse(currentUser.getUserId()));

                FinancialDashboardService.FinancialOverview fin = financialDashboard.getFinancialOverview();
                overview.setTotalMonthlyCost(fin.totalMonthlyCost());
                overview.setTotalRevenue(fin.totalRevenue());
                overview.setTotalProfit(fin.totalProfit());

                stats.setOverview(overview);

                // 2. Charts — delegate to focused services
                stats.setAttendanceByDepartment(hrDashboard.getAttendanceByDepartment());
                stats.setSalaryByMonth(financialDashboard.getSalaryByMonth());
                stats.setLeaveStats(hrDashboard.getLeaveStatsByType());
                stats.setContractStats(hrDashboard.getContractStats());
                stats.setEmployeeByAge(hrDashboard.getEmployeeByAge());
                stats.setEmployeeByGender(hrDashboard.getEmployeeByGender());

                return stats;
        }
}
