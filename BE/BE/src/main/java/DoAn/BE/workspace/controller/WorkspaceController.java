package DoAn.BE.workspace.controller;

import DoAn.BE.user.entity.User;
import DoAn.BE.workspace.dto.WorkspaceDto;
import DoAn.BE.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
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
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    /**
     * Lấy tất cả workspaces của user (Personal + Company memberships)
     */
    @GetMapping("")
    public ResponseEntity<List<WorkspaceDto.WorkspaceResponse>> getAllWorkspaces(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workspaceService.getAllWorkspaces(currentUser));
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
