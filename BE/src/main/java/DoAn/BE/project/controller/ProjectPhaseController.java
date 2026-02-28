package DoAn.BE.project.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.project.dto.ProjectPhaseDTO;
import DoAn.BE.project.service.ProjectPhaseService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@FeatureFlag("PROJECT")
public class ProjectPhaseController {

    private final ProjectPhaseService projectPhaseService;

    @GetMapping("/{projectId}/phases")
    public ResponseEntity<List<ProjectPhaseDTO.Response>> getPhases(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectPhaseService.getPhasesByProject(projectId, user.getUserId()));
    }

    // Conflict with GanttController.getGanttData (same path
    // /api/projects/{projectId}/gantt)
    // Please use GanttController for full Gantt functionality
    // @GetMapping("/{projectId}/gantt")
    public ResponseEntity<DoAn.BE.project.dto.GanttChartDTO> getGanttChart(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectPhaseService.getGanttChartData(projectId));
    }

    @PostMapping("/{projectId}/phases")
    public ResponseEntity<ProjectPhaseDTO.Response> createPhase(
            @PathVariable Long projectId,
            @RequestBody ProjectPhaseDTO.CreateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectPhaseService.createPhase(projectId, request, user.getUserId()));
    }

    @PutMapping("/phases/{phaseId}")
    public ResponseEntity<ProjectPhaseDTO.Response> updatePhase(
            @PathVariable Long phaseId,
            @RequestBody ProjectPhaseDTO.UpdateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(projectPhaseService.updatePhase(phaseId, request, user.getUserId()));
    }

    @DeleteMapping("/phases/{phaseId}")
    public ResponseEntity<Void> deletePhase(
            @PathVariable Long phaseId,
            @AuthenticationPrincipal User user) {
        projectPhaseService.deletePhase(phaseId, user.getUserId());
        return ResponseEntity.noContent().build();
    }
}