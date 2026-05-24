package DoAn.BE.project.controller;


import DoAn.BE.common.service.AccessControlService;
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
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IssueController {

    private final IssueService issueService;
    private final AccessControlService accessControlService;

    @PostMapping
    @Transactional
    public ResponseEntity<IssueDTO> createIssue(
            @Valid @RequestBody CreateIssueRequest request,
            Authentication authentication) {
        accessControlService.checkProjectManageIssuesPermission();
        log.info("Tạo issue mới - Request: {}", request);
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.createIssue(request, user.getUserId());
        log.info("Đã tạo issue: {}", issue.getIssueId());
        return ResponseEntity.status(HttpStatus.CREATED).body(issue);
    }

    @GetMapping("/{issueId}")
    public ResponseEntity<IssueDTO> getIssue(
            @PathVariable Long issueId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.getIssueById(issueId, user.getUserId());
        return ResponseEntity.ok(issue);
    }

    @PutMapping("/{issueId}")
    @Transactional
    public ResponseEntity<IssueDTO> updateIssue(
            @PathVariable Long issueId,
            @Valid @RequestBody UpdateIssueRequest request,
            Authentication authentication) {
        accessControlService.checkProjectManageIssuesPermission();
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.updateIssue(issueId, request, user.getUserId());
        return ResponseEntity.ok(issue);
    }

    @DeleteMapping("/{issueId}")
    @Transactional
    public ResponseEntity<Void> deleteIssue(
            @PathVariable Long issueId,
            Authentication authentication) {
        accessControlService.checkProjectManageIssuesPermission();
        User user = (User) authentication.getPrincipal();
        issueService.deleteIssue(issueId, user.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<Page<IssueDTO>> getProjectIssues(
            @PathVariable Long projectId,
            Pageable pageable,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getProjectIssuesPaginated(projectId, user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    @GetMapping("/project/{projectId}/backlog")
    public ResponseEntity<Page<IssueDTO>> getProjectBacklog(
            @PathVariable Long projectId,
            Pageable pageable,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getProjectBacklogPaginated(projectId, user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<Page<IssueDTO>> getSprintIssues(
            @PathVariable Long sprintId,
            Pageable pageable,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getSprintIssuesPaginated(sprintId, user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    @GetMapping("/my-issues")
    public ResponseEntity<Page<IssueDTO>> getMyIssues(
            Authentication authentication,
            Pageable pageable) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getMyIssuesPaginated(user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    @GetMapping("/my-reported")
    public ResponseEntity<Page<IssueDTO>> getMyReportedIssues(
            Authentication authentication,
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        User user = (User) authentication.getPrincipal();
        Page<IssueDTO> issues = issueService.getMyReportedIssuesPaginated(user.getUserId(), pageable);
        return ResponseEntity.ok(issues);
    }

    @PatchMapping("/{issueId}/assign/{assigneeId}")
    @Transactional
    public ResponseEntity<IssueDTO> assignIssue(
            @PathVariable Long issueId,
            @PathVariable Long assigneeId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.assignIssue(issueId, assigneeId, user.getUserId());
        return ResponseEntity.ok(issue);
    }

    @PatchMapping("/{issueId}/status/{statusId}")
    @Transactional
    public ResponseEntity<IssueDTO> changeIssueStatus(
            @PathVariable Long issueId,
            @PathVariable Integer statusId,
            @RequestParam(required = false) Integer orderIndex,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.changeIssueStatus(issueId, statusId, orderIndex, user.getUserId());
        return ResponseEntity.ok(issue);
    }
}