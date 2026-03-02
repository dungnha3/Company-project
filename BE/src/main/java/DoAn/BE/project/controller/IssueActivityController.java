package DoAn.BE.project.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.project.dto.IssueActivityDTO;
import DoAn.BE.project.service.IssueActivityService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
@FeatureFlag("PROJECT")
@Transactional(readOnly = true)
public class IssueActivityController {

    private final IssueActivityService issueActivityService;

    @GetMapping("/issue/{issueId}")
    public ResponseEntity<org.springframework.data.domain.Page<IssueActivityDTO>> getIssueActivities(
            @PathVariable Long issueId,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<IssueActivityDTO> activities = issueActivityService
                .getIssueActivitiesPaged(issueId, currentUser, pageable);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<org.springframework.data.domain.Page<IssueActivityDTO>> getProjectActivities(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<IssueActivityDTO> activities = issueActivityService
                .getProjectActivitiesPaged(projectId, currentUser, pageable);
        return ResponseEntity.ok(activities);
    }

    @GetMapping("/project/{projectId}/my")
    public ResponseEntity<org.springframework.data.domain.Page<IssueActivityDTO>> getUserActivities(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<IssueActivityDTO> activities = issueActivityService
                .getUserActivitiesPaged(projectId, currentUser, pageable);
        return ResponseEntity.ok(activities);
    }

    @DeleteMapping("/{activityId}")
    public ResponseEntity<Void> deleteActivity(
            @PathVariable Long activityId,
            @AuthenticationPrincipal User currentUser) {
        issueActivityService.deleteActivity(activityId, currentUser);
        return ResponseEntity.noContent().build();
    }
}