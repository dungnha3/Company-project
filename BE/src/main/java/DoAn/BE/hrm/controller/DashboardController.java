package DoAn.BE.hrm.controller;

import DoAn.BE.common.annotation.FeatureFlag;
import DoAn.BE.common.service.AccessControlService;

import DoAn.BE.hrm.dto.DashboardDTO;
import DoAn.BE.hrm.dto.DashboardStatsDTO;
import DoAn.BE.hrm.service.DashboardService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@FeatureFlag("HR")
@Transactional(readOnly = true)
public class DashboardController {

    private final DashboardService dashboardService;
    private final AccessControlService accessControlService;

    @GetMapping("/overview")
    public ResponseEntity<DashboardDTO> getOverview(@AuthenticationPrincipal User currentUser) {
        accessControlService.checkHrViewDashboardPermission();
        DashboardDTO dashboard = dashboardService.getOverview(currentUser);
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/monthly")
    public ResponseEntity<DashboardDTO> getMonthlyStats(
            @RequestParam int month,
            @RequestParam int year,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkHrViewDashboardPermission();
        DashboardDTO dashboard = dashboardService.getMonthlyStats(month, year, currentUser);
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats(@AuthenticationPrincipal User currentUser) {
        accessControlService.checkHrViewDashboardPermission();
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/attendance-by-department")
    public ResponseEntity<DashboardStatsDTO.DepartmentAttendanceStats[]> getAttendanceByDepartmentStats(
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkHrViewDashboardPermission();
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity
                .ok(stats.getAttendanceByDepartment().toArray(new DashboardStatsDTO.DepartmentAttendanceStats[0]));
    }

    @GetMapping("/salary-by-month")
    public ResponseEntity<DashboardStatsDTO.MonthlySalaryStats[]> getSalaryByMonthStats(
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkHrViewDashboardPermission();
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getSalaryByMonth().toArray(new DashboardStatsDTO.MonthlySalaryStats[0]));
    }

    @GetMapping("/employee-by-age")
    public ResponseEntity<DashboardStatsDTO.EmployeeAgeStats[]> getEmployeeByAgeStats(
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkHrViewDashboardPermission();
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getEmployeeByAge().toArray(new DashboardStatsDTO.EmployeeAgeStats[0]));
    }

    @GetMapping("/employee-by-gender")
    public ResponseEntity<Map<String, Long>> getEmployeeByGenderStats(
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkHrViewDashboardPermission();
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getEmployeeByGender());
    }
}