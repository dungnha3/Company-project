package DoAn.BE.project.controller;

import DoAn.BE.project.dto.IssueActivityDTO;
import DoAn.BE.project.service.IssueActivityService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class IssueActivityController {
    
    private final IssueActivityService issueActivityService;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    @GetMapping("/issue/{issueId}")
    public ResponseEntity<List<IssueActivityDTO>> getIssueActivities(
            @PathVariable Long issueId) {
        User currentUser = getCurrentUser();
        List<IssueActivityDTO> activities = issueActivityService.getIssueActivities(issueId, currentUser);
        return ResponseEntity.ok(activities);
    }
    
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<IssueActivityDTO>> getProjectActivities(
            @PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        List<IssueActivityDTO> activities = issueActivityService.getProjectActivities(projectId, currentUser);
        return ResponseEntity.ok(activities);
    }
    
    @GetMapping("/project/{projectId}/my")
    public ResponseEntity<List<IssueActivityDTO>> getUserActivities(
            @PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        List<IssueActivityDTO> activities = issueActivityService.getUserActivities(projectId, currentUser);
        return ResponseEntity.ok(activities);
    }
    
    @DeleteMapping("/{activityId}")
    public ResponseEntity<Void> deleteActivity(
            @PathVariable Long activityId) {
        User currentUser = getCurrentUser();
        issueActivityService.deleteActivity(activityId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
