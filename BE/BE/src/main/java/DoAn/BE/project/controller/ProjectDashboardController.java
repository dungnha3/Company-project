package DoAn.BE.project.controller;

import DoAn.BE.project.dto.*;
import DoAn.BE.project.service.ProjectDashboardService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/project-dashboard")
@RequiredArgsConstructor
public class ProjectDashboardController {
    
    private final ProjectDashboardService dashboardService;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    @GetMapping("/project/{projectId}/stats")
    public ResponseEntity<ProjectStatsDTO> getProjectStats(
            @PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        ProjectStatsDTO stats = dashboardService.getProjectStats(projectId, currentUser);
        return ResponseEntity.ok(stats);
    }
    
    @GetMapping("/sprint/{sprintId}/burndown")
    public ResponseEntity<SprintBurndownDTO> getSprintBurndown(
            @PathVariable Long sprintId) {
        User currentUser = getCurrentUser();
        SprintBurndownDTO burndown = dashboardService.getSprintBurndown(sprintId, currentUser);
        return ResponseEntity.ok(burndown);
    }
    
    @GetMapping("/my-projects")
    public ResponseEntity<List<ProjectStatsDTO>> getUserProjectsStats() {
        User currentUser = getCurrentUser();
        List<ProjectStatsDTO> stats = dashboardService.getUserProjectsStats(currentUser);
        return ResponseEntity.ok(stats);
    }
}
