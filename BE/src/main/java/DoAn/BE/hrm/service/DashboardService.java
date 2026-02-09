package DoAn.BE.hrm.service;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.user.entity.User;
import DoAn.BE.hrm.dto.DashboardDTO;
import DoAn.BE.hrm.dto.DashboardStatsDTO;
import DoAn.BE.hrm.entity.Salary;
import DoAn.BE.hrm.entity.Attendance;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.repository.SalaryRepository;
import DoAn.BE.hrm.repository.AttendanceRepository;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.DepartmentRepository;
import DoAn.BE.notification.repository.NotificationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

// [Service providing dashboard statistics] (Role: HR/Admin)
@Service
@Transactional(readOnly = true)
@Slf4j
public class DashboardService {
        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        private final EmployeeRepository employeeRepository;
        private final LeaveRequestRepository leaveRequestRepository;
        private final SalaryRepository salaryRepository;
        private final ContractRepository contractRepository;
        private final AttendanceRepository attendanceRepository;
        private final DepartmentRepository departmentRepository;
        private final NotificationRepository notificationRepository;
        private final DoAn.BE.project.repository.ProjectRepository projectRepository;
        private final AccessControlService accessControlService;

        public DashboardService(EmployeeRepository employeeRepository,
                        LeaveRequestRepository leaveRequestRepository,
                        SalaryRepository salaryRepository,
                        ContractRepository contractRepository,
                        AttendanceRepository attendanceRepository,
                        DepartmentRepository departmentRepository,
                        NotificationRepository notificationRepository,
                        DoAn.BE.project.repository.ProjectRepository projectRepository,
                        AccessControlService accessControlService) {
                this.employeeRepository = employeeRepository;
                this.leaveRequestRepository = leaveRequestRepository;
                this.salaryRepository = salaryRepository;
                this.contractRepository = contractRepository;
                this.attendanceRepository = attendanceRepository;
                this.departmentRepository = departmentRepository;
                this.notificationRepository = notificationRepository;
                this.projectRepository = projectRepository;
                this.accessControlService = accessControlService;
        }

