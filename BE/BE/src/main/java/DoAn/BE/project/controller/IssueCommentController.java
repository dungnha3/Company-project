package DoAn.BE.project.controller;

import DoAn.BE.project.dto.*;
import DoAn.BE.project.service.IssueCommentService;
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
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class IssueCommentController {
    
    private final IssueCommentService issueCommentService;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    @PostMapping
    public ResponseEntity<IssueCommentDTO> createComment(
            @Valid @RequestBody CreateCommentRequest request) {
        User currentUser = getCurrentUser();
        IssueCommentDTO comment = issueCommentService.createComment(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }
    
    @GetMapping("/issue/{issueId}")
    public ResponseEntity<List<IssueCommentDTO>> getIssueComments(
            @PathVariable Long issueId) {
        User currentUser = getCurrentUser();
        List<IssueCommentDTO> comments = issueCommentService.getIssueComments(issueId, currentUser);
        return ResponseEntity.ok(comments);
    }
    
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<IssueCommentDTO>> getProjectComments(
            @PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        List<IssueCommentDTO> comments = issueCommentService.getProjectComments(projectId, currentUser);
        return ResponseEntity.ok(comments);
    }
    
    @PutMapping("/{commentId}")
    public ResponseEntity<IssueCommentDTO> updateComment(
            @PathVariable Long commentId,
            @RequestBody String content) {
        User currentUser = getCurrentUser();
        IssueCommentDTO comment = issueCommentService.updateComment(commentId, content, currentUser);
        return ResponseEntity.ok(comment);
    }
    
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId) {
        User currentUser = getCurrentUser();
        issueCommentService.deleteComment(commentId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
