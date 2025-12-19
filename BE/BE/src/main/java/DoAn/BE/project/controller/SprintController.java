package DoAn.BE.project.controller;

import DoAn.BE.project.dto.*;
import DoAn.BE.project.service.SprintService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sprints")
@RequiredArgsConstructor
public class SprintController {
    
    private final SprintService sprintService;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    @PostMapping
    public ResponseEntity<SprintDTO> createSprint(
            @Valid @RequestBody CreateSprintRequest request) {
        User currentUser = getCurrentUser();
        SprintDTO sprint = sprintService.createSprint(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(sprint);
    }
    
    @GetMapping("/{sprintId}")
    public ResponseEntity<SprintDTO> getSprint(
            @PathVariable Long sprintId) {
        User currentUser = getCurrentUser();
        SprintDTO sprint = sprintService.getSprintById(sprintId, currentUser);
        return ResponseEntity.ok(sprint);
    }
    
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<SprintDTO>> getProjectSprints(
            @PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        List<SprintDTO> sprints = sprintService.getProjectSprints(projectId, currentUser);
        return ResponseEntity.ok(sprints);
    }
    
    @PutMapping("/{sprintId}")
    public ResponseEntity<SprintDTO> updateSprint(
            @PathVariable Long sprintId,
            @Valid @RequestBody UpdateSprintRequest request) {
        User currentUser = getCurrentUser();
        SprintDTO sprint = sprintService.updateSprint(sprintId, request, currentUser);
        return ResponseEntity.ok(sprint);
    }
    
    @DeleteMapping("/{sprintId}")
    public ResponseEntity<Void> deleteSprint(
            @PathVariable Long sprintId) {
        User currentUser = getCurrentUser();
        sprintService.deleteSprint(sprintId, currentUser);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{sprintId}/start")
    public ResponseEntity<SprintDTO> startSprint(
            @PathVariable Long sprintId) {
        User currentUser = getCurrentUser();
        SprintDTO sprint = sprintService.startSprint(sprintId, currentUser);
        return ResponseEntity.ok(sprint);
    }
    
    @PostMapping("/{sprintId}/complete")
    public ResponseEntity<SprintDTO> completeSprint(
            @PathVariable Long sprintId) {
        User currentUser = getCurrentUser();
        SprintDTO sprint = sprintService.completeSprint(sprintId, currentUser);
        return ResponseEntity.ok(sprint);
    }
    
    @PostMapping("/{sprintId}/issues/{issueId}")
    public ResponseEntity<Void> addIssueToSprint(
            @PathVariable Long sprintId,
            @PathVariable Long issueId) {
        User currentUser = getCurrentUser();
        sprintService.addIssueToSprint(sprintId, issueId, currentUser);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/{sprintId}/issues/{issueId}")
    public ResponseEntity<Void> removeIssueFromSprint(
            @PathVariable Long sprintId,
            @PathVariable Long issueId) {
        User currentUser = getCurrentUser();
        sprintService.removeIssueFromSprint(sprintId, issueId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