        // [General Dashboard - Accounting/PM/HR] (Role: Managers)
        public DashboardDTO getOverview(User currentUser) {
                // Access control check handled by AccessControlService
                log.info("Fetching general dashboard overview");

                DashboardDTO dashboard = new DashboardDTO();

                // 1. Employee Statistics
                dashboard.setTotalEmployees(employeeRepository.count());
                dashboard.setActiveEmployees(employeeRepository.countByStatus(EmployeeStatus.ACTIVE));
                dashboard.setResignedEmployees(employeeRepository.countByStatus(EmployeeStatus.RESIGNED));

                // 2. Leave Request Statistics
                dashboard.setPendingLeaveRequests(
                                leaveRequestRepository.countByStatus(LeaveRequest.LeaveStatus.PENDING));
                dashboard.setApprovedLeaveRequests(
                                leaveRequestRepository.countByStatus(LeaveRequest.LeaveStatus.APPROVED));
                dashboard.setRejectedLeaveRequests(
                                leaveRequestRepository.countByStatus(LeaveRequest.LeaveStatus.REJECTED));

                // 3. Salary Statistics for Current Month
                YearMonth currentMonth = YearMonth.now();
                List<Salary> currentMonthSalaries = salaryRepository.findByMonthAndYear(
                                currentMonth.getMonthValue(), currentMonth.getYear());

                long unpaid = currentMonthSalaries.stream()
                                .filter(sl -> Salary.PaymentStatus.UNPAID.equals(sl.getPaymentStatus()))
                                .count();
                long paid = currentMonthSalaries.stream()
                                .filter(sl -> Salary.PaymentStatus.PAID.equals(sl.getPaymentStatus()))
                                .count();

                // ONLY Accounting sees the salary amount
                BigDecimal totalSalary = BigDecimal.ZERO;
                if (accessControlService.isAccountingManager()) {
                        totalSalary = currentMonthSalaries.stream()
                                        .map(Salary::getNetSalary)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                }

                dashboard.setUnpaidSalaries(unpaid);
                dashboard.setPaidSalaries(paid);
                dashboard.setTotalMonthlySalary(totalSalary);

                // 4. Contract Statistics
                dashboard.setActiveContracts(contractRepository.countByStatus(ContractStatus.ACTIVE));
                dashboard.setExpiredContracts(contractRepository.countByStatus(ContractStatus.EXPIRED));

                // Contracts expiring in 30 days
                LocalDate today = LocalDate.now();
                LocalDate after30Days = today.plusDays(30);
                List<Contract> expiringContracts = contractRepository.findExpiringContracts(today, after30Days);
                dashboard.setExpiringContracts(expiringContracts.size());

                // 5. Attendance Statistics for Current Month
                LocalDate startOfMonth = currentMonth.atDay(1);
                LocalDate endOfMonth = currentMonth.atEndOfMonth();
                List<Attendance> attendances = attendanceRepository.findByAttendanceDateBetween(startOfMonth,
                                endOfMonth);
                dashboard.setTotalAttendanceThisMonth(attendances.size());

                dashboard.setLateEmployees(attendances.stream()
                                .filter(a -> Attendance.AttendanceStatus.LATE.equals(a.getStatus()))
                                .count());
                dashboard.setEarlyLeaveEmployees(attendances.stream()
                                .filter(a -> Attendance.AttendanceStatus.EARLY_LEAVE.equals(a.getStatus()))
                                .count());

                // 6. List of Expiring Contracts
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
                List<LeaveRequest> pendingRequests = leaveRequestRepository
                                .findByStatus(LeaveRequest.LeaveStatus.PENDING);
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

        // [Monthly Statistics] (Role: Manager)
        public DashboardDTO getMonthlyStats(int month, int year, User currentUser) {
                // Access control check handled by AccessControlService
                log.info("Fetching monthly dashboard stats for {}/{}", month, year);

                DashboardDTO dashboard = new DashboardDTO();

                // 1. Employee Statistics (Simplification: using current counts)
                dashboard.setTotalEmployees(employeeRepository.count());
                dashboard.setActiveEmployees(employeeRepository.countByStatus(EmployeeStatus.ACTIVE));
                dashboard.setResignedEmployees(employeeRepository.countByStatus(EmployeeStatus.RESIGNED));

                // 2. Salary Statistics for THAT Month
                List<Salary> salaries = salaryRepository.findByMonthAndYear(month, year);

                long unpaid = salaries.stream().filter(sl -> Salary.PaymentStatus.UNPAID.equals(sl.getPaymentStatus()))
                                .count();
                long paid = salaries.stream().filter(sl -> Salary.PaymentStatus.PAID.equals(sl.getPaymentStatus()))
                                .count();

                BigDecimal totalSalary = BigDecimal.ZERO;
                if (accessControlService.isAccountingManager()) {
                        totalSalary = salaries.stream()
                                        .map(Salary::getNetSalary)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                }

                dashboard.setUnpaidSalaries(unpaid);
                dashboard.setPaidSalaries(paid);
                dashboard.setTotalMonthlySalary(totalSalary);

                // 3. Attendance Statistics for THAT Month
                LocalDate startOfMonth = LocalDate.of(year, month, 1);
                LocalDate endOfMonth = startOfMonth.withDayOfMonth(startOfMonth.lengthOfMonth());

                List<Attendance> attendances = attendanceRepository.findByAttendanceDateBetween(startOfMonth,
                                endOfMonth);
                dashboard.setTotalAttendanceThisMonth(attendances.size());
                dashboard.setLateEmployees(attendances.stream()
                                .filter(a -> Attendance.AttendanceStatus.LATE.equals(a.getStatus())).count());
                dashboard.setEarlyLeaveEmployees(attendances.stream()
                                .filter(a -> Attendance.AttendanceStatus.EARLY_LEAVE.equals(a.getStatus())).count());

                return dashboard;
        }

// ⭐⭐⭐ ADVANCED DASHBOARD - Charts and Detailed Stats
        public DashboardStatsDTO getDashboardStats(User currentUser) {
                if (!accessControlService.isAnyManager()) {
                        throw new DoAn.BE.common.exception.ForbiddenException(
                                        "🚫 Only managers can view dashboard stats");
                }
                log.info("Fetching advanced dashboard statistics");

                DashboardStatsDTO stats = new DashboardStatsDTO();

                // 1. Overview
                stats.setOverview(getOverviewStats(currentUser));

                // 2. Attendance by Department
                stats.setAttendanceByDepartment(getAttendanceByDepartmentStats());

                // 3. Salary by Month (Last 6 Months) - ONLY Accounting
                stats.setSalaryByMonth(getSalaryByMonthStats(currentUser));

                // 4. Leave Stats
                stats.setLeaveStats(getLeaveStats());

                // 5. Contract Stats
                stats.setContractStats(getContractStats());

                // 6. Employee by Age
                stats.setEmployeeByAge(getEmployeeByAgeStats());

                // 7. Employee by Gender
                stats.setEmployeeByGender(getEmployeeByGenderStats());

                return stats;
        }

        private DashboardStatsDTO.OverviewStats getOverviewStats(User currentUser) {
                DashboardStatsDTO.OverviewStats overview = new DashboardStatsDTO.OverviewStats();

                // Employee Stats
                overview.setTotalEmployees(employeeRepository.count());
                overview.setActiveEmployees(employeeRepository.countByStatus(EmployeeStatus.ACTIVE));
                overview.setResignedEmployees(employeeRepository.countByStatus(EmployeeStatus.RESIGNED));

                // Leave Stats
                overview.setPendingLeaveRequests(
                                leaveRequestRepository.countByStatus(LeaveRequest.LeaveStatus.PENDING));

                // Salary Stats
                YearMonth currentMonth = YearMonth.now();
                List<Salary> currentMonthSalaries = salaryRepository.findByMonthAndYear(
                                currentMonth.getMonthValue(), currentMonth.getYear());
                overview.setPendingSalaries(currentMonthSalaries.stream()
                                .filter(sl -> Salary.PaymentStatus.UNPAID.equals(sl.getPaymentStatus()))
                                .count());

                // Contract Stats (Expiring in 30 days)
                LocalDate today = LocalDate.now();
                LocalDate after30Days = today.plusDays(30);
                overview.setExpiringContracts(
                                contractRepository.findExpiringContracts(today, after30Days).size());

                // Unread Notifications
                overview.setUnreadNotifications(
                                notificationRepository.countByUser_UserIdAndIsReadFalse(currentUser.getUserId()));

                // Financials (Only Accounting)
                BigDecimal totalSalaryCost = BigDecimal.ZERO;
                BigDecimal totalRevenue = BigDecimal.ZERO;

                if (accessControlService.isAccountingManager()) {
                        totalSalaryCost = currentMonthSalaries.stream()
                                        .map(Salary::getNetSalary)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                        List<DoAn.BE.project.entity.Project> projects = projectRepository
                                        .findByStatus(DoAn.BE.project.entity.Project.ProjectStatus.ACTIVE);
                        totalRevenue = projects.stream()
                                        .map(p -> p.getBudget() != null ? p.getBudget() : BigDecimal.ZERO)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                }

                overview.setTotalMonthlyCost(totalSalaryCost);
                overview.setTotalRevenue(totalRevenue);
                overview.setTotalProfit(totalRevenue.subtract(totalSalaryCost));

                return overview;
        }

        private List<DashboardStatsDTO.DepartmentAttendanceStats> getAttendanceByDepartmentStats() {
                List<Department> departments = departmentRepository.findAll();
                LocalDate startOfMonth = YearMonth.now().atDay(1);
                LocalDate endOfMonth = YearMonth.now().atEndOfMonth();

                return departments.stream().map(dept -> {
                        List<Employee> employees = employeeRepository.findByDepartment(dept);
                        long totalEmployees = employees.size();

                        if (totalEmployees == 0) {
                                return new DashboardStatsDTO.DepartmentAttendanceStats(
                                                dept.getName(), 0, 0, 0, 0, 0.0);
                        }

                        List<Attendance> attendances = attendanceRepository.findByEmployeeInAndAttendanceDateBetween(
                                        employees, startOfMonth, endOfMonth);

                        long late = attendances.stream()
                                        .filter(cc -> Attendance.AttendanceStatus.LATE.equals(cc.getStatus()))
                                        .count();
                        long earlyLeave = attendances.stream()
                                        .filter(cc -> Attendance.AttendanceStatus.EARLY_LEAVE.equals(cc.getStatus()))
                                        .count();
                        long onTime = attendances.stream()
                                        .filter(cc -> Attendance.AttendanceStatus.FULL_DAY.equals(cc.getStatus()))
                                        .count();

                        double onTimeRate = attendances.size() > 0 ? (double) onTime / attendances.size() * 100 : 0.0;

                        return new DashboardStatsDTO.DepartmentAttendanceStats(
                                        dept.getName(), totalEmployees, late, earlyLeave, onTime,
                                        Math.round(onTimeRate * 100.0) / 100.0);
                }).collect(Collectors.toList());
        }

        private List<DashboardStatsDTO.MonthlySalaryStats> getSalaryByMonthStats(User currentUser) {
                List<DashboardStatsDTO.MonthlySalaryStats> stats = new ArrayList<>();

                for (int i = 5; i >= 0; i--) {
                        YearMonth month = YearMonth.now().minusMonths(i);
                        List<Salary> salaries = salaryRepository.findByMonthAndYear(
                                        month.getMonthValue(), month.getYear());

                        BigDecimal totalSalary = BigDecimal.ZERO;
                        BigDecimal averageSalary = BigDecimal.ZERO;

                        if (accessControlService.isAccountingManager()) {
                                totalSalary = salaries.stream()
                                                .map(Salary::getNetSalary)
                                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                                averageSalary = salaries.size() > 0
                                                ? totalSalary.divide(BigDecimal.valueOf(salaries.size()), 2,
                                                                RoundingMode.HALF_UP)
                                                : BigDecimal.ZERO;
                        }

                        stats.add(new DashboardStatsDTO.MonthlySalaryStats(
                                        month.format(DateTimeFormatter.ofPattern("MM/yyyy")),
                                        totalSalary,
                                        salaries.size(),
                                        averageSalary));
                }
                return stats;
        }

        private List<DashboardStatsDTO.LeaveStats> getLeaveStats() {
                List<DashboardStatsDTO.LeaveStats> stats = new ArrayList<>();

                // Get all leave types
                List<Object[]> results = leaveRequestRepository.getStatsByLeaveType();

                for (Object[] result : results) {
                        if (result != null && result.length >= 2) {
                                LeaveRequest.LeaveType leaveType = (LeaveRequest.LeaveType) result[0];
                                long count = (Long) result[1];

                                long pending = leaveRequestRepository.countByLeaveTypeAndStatus(
                                                leaveType, LeaveRequest.LeaveStatus.PENDING);
                                long approved = leaveRequestRepository.countByLeaveTypeAndStatus(
                                                leaveType, LeaveRequest.LeaveStatus.APPROVED);
                                long rejected = leaveRequestRepository.countByLeaveTypeAndStatus(
                                                leaveType, LeaveRequest.LeaveStatus.REJECTED);

                                stats.add(new DashboardStatsDTO.LeaveStats(
                                                leaveType.name(), count, pending, approved, rejected));
                        }
                }
                // Handle missing types if needed? Assume basic stats are fine.
                return stats;
        }

        private DashboardStatsDTO.ContractStats getContractStats() {
                DashboardStatsDTO.ContractStats stats = new DashboardStatsDTO.ContractStats();

                stats.setTotalContracts(contractRepository.count());
                stats.setActiveContracts(contractRepository.countByStatus(ContractStatus.ACTIVE));
                stats.setExpiredContracts(contractRepository.countByStatus(ContractStatus.EXPIRED));

                LocalDate today = LocalDate.now();
                stats.setExpiringContracts(contractRepository.findExpiringContracts(today, today.plusDays(30)).size());

                // Stats by contract type
                List<Object[]> contractByType = contractRepository.getStatsByContractType();
                Map<String, Long> typeStats = contractByType.stream()
                                .collect(Collectors.toMap(
                                                row -> row[0].toString(),
                                                row -> (Long) row[1]));
                stats.setContractsByType(typeStats);

                return stats;
        }

        private List<DashboardStatsDTO.EmployeeAgeStats> getEmployeeByAgeStats() {
                List<Employee> employees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
                LocalDate today = LocalDate.now();

                Map<String, Long> ageGroups = new HashMap<>();
                ageGroups.put("20-25", 0L);
                ageGroups.put("26-30", 0L);
                ageGroups.put("31-35", 0L);
                ageGroups.put("36-40", 0L);
                ageGroups.put("41-50", 0L);
                ageGroups.put("50+", 0L);

                for (Employee emp : employees) {
                        if (emp.getDateOfBirth() != null) {
                                int age = Period.between(emp.getDateOfBirth(), today).getYears();
                                String group = (age <= 25) ? "20-25"
                                                : (age <= 30) ? "26-30"
                                                                : (age <= 35) ? "31-35"
                                                                                : (age <= 40) ? "36-40"
                                                                                                : (age <= 50) ? "41-50"
                                                                                                                : "50+";

                                ageGroups.put(group, ageGroups.get(group) + 1);
                        }
                }

                long totalEmployees = employees.size();
                return ageGroups.entrySet().stream()
                                .map(entry -> {
                                        double rate = totalEmployees > 0
                                                        ? (double) entry.getValue() / totalEmployees * 100
                                                        : 0.0;
                                        return new DashboardStatsDTO.EmployeeAgeStats(
                                                        entry.getKey(), entry.getValue(),
                                                        Math.round(rate * 100.0) / 100.0);
                                })
                                .collect(Collectors.toList());
        }

        private Map<String, Long> getEmployeeByGenderStats() {
                List<Employee> employees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
                Map<String, Long> genderStats = new HashMap<>();
                genderStats.put("Male", 0L);
                genderStats.put("Female", 0L);
                genderStats.put("Other", 0L);

                for (Employee emp : employees) {
                        Employee.Gender gender = emp.getGender();
                        if (gender != null) {
                                switch (gender) {
                                        case MALE -> genderStats.put("Male", genderStats.get("Male") + 1);
                                        case FEMALE -> genderStats.put("Female", genderStats.get("Female") + 1);
                                        case OTHER -> genderStats.put("Other", genderStats.get("Other") + 1);
                                }
                        }
                }

                return genderStats;
        }
}
