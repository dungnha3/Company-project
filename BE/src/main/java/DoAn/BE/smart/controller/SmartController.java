package DoAn.BE.smart.controller;

import DoAn.BE.smart.dto.*;
import DoAn.BE.smart.service.SmartAssistantService;
import DoAn.BE.user.entity.User;
import DoAn.BE.project.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/smart")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SmartController {

    private final SmartAssistantService smartAssistantService;
    private final ProjectMemberRepository projectMemberRepository;

    private void validateProjectAccess(Long projectId, User currentUser) {
        if (projectId == null) {
            throw new DoAn.BE.common.exception.BadRequestException("Mã dự án không được để trống");
        }
        if (currentUser.isSystemAdminAccount()) {
            return;
        }
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, currentUser.getUserId())
                .orElseThrow(() -> new DoAn.BE.common.exception.ForbiddenException(
                        "Bạn không có quyền truy cập dự án này"));
    }

    @PostMapping("/chat")
    public ResponseEntity<SmartChatResponse> chat(
            @RequestBody SmartChatRequest request,
            @AuthenticationPrincipal User currentUser) {
        validateProjectAccess(request.getProjectId(), currentUser);
        SmartChatResponse response = smartAssistantService.generateResponse(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/insights")
    public ResponseEntity<SmartInsightResponse> getInsights(
            @RequestParam Long projectId,
            @AuthenticationPrincipal User currentUser) {
        validateProjectAccess(projectId, currentUser);
        SmartInsightResponse response = smartAssistantService.generateProactiveInsight(projectId);
        return ResponseEntity.ok(response);
    }
}
