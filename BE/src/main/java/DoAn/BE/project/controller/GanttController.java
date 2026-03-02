package DoAn.BE.project.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.project.dto.GanttDto;
import DoAn.BE.project.service.GanttService;
import DoAn.BE.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Controller for Gantt chart operations
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Gantt Chart", description = "Gantt chart visualization and management")
@FeatureFlag("PROJECT")
@Transactional(readOnly = true)
public class GanttController {

    private final GanttService ganttService;

    @GetMapping("/projects/{projectId}/gantt")
    @Operation(summary = "Get Gantt chart data", description = "Returns complete Gantt data including phases, issues, and dependencies")
    public ResponseEntity<GanttDto.GanttResponse> getGanttData(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {

        GanttDto.GanttResponse response = ganttService.getGanttData(projectId, currentUser.getUserId());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/issues/{issueId}/gantt")
    @Operation(summary = "Update issue dates", description = "Update start and end dates for an issue (drag-drop support)")
    public ResponseEntity<GanttDto.GanttItem> updateIssueDates(
            @PathVariable Long issueId,
            @Valid @RequestBody GanttDto.DateUpdateRequest request,
            @AuthenticationPrincipal User currentUser) {

        GanttDto.GanttItem updated = ganttService.updateIssueDates(issueId, request, currentUser.getUserId());
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/issues/dependencies")
    @Operation(summary = "Create dependency", description = "Create a dependency link between two issues")
    public ResponseEntity<GanttDto.DependencyResponse> createDependency(
            @Valid @RequestBody GanttDto.CreateDependencyRequest request,
            @AuthenticationPrincipal User currentUser) {

        GanttDto.DependencyResponse dependency = ganttService.createDependency(request, currentUser.getUserId());
        return ResponseEntity.ok(dependency);
    }

    @GetMapping("/issues/{issueId}/dependencies")
    @Operation(summary = "Get issue dependencies", description = "Get all dependencies for an issue (predecessors and successors)")
    public ResponseEntity<List<GanttDto.DependencyResponse>> getIssueDependencies(
            @PathVariable Long issueId,
            @AuthenticationPrincipal User currentUser) {

        List<GanttDto.DependencyResponse> dependencies = ganttService.getIssueDependencies(issueId,
                currentUser.getUserId());
        return ResponseEntity.ok(dependencies);
    }

    @DeleteMapping("/dependencies/{dependencyId}")
    @Operation(summary = "Delete dependency", description = "Remove a dependency link between issues")
    public ResponseEntity<Void> deleteDependency(
            @PathVariable Long dependencyId,
            @AuthenticationPrincipal User currentUser) {

        ganttService.deleteDependency(dependencyId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
}