package DoAn.BE.automation.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.automation.dto.*;
import DoAn.BE.automation.service.AutomationService;
import DoAn.BE.common.annotation.FeatureFlag;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.user.entity.User;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Controller quản lý Automation Rules.
 * - READ access: Tất cả project members có thể xem
 * - WRITE access: Chỉ Project OWNER/MANAGER hoặc Company OWNER/ADMIN
 */
@RestController
@RequestMapping("/api/automations")
@RequiredArgsConstructor
@FeatureFlag("AUTOMATION")
public class AutomationController {

    private final AutomationService automationService;
    private final ProjectMemberRepository projectMemberRepository;
    private final AccessControlService accessControlService;

    /**
     * Create a new automation rule
     * POST /api/automations
     * Required: Project OWNER/MANAGER or Company OWNER/ADMIN
     */
    @PostMapping
    public ResponseEntity<AutomationRuleDTO> createRule(
            @Valid @RequestBody CreateRuleRequest request,
            @AuthenticationPrincipal User currentUser) {
        // Check write permission
        validateWriteAccess(request.getProjectId(), currentUser);
        return ResponseEntity.ok(automationService.createRule(request));
    }

    /**
     * Get all rules for a project
     * GET /api/automations/project/{projectId}
     * Required: Project member (read-only access for all members)
     */
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<AutomationRuleDTO>> getProjectRules(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        // Employees can view automations if they are project members
        validateReadAccess(projectId, currentUser);
        return ResponseEntity.ok(automationService.getProjectRules(projectId));
    }

    /**
     * Get rule by ID
     * GET /api/automations/{ruleId}
     * Required: Project member (read-only access)
     */
    @GetMapping("/{ruleId}")
    public ResponseEntity<AutomationRuleDTO> getRule(
            @PathVariable Long ruleId,
            @AuthenticationPrincipal User currentUser) {
        AutomationRuleDTO rule = automationService.getRuleById(ruleId);
        // Validate user is member of the project
        validateReadAccess(rule.getProjectId(), currentUser);
        return ResponseEntity.ok(rule);
    }

    /**
     * Toggle rule active/inactive
     * POST /api/automations/{ruleId}/toggle
     * Required: Project OWNER/MANAGER or Company OWNER/ADMIN
     */
    @PostMapping("/{ruleId}/toggle")
    public ResponseEntity<AutomationRuleDTO> toggleRule(
            @PathVariable Long ruleId,
            @AuthenticationPrincipal User currentUser) {
        AutomationRuleDTO rule = automationService.getRuleById(ruleId);
        validateWriteAccess(rule.getProjectId(), currentUser);
        return ResponseEntity.ok(automationService.toggleRule(ruleId));
    }

    /**
     * Delete a rule
     * DELETE /api/automations/{ruleId}
     * Required: Project OWNER/MANAGER or Company OWNER/ADMIN
     */
    @DeleteMapping("/{ruleId}")
    public ResponseEntity<Void> deleteRule(
            @PathVariable Long ruleId,
            @AuthenticationPrincipal User currentUser) {
        AutomationRuleDTO rule = automationService.getRuleById(ruleId);
        validateWriteAccess(rule.getProjectId(), currentUser);
        automationService.deleteRule(ruleId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get execution logs for a rule
     * GET /api/automations/{ruleId}/logs
     * Required: Project member (read-only access)
     */
    @GetMapping("/{ruleId}/logs")
    public ResponseEntity<Page<AutomationLogDTO>> getRuleLogs(
            @PathVariable Long ruleId,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        AutomationRuleDTO rule = automationService.getRuleById(ruleId);
        validateReadAccess(rule.getProjectId(), currentUser);
        return ResponseEntity.ok(automationService.getRuleLogs(ruleId, pageable));
    }

    // ==================== PERMISSION HELPERS ====================

    /**
     * Validate user has READ access (is a project member)
     */
    private void validateReadAccess(Long projectId, User currentUser) {
        // Company OWNER/ADMIN can always read
        if (accessControlService.isOwnerOrAdmin()) {
            return;
        }

        // Must be a project member
        if (!projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, currentUser.getUserId())
                .isPresent()) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án này");
        }
    }

    /**
     * Validate user has WRITE access (Project OWNER/MANAGER or Company OWNER/ADMIN)
     */
    private void validateWriteAccess(Long projectId, User currentUser) {
        // Company OWNER/ADMIN can always write
        if (accessControlService.isOwnerOrAdmin()) {
            return;
        }

        // Must be project OWNER or MANAGER
        var membership = projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, currentUser.getUserId())
                .orElseThrow(() -> new ForbiddenException("Bạn không có quyền truy cập dự án này"));

        if (!membership.canManageProject()) {
            throw new ForbiddenException("Chỉ Owner hoặc Manager của dự án mới có thể quản lý automation rules");
        }
    }
}
