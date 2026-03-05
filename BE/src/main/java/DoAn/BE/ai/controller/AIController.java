package DoAn.BE.ai.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIChatRequest;
import DoAn.BE.ai.dto.AIChatRequest.AIActionType;
import DoAn.BE.ai.dto.AIChatResponse;
import DoAn.BE.ai.dto.AIConversationDTO;
import DoAn.BE.ai.service.AIActionExecutor;
import DoAn.BE.ai.service.AIProjectAssistantService;
import DoAn.BE.ai.service.GeminiService;
import DoAn.BE.common.annotation.FeatureFlag;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// REST Controller cho AI ChatBot Assistant
// Cung cấp các endpoint cho chức năng AI giống Notion AI
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@FeatureFlag("AI")
@Transactional(readOnly = true)
public class AIController {

    private final AIProjectAssistantService aiService;
    private final GeminiService geminiService;
    private final AIActionExecutor actionExecutor;
    private final UserRepository userRepository;
    private final AccessControlService accessControlService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        boolean isAvailable = geminiService.isAvailable();
        return ResponseEntity.ok(Map.of(
                "available", isAvailable,
                "message", isAvailable
                        ? "AI Assistant (Gemini) đang hoạt động"
                        : "AI Assistant chưa được cấu hình. Vui lòng thiết lập GEMINI_API_KEY."));
    }

    // Chat với AI Assistant
    @PostMapping("/chat")
    public ResponseEntity<AIChatResponse> chat(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AIChatRequest request) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        log.info("User {} sending chat message, projectId: {}, action: {}",
                userId, request.getProjectId(), request.getActionType());

        AIChatResponse response = aiService.chat(userId, request);
        return ResponseEntity.ok(response);
    }

    // Quick action - Tóm tắt dự án
    @PostMapping("/projects/{projectId}/summarize")
    public ResponseEntity<AIChatResponse> summarizeProject(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.SUMMARIZE_PROJECT);
        return ResponseEntity.ok(response);
    }

    // Quick action - Tóm tắt sprint hiện tại
    @PostMapping("/projects/{projectId}/summarize-sprint")
    public ResponseEntity<AIChatResponse> summarizeSprint(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.SUMMARIZE_SPRINT);
        return ResponseEntity.ok(response);
    }

    // Quick action - Gợi ý công việc ưu tiên
    @PostMapping("/projects/{projectId}/suggest-tasks")
    public ResponseEntity<AIChatResponse> suggestTasks(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.SUGGEST_TASKS);
        return ResponseEntity.ok(response);
    }

    // Quick action - Phân tích tiến độ
    @PostMapping("/projects/{projectId}/analyze")
    public ResponseEntity<AIChatResponse> analyzeProgress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.ANALYZE_PROGRESS);
        return ResponseEntity.ok(response);
    }

    // Quick action - Tạo báo cáo
    @PostMapping("/projects/{projectId}/report")
    public ResponseEntity<AIChatResponse> generateReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.GENERATE_REPORT);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/conversations")
    public ResponseEntity<Page<AIConversationDTO>> getConversations(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        Page<AIConversationDTO> conversations = aiService.getConversations(userId, page, size);
        return ResponseEntity.ok(conversations);
    }

    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<AIConversationDTO> getConversation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String conversationId) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        AIConversationDTO conversation = aiService.getConversation(conversationId, userId);
        return ResponseEntity.ok(conversation);
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Map<String, String>> deleteConversation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String conversationId) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        aiService.deleteConversation(conversationId, userId);
        return ResponseEntity.ok(Map.of("message", "Conversation deleted successfully"));
    }

    // Hiển thị hướng dẫn sử dụng AI Assistant
    @GetMapping("/help")
    public ResponseEntity<AIChatResponse> getHelp(
            @AuthenticationPrincipal UserDetails userDetails) {

        accessControlService.checkAiChatPermission();
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, null, AIActionType.HELP);
        return ResponseEntity.ok(response);
    }

    // Thực thi một action từ AI (tạo project, task, sprint...)
    @PostMapping("/actions/execute")
    public ResponseEntity<AIActionDTO> executeAction(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AIActionDTO action) {

        accessControlService.checkAiCreateIssuesPermission();
        Long userId = getCurrentUserId(userDetails);
        log.info("User {} executing AI action: {}", userId, action.getActionType());

        AIActionDTO result = actionExecutor.executeAction(action, userId);
        return ResponseEntity.ok(result);
    }

    // Thực thi nhiều actions cùng lúc
    @PostMapping("/actions/execute-batch")
    public ResponseEntity<List<AIActionDTO>> executeBatchActions(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody List<AIActionDTO> actions) {

        accessControlService.checkAiCreateIssuesPermission();
        Long userId = getCurrentUserId(userDetails);
        log.info("User {} executing {} AI actions", userId, actions.size());

        List<AIActionDTO> results = actions.stream()
                .map(action -> actionExecutor.executeAction(action, userId))
                .toList();

        return ResponseEntity.ok(results);
    }

    // JWT Filter đặt User entity làm principal
    private Long getCurrentUserId(UserDetails userDetails) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof User) {
            return ((User) auth.getPrincipal()).getUserId();
        }

        if (userDetails != null) {
            return userRepository.findByUsername(userDetails.getUsername())
                    .map(User::getUserId)
                    .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("User not found"));
        }

        throw new DoAn.BE.common.exception.ForbiddenException("Không thể xác định người dùng. Vui lòng đăng nhập lại.");
    }
}
