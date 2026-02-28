package DoAn.BE.analytics.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.user.entity.User;

import DoAn.BE.analytics.dto.*;
import DoAn.BE.analytics.service.ProjectAnalyticsService;
import DoAn.BE.common.annotation.FeatureFlag;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@FeatureFlag("ANALYTICS")
public class AnalyticsController {

    private final ProjectAnalyticsService analyticsService;
    private final DoAn.BE.project.repository.ProjectMemberRepository projectMemberRepository;
    private void validateProjectAccess(Long projectId, User currentUser) {
        if (currentUser.isSystemAdminAccount())
            return;
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, currentUser.getUserId())
                .orElseThrow(() -> new DoAn.BE.common.exception.ForbiddenException(
                        "Bạn không có quyền truy cập analytics dự án này"));
    }

    @GetMapping("/projects/{projectId}/burndown")
    public ResponseEntity<BurndownDataDTO> getBurndown(
            @PathVariable Long projectId,
            @RequestParam Long sprintId,
            @AuthenticationPrincipal User currentUser) {
        validateProjectAccess(projectId, currentUser);
        return ResponseEntity.ok(analyticsService.getBurndownData(projectId, sprintId));
    }

    @GetMapping("/projects/{projectId}/velocity")
    public ResponseEntity<VelocityDataDTO> getVelocity(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "5") int sprintCount,
            @AuthenticationPrincipal User currentUser) {
        validateProjectAccess(projectId, currentUser);
        sprintCount = Math.min(sprintCount, 50);
        return ResponseEntity.ok(analyticsService.getVelocityData(projectId, sprintCount));
    }

    @GetMapping("/projects/{projectId}/status")
    public ResponseEntity<StatusDistributionDTO> getStatusDistribution(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        validateProjectAccess(projectId, currentUser);
        return ResponseEntity.ok(analyticsService.getStatusDistribution(projectId));
    }

    @GetMapping("/projects/{projectId}/workload")
    public ResponseEntity<TeamWorkloadDTO> getTeamWorkload(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        validateProjectAccess(projectId, currentUser);
        return ResponseEntity.ok(analyticsService.getTeamWorkload(projectId));
    }
}
