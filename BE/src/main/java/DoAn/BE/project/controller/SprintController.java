package DoAn.BE.project.controller;

import DoAn.BE.project.dto.*;
import DoAn.BE.project.service.SprintService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// [Controller quản lý sprints] (Role: Project Members)
@RestController
@RequestMapping("/api/sprints")
@RequiredArgsConstructor
public class SprintController {

    private final SprintService sprintService;

    // ==================== CRUD ====================

    // [Tạo sprint mới] (Role: Project Manager)
    @PostMapping
    public ResponseEntity<SprintDTO> createSprint(
            @Valid @RequestBody CreateSprintRequest request,
            @AuthenticationPrincipal User currentUser) {
        SprintDTO sprint = sprintService.createSprint(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(sprint);
    }

    // [Lấy thông tin sprint] (Role: Project Member)
    @GetMapping("/{sprintId}")
    public ResponseEntity<SprintDTO> getSprint(
            @PathVariable Long sprintId,
            @AuthenticationPrincipal User currentUser) {
        SprintDTO sprint = sprintService.getSprintById(sprintId, currentUser);
        return ResponseEntity.ok(sprint);
    }

    // [Lấy danh sách sprint của project] (Role: Project Member)
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<SprintDTO>> getProjectSprints(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        List<SprintDTO> sprints = sprintService.getProjectSprints(projectId, currentUser);
        return ResponseEntity.ok(sprints);
    }

    // [Cập nhật sprint] (Role: Project Manager)
    @PutMapping("/{sprintId}")
    public ResponseEntity<SprintDTO> updateSprint(
            @PathVariable Long sprintId,
            @Valid @RequestBody UpdateSprintRequest request,
            @AuthenticationPrincipal User currentUser) {
        SprintDTO sprint = sprintService.updateSprint(sprintId, request, currentUser);
        return ResponseEntity.ok(sprint);
    }

    // [Xóa sprint] (Role: Project Manager)
    @DeleteMapping("/{sprintId}")
    public ResponseEntity<Void> deleteSprint(
            @PathVariable Long sprintId,
            @AuthenticationPrincipal User currentUser) {
        sprintService.deleteSprint(sprintId, currentUser);
        return ResponseEntity.noContent().build();
    }

    // ==================== SPRINT LIFECYCLE ====================

    // [Bắt đầu sprint] (Role: Project Manager)
    @PostMapping("/{sprintId}/start")
    public ResponseEntity<SprintDTO> startSprint(
            @PathVariable Long sprintId,
            @AuthenticationPrincipal User currentUser) {
        SprintDTO sprint = sprintService.startSprint(sprintId, currentUser);
        return ResponseEntity.ok(sprint);
    }

    // [Hoàn thành sprint] (Role: Project Manager)
    @PostMapping("/{sprintId}/complete")
    public ResponseEntity<SprintDTO> completeSprint(
            @PathVariable Long sprintId,
            @AuthenticationPrincipal User currentUser) {
        SprintDTO sprint = sprintService.completeSprint(sprintId, currentUser);
        return ResponseEntity.ok(sprint);
    }

    // ==================== ISSUE MANAGEMENT ====================

    // [Thêm issue vào sprint] (Role: Project Manager)
    @PostMapping("/{sprintId}/issues/{issueId}")
    public ResponseEntity<Void> addIssueToSprint(
            @PathVariable Long sprintId,
            @PathVariable Long issueId,
            @AuthenticationPrincipal User currentUser) {
        sprintService.addIssueToSprint(sprintId, issueId, currentUser);
        return ResponseEntity.ok().build();
    }

    // [Xóa issue khỏi sprint] (Role: Project Manager)
    @DeleteMapping("/{sprintId}/issues/{issueId}")
    public ResponseEntity<Void> removeIssueFromSprint(
            @PathVariable Long sprintId,
            @PathVariable Long issueId,
            @AuthenticationPrincipal User currentUser) {
        sprintService.removeIssueFromSprint(sprintId, issueId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
