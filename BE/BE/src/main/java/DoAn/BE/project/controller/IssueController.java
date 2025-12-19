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

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
@Slf4j
public class IssueController {
    
    private final IssueService issueService;
    
    @PostMapping
    public ResponseEntity<IssueDTO> createIssue(
            @Valid @RequestBody CreateIssueRequest request,
            Authentication authentication) {
        try {
            log.info("Creating issue - Request: {}", request);
            User user = (User) authentication.getPrincipal();
            Long userId = user.getUserId();
            log.info("User ID: {}", userId);
            IssueDTO issue = issueService.createIssue(request, userId);
            log.info("Issue created successfully: {}", issue.getIssueId());
            return ResponseEntity.status(HttpStatus.CREATED).body(issue);
        } catch (Exception e) {
            log.error("Error creating issue", e);
            throw e;
        }
    }
    
    @GetMapping("/{issueId}")
    public ResponseEntity<IssueDTO> getIssue(
            @PathVariable Long issueId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.getIssueById(issueId, user.getUserId());
        return ResponseEntity.ok(issue);
    }
    
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<IssueDTO>> getProjectIssues(
            @PathVariable Long projectId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<IssueDTO> issues = issueService.getProjectIssues(projectId, user.getUserId());
        return ResponseEntity.ok(issues);
    }
    
    @GetMapping("/project/{projectId}/backlog")
    public ResponseEntity<List<IssueDTO>> getProjectBacklog(
            @PathVariable Long projectId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<IssueDTO> issues = issueService.getProjectBacklog(projectId, user.getUserId());
        return ResponseEntity.ok(issues);
    }
    
    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<List<IssueDTO>> getSprintIssues(
            @PathVariable Long sprintId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<IssueDTO> issues = issueService.getSprintIssues(sprintId, user.getUserId());
        return ResponseEntity.ok(issues);
    }
    
    @GetMapping("/my-issues")
    public ResponseEntity<List<IssueDTO>> getMyIssues(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<IssueDTO> issues = issueService.getMyIssues(user.getUserId());
        return ResponseEntity.ok(issues);
    }
    
    @GetMapping("/my-reported")
    public ResponseEntity<List<IssueDTO>> getMyReportedIssues(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        List<IssueDTO> issues = issueService.getMyReportedIssues(user.getUserId());
        return ResponseEntity.ok(issues);
    }
    
    @PutMapping("/{issueId}")
    public ResponseEntity<IssueDTO> updateIssue(
            @PathVariable Long issueId,
            @Valid @RequestBody UpdateIssueRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.updateIssue(issueId, request, user.getUserId());
        return ResponseEntity.ok(issue);
    }
    
    @DeleteMapping("/{issueId}")
    public ResponseEntity<Void> deleteIssue(
            @PathVariable Long issueId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        issueService.deleteIssue(issueId, user.getUserId());
        return ResponseEntity.noContent().build();
    }
    
    @PatchMapping("/{issueId}/assign/{assigneeId}")
    public ResponseEntity<IssueDTO> assignIssue(
            @PathVariable Long issueId,
            @PathVariable Long assigneeId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        IssueDTO issue = issueService.assignIssue(issueId, assigneeId, user.getUserId());
        return ResponseEntity.ok(issue);
    }
    
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
