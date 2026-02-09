package DoAn.BE.workspace.controller;

import DoAn.BE.user.entity.User;
import DoAn.BE.workspace.dto.WorkspaceDto;
import DoAn.BE.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller API cho Workspace management
 */
@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
@Slf4j
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    /**
     * Lấy tất cả workspaces của user (Personal + Company memberships)
     */
    @GetMapping("")
    public ResponseEntity<List<WorkspaceDto.WorkspaceResponse>> getAllWorkspaces(
            @AuthenticationPrincipal User currentUser) {
        log.info("📥 API /workspaces called for user: {} (ID: {})", currentUser.getUsername(), currentUser.getUserId());
        var result = workspaceService.getAllWorkspaces(currentUser);
        log.info("📤 API returning {} workspaces", result.size());
        return ResponseEntity.ok(result);
    }

    /**
     * Lấy thông tin Personal Workspace
     */
    @GetMapping("/personal")
    public ResponseEntity<WorkspaceDto.PersonalWorkspaceResponse> getPersonalWorkspace(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workspaceService.getPersonalWorkspace(currentUser));
    }

    /**
     * Kiểm tra và tạo Personal Workspace nếu chưa có (cho users cũ)
     */
    @PostMapping("/personal/ensure")
    public ResponseEntity<WorkspaceDto.PersonalWorkspaceResponse> ensurePersonalWorkspace(
            @AuthenticationPrincipal User currentUser) {
        workspaceService.createPersonalWorkspaceIfNotExists(currentUser);
        return ResponseEntity.ok(workspaceService.getPersonalWorkspace(currentUser));
    }
}
