package DoAn.BE.project.controller;

import DoAn.BE.project.dto.*;
import DoAn.BE.project.service.ProjectDashboardService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/project-dashboard")
@RequiredArgsConstructor
public class ProjectDashboardController {

    private final ProjectDashboardService dashboardService;

    @GetMapping("/project/{projectId}/stats")
    public ResponseEntity<ProjectStatsDTO> getProjectStats(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        ProjectStatsDTO stats = dashboardService.getProjectStats(projectId, currentUser);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/sprint/{sprintId}/burndown")
    public ResponseEntity<SprintBurndownDTO> getSprintBurndown(
            @PathVariable Long sprintId,
            @AuthenticationPrincipal User currentUser) {
        SprintBurndownDTO burndown = dashboardService.getSprintBurndown(sprintId, currentUser);
        return ResponseEntity.ok(burndown);
    }

    @GetMapping("/my-projects")
    public ResponseEntity<List<ProjectStatsDTO>> getUserProjectsStats(@AuthenticationPrincipal User currentUser) {
        List<ProjectStatsDTO> stats = dashboardService.getUserProjectsStats(currentUser);
        return ResponseEntity.ok(stats);
    }
}
