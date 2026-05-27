package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.PerformanceDashboardDTO;
import DoAn.BE.hrm.dto.PerformanceRankingDTO;
import DoAn.BE.hrm.service.PerformanceService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr")
@RequiredArgsConstructor
public class HRPerformanceController {

    private final PerformanceService performanceService;

    // --- Performance Dashboard (aggregated) ---

    @GetMapping("/performance/dashboard")
    public ResponseEntity<PerformanceDashboardDTO> getPerformanceDashboard(
            @RequestParam(defaultValue = "all") String period) {
        return ResponseEntity.ok(performanceService.getPerformanceDashboard(period));
    }

    @GetMapping("/performance/employees/{employeeId}/summary")
    public ResponseEntity<PerformanceDashboardDTO.EmployeeSummary> getEmployeePerformanceSummary(
            @PathVariable Long employeeId) {
        return ResponseEntity.ok(performanceService.getEmployeePerformanceSummary(employeeId));
    }

    @GetMapping("/performance/my-stats")
    public ResponseEntity<PerformanceDashboardDTO.MyStats> getMyStats(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(performanceService.getMyStats(currentUser));
    }

    // --- Performance Comparison ---

    @GetMapping("/performance-comparison/me")
    public ResponseEntity<List<PerformanceRankingDTO>> getMyPerformanceComparison(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(performanceService.getMyPerformanceComparison(currentUser));
    }

    @GetMapping("/performance-comparison/projects/{projectId}")
    public ResponseEntity<List<PerformanceRankingDTO>> getProjectPerformanceRanking(
            @PathVariable Long projectId) {
        return ResponseEntity.ok(performanceService.getProjectPerformanceRanking(projectId));
    }
}
