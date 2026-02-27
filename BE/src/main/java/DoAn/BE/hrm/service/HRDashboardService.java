package DoAn.BE.hrm.service;

import DoAn.BE.hrm.dto.DashboardStatsDTO;
import DoAn.BE.hrm.entity.Attendance;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.repository.AttendanceRepository;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.DepartmentRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

// HR-specific dashboard statistics: employees, leave, contracts, attendance.
// Extracted from DashboardService to follow Single Responsibility Principle.
// /
@Service
@Transactional(readOnly = true)
@Slf4j
@RequiredArgsConstructor
public class HRDashboardService {

    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ContractRepository contractRepository;
    private final AttendanceRepository attendanceRepository;
    private final DepartmentRepository departmentRepository;

    public long getTotalEmployees() {
        return employeeRepository.count();
    }

    public long getActiveEmployees() {
        return employeeRepository.countByStatus(EmployeeStatus.ACTIVE);
    }

    public long getResignedEmployees() {
        return employeeRepository.countByStatus(EmployeeStatus.RESIGNED);
    }

    public long getPendingLeaveRequests() {
        return leaveRequestRepository.countByStatus(LeaveRequest.LeaveStatus.PENDING);
    }

    public long getApprovedLeaveRequests() {
        return leaveRequestRepository.countByStatus(LeaveRequest.LeaveStatus.APPROVED);
    }

    public long getRejectedLeaveRequests() {
        return leaveRequestRepository.countByStatus(LeaveRequest.LeaveStatus.REJECTED);
    }

    public List<LeaveRequest> getPendingLeaveRequestsList() {
        return leaveRequestRepository.findByStatus(LeaveRequest.LeaveStatus.PENDING);
    }

    public List<DashboardStatsDTO.LeaveStats> getLeaveStatsByType() {
        List<DashboardStatsDTO.LeaveStats> stats = new ArrayList<>();
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
        return stats;
    }

    public long getActiveContracts() {
        return contractRepository.countByStatus(ContractStatus.ACTIVE);
    }

    public long getExpiredContracts() {
        return contractRepository.countByStatus(ContractStatus.EXPIRED);
    }

    public List<Contract> getExpiringContracts(int daysAhead) {
        LocalDate today = LocalDate.now();
        return contractRepository.findExpiringContracts(today, today.plusDays(daysAhead));
    }

    public DashboardStatsDTO.ContractStats getContractStats() {
        DashboardStatsDTO.ContractStats stats = new DashboardStatsDTO.ContractStats();
        stats.setTotalContracts(contractRepository.count());
        stats.setActiveContracts(contractRepository.countByStatus(ContractStatus.ACTIVE));
        stats.setExpiredContracts(contractRepository.countByStatus(ContractStatus.EXPIRED));

        LocalDate today = LocalDate.now();
        stats.setExpiringContracts(contractRepository.findExpiringContracts(today, today.plusDays(30)).size());

        List<Object[]> contractByType = contractRepository.getStatsByContractType();
        Map<String, Long> typeStats = contractByType.stream()
                .collect(Collectors.toMap(
                        row -> row[0].toString(),
                        row -> (Long) row[1]));
        stats.setContractsByType(typeStats);

        return stats;
    }

    public AttendanceStats getMonthlyAttendance(int month, int year) {
        LocalDate startOfMonth = LocalDate.of(year, month, 1);
        LocalDate endOfMonth = startOfMonth.withDayOfMonth(startOfMonth.lengthOfMonth());
        List<Attendance> attendances = attendanceRepository.findByAttendanceDateBetween(startOfMonth, endOfMonth);

        long total = attendances.size();
        long late = attendances.stream()
                .filter(a -> Attendance.AttendanceStatus.LATE.equals(a.getStatus())).count();
        long earlyLeave = attendances.stream()
                .filter(a -> Attendance.AttendanceStatus.EARLY_LEAVE.equals(a.getStatus())).count();

        return new AttendanceStats(total, late, earlyLeave);
    }

    public List<DashboardStatsDTO.DepartmentAttendanceStats> getAttendanceByDepartment() {
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
                    .filter(cc -> Attendance.AttendanceStatus.LATE.equals(cc.getStatus())).count();
            long earlyLeave = attendances.stream()
                    .filter(cc -> Attendance.AttendanceStatus.EARLY_LEAVE.equals(cc.getStatus())).count();
            long onTime = attendances.stream()
                    .filter(cc -> Attendance.AttendanceStatus.FULL_DAY.equals(cc.getStatus())).count();

            double onTimeRate = attendances.size() > 0 ? (double) onTime / attendances.size() * 100 : 0.0;

            return new DashboardStatsDTO.DepartmentAttendanceStats(
                    dept.getName(), totalEmployees, late, earlyLeave, onTime,
                    Math.round(onTimeRate * 100.0) / 100.0);
        }).collect(Collectors.toList());
    }

    public List<DashboardStatsDTO.EmployeeAgeStats> getEmployeeByAge() {
        List<Employee> employees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        LocalDate today = LocalDate.now();

        Map<String, Long> ageGroups = new LinkedHashMap<>();
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
                                                : (age <= 50) ? "41-50" : "50+";
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

    public Map<String, Long> getEmployeeByGender() {
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

    public record AttendanceStats(long total, long late, long earlyLeave) {
    }
}
