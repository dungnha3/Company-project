package DoAn.BE.analytics.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.analytics.dto.*;
import DoAn.BE.analytics.service.ProjectAnalyticsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final ProjectAnalyticsService analyticsService;

    /**
     * Get burndown chart data for a sprint
     * GET /api/analytics/projects/{projectId}/burndown?sprintId=123
     */
    @GetMapping("/projects/{projectId}/burndown")
    public ResponseEntity<BurndownDataDTO> getBurndown(
            @PathVariable Long projectId,
            @RequestParam Long sprintId) {
        return ResponseEntity.ok(analyticsService.getBurndownData(projectId, sprintId));
    }

    /**
     * Get velocity chart data
     * GET /api/analytics/projects/{projectId}/velocity?sprintCount=5
     */
    @GetMapping("/projects/{projectId}/velocity")
    public ResponseEntity<VelocityDataDTO> getVelocity(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "5") int sprintCount) {
        return ResponseEntity.ok(analyticsService.getVelocityData(projectId, sprintCount));
    }

    /**
     * Get issue status distribution
     * GET /api/analytics/projects/{projectId}/status
     */
    @GetMapping("/projects/{projectId}/status")
    public ResponseEntity<StatusDistributionDTO> getStatusDistribution(
            @PathVariable Long projectId) {
        return ResponseEntity.ok(analyticsService.getStatusDistribution(projectId));
    }

    /**
     * Get team workload summary
     * GET /api/analytics/projects/{projectId}/workload
     */
    @GetMapping("/projects/{projectId}/workload")
    public ResponseEntity<TeamWorkloadDTO> getTeamWorkload(
            @PathVariable Long projectId) {
        return ResponseEntity.ok(analyticsService.getTeamWorkload(projectId));
    }
}
