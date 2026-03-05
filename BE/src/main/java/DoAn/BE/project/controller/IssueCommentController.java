package DoAn.BE.project.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.project.dto.*;
import DoAn.BE.project.service.IssueCommentService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
@FeatureFlag("PROJECT")
@Transactional(readOnly = true)
public class IssueCommentController {

    private final IssueCommentService issueCommentService;

    @PostMapping
    public ResponseEntity<IssueCommentDTO> createComment(
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal User currentUser) {
        IssueCommentDTO comment = issueCommentService.createComment(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    @GetMapping("/issue/{issueId}")
    public ResponseEntity<org.springframework.data.domain.Page<IssueCommentDTO>> getIssueComments(
            @PathVariable Long issueId,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<IssueCommentDTO> comments = issueCommentService
                .getIssueCommentsPaged(issueId, currentUser, pageable);
        return ResponseEntity.ok(comments);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<org.springframework.data.domain.Page<IssueCommentDTO>> getProjectComments(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<IssueCommentDTO> comments = issueCommentService
                .getProjectCommentsPaged(projectId, currentUser, pageable);
        return ResponseEntity.ok(comments);
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<IssueCommentDTO> updateComment(
            @PathVariable Long commentId,
            @RequestBody String content,
            @AuthenticationPrincipal User currentUser) {
        IssueCommentDTO comment = issueCommentService.updateComment(commentId, content, currentUser);
        return ResponseEntity.ok(comment);
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal User currentUser) {
        issueCommentService.deleteComment(commentId, currentUser);
        return ResponseEntity.noContent().build();
    }
}