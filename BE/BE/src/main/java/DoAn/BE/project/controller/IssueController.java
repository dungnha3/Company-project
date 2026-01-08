package DoAn.BE.project.controller;

import DoAn.BE.project.dto.CreateIssueRequest;
import DoAn.BE.project.dto.IssueDTO;
import DoAn.BE.project.dto.UpdateIssueRequest;
import DoAn.BE.project.service.IssueService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// [Controller quản lý issues/tasks] (Role: Project Members)
@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
@Slf4j
public class IssueController {

    private final IssueService issueService;

    // ==================== CRUD ====================

    // [Tạo issue mới] (Role: Project Member)
    @PostMapping
    public ResponseEntity<IssueDTO> createIssue(
            @Valid @RequestBody CreateIssueRequest request,
            Authentication authentication) {
        log.info("Tạo issue mới - Request: {}", request);
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.createIssue(request, user.getUserId());
        log.info("Đã tạo issue: {}", issue.getIssueId());
        return ResponseEntity.status(HttpStatus.CREATED).body(issue);
    }

    // [Lấy thông tin issue] (Role: Project Member)
    @GetMapping("/{issueId}")
    public ResponseEntity<IssueDTO> getIssue(
            @PathVariable Long issueId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.getIssueById(issueId, user.getUserId());
        return ResponseEntity.ok(issue);
    }

    // [Cập nhật issue] (Role: Project Member)
    @PutMapping("/{issueId}")
    public ResponseEntity<IssueDTO> updateIssue(
            @PathVariable Long issueId,
            @Valid @RequestBody UpdateIssueRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.updateIssue(issueId, request, user.getUserId());
        return ResponseEntity.ok(issue);
    }

    // [Xóa issue] (Role: Project Manager/Reporter)
    @DeleteMapping("/{issueId}")
    public ResponseEntity<Void> deleteIssue(
            @PathVariable Long issueId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        issueService.deleteIssue(issueId, user.getUserId());
        return ResponseEntity.noContent().build();
    }

    // ==================== PROJECT/SPRINT QUERIES ====================

    // [Lấy issues của project] (Role: Project Member)
    @GetMapping("/project/{projectId}")
    public ResponseEntity<Page<IssueDTO>> getProjectIssues(
            @PathVariable Long projectId,
            Pageable pageable,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getProjectIssuesPaginated(projectId, user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    // [Lấy backlog của project] (Role: Project Member)
    @GetMapping("/project/{projectId}/backlog")
    public ResponseEntity<Page<IssueDTO>> getProjectBacklog(
            @PathVariable Long projectId,
            Pageable pageable,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getProjectBacklogPaginated(projectId, user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    // [Lấy issues của sprint] (Role: Project Member)
    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<Page<IssueDTO>> getSprintIssues(
            @PathVariable Long sprintId,
            Pageable pageable,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getSprintIssuesPaginated(sprintId, user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    // ==================== MY ISSUES ====================

    // [Lấy issues được giao cho tôi] (Role: Authenticated User)
    @GetMapping("/my-issues")
    public ResponseEntity<Page<IssueDTO>> getMyIssues(
            Authentication authentication,
            Pageable pageable) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getMyIssuesPaginated(user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    // [Lấy issues tôi đã tạo] (Role: Authenticated User)
    @GetMapping("/my-reported")
    public ResponseEntity<List<IssueDTO>> getMyReportedIssues(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<IssueDTO> issues = issueService.getMyReportedIssues(user.getUserId());
        return ResponseEntity.ok(issues);
    }

    // ==================== ACTIONS ====================

    // [Gán issue cho người khác] (Role: Project Manager)
    @PatchMapping("/{issueId}/assign/{assigneeId}")
    public ResponseEntity<IssueDTO> assignIssue(
            @PathVariable Long issueId,
            @PathVariable Long assigneeId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.assignIssue(issueId, assigneeId, user.getUserId());
        return ResponseEntity.ok(issue);
    }

    // [Thay đổi trạng thái issue] (Role: Project Member)
    @PatchMapping("/{issueId}/status/{statusId}")
    public ResponseEntity<IssueDTO> changeIssueStatus(
            @PathVariable Long issueId,
            @PathVariable Integer statusId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.changeIssueStatus(issueId, statusId, user.getUserId());
        return ResponseEntity.ok(issue);
    }
}
