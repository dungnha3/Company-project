package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.DashboardDTO;
import DoAn.BE.hrm.dto.DashboardStatsDTO;
import DoAn.BE.hrm.service.DashboardService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// [Controller dashboard HR] (Role: Manager)
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // ==================== OVERVIEW ====================

    // [General Overview] (Role: Manager)
    @GetMapping("/overview")
    public ResponseEntity<DashboardDTO> getOverview(@AuthenticationPrincipal User currentUser) {
        DashboardDTO dashboard = dashboardService.getOverview(currentUser);
        return ResponseEntity.ok(dashboard);
    }

    // [Monthly Statistics] (Role: Manager)
    @GetMapping("/monthly")
    public ResponseEntity<DashboardDTO> getMonthlyStats(
            @RequestParam int month,
            @RequestParam int year,
            @AuthenticationPrincipal User currentUser) {
        DashboardDTO dashboard = dashboardService.getMonthlyStats(month, year, currentUser);
        return ResponseEntity.ok(dashboard);
    }

    // [Advanced Dashboard - Charts and Detailed Stats] (Role: Manager)
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats(@AuthenticationPrincipal User currentUser) {
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats);
    }

    // ==================== CHARTS ====================

    // [Attendance by Department] (Role: Manager)
    // [Attendance by Department] (Role: Manager)
    @GetMapping("/attendance-by-department")
    public ResponseEntity<DashboardStatsDTO.DepartmentAttendanceStats[]> getAttendanceByDepartmentStats(
            @AuthenticationPrincipal User currentUser) {
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity
                .ok(stats.getAttendanceByDepartment().toArray(new DashboardStatsDTO.DepartmentAttendanceStats[0]));
    }

    // [Salary by Month] (Role: Manager)
    @GetMapping("/salary-by-month")
    public ResponseEntity<DashboardStatsDTO.MonthlySalaryStats[]> getSalaryByMonthStats(
            @AuthenticationPrincipal User currentUser) {
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getSalaryByMonth().toArray(new DashboardStatsDTO.MonthlySalaryStats[0]));
    }

    // [Employee by Age] (Role: Manager)
    @GetMapping("/employee-by-age")
    public ResponseEntity<DashboardStatsDTO.EmployeeAgeStats[]> getEmployeeByAgeStats(
            @AuthenticationPrincipal User currentUser) {
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getEmployeeByAge().toArray(new DashboardStatsDTO.EmployeeAgeStats[0]));
    }

    // [Employee by Gender] (Role: Manager)
    @GetMapping("/employee-by-gender")
    public ResponseEntity<Map<String, Long>> getEmployeeByGenderStats(
            @AuthenticationPrincipal User currentUser) {
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getEmployeeByGender());
    }
}
