package DoAn.BE.ai.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIChatRequest;
import DoAn.BE.ai.dto.AIChatRequest.AIActionType;
import DoAn.BE.ai.dto.AIChatResponse;
import DoAn.BE.ai.dto.AIConversationDTO;
import DoAn.BE.ai.service.AIActionExecutor;
import DoAn.BE.ai.service.AIProjectAssistantService;
import DoAn.BE.ai.service.GeminiService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST Controller cho AI ChatBot Assistant
 * Cung cấp các endpoint cho chức năng AI giống Notion AI
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:4200", "http://localhost:5173"})
public class AIController {
    
    private final AIProjectAssistantService aiService;
    private final GeminiService geminiService;
    private final AIActionExecutor actionExecutor;
    private final UserRepository userRepository;
    
    /**
     * Kiểm tra AI service status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        boolean isAvailable = geminiService.isAvailable();
        return ResponseEntity.ok(Map.of(
                "available", isAvailable,
                "message", isAvailable 
                        ? "AI Assistant (Gemini) đang hoạt động" 
                        : "AI Assistant chưa được cấu hình. Vui lòng thiết lập GEMINI_API_KEY."
        ));
    }
    
    /**
     * Chat với AI Assistant
     */
    @PostMapping("/chat")
    public ResponseEntity<AIChatResponse> chat(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AIChatRequest request) {
        
        Long userId = getCurrentUserId(userDetails);
        log.info("User {} sending chat message, projectId: {}, action: {}", 
                userId, request.getProjectId(), request.getActionType());
        
        AIChatResponse response = aiService.chat(userId, request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Quick action - Tóm tắt dự án
     */
    @PostMapping("/projects/{projectId}/summarize")
    public ResponseEntity<AIChatResponse> summarizeProject(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {
        
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.SUMMARIZE_PROJECT);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Quick action - Tóm tắt sprint hiện tại
     */
    @PostMapping("/projects/{projectId}/summarize-sprint")
    public ResponseEntity<AIChatResponse> summarizeSprint(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {
        
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.SUMMARIZE_SPRINT);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Quick action - Gợi ý công việc ưu tiên
     */
    @PostMapping("/projects/{projectId}/suggest-tasks")
    public ResponseEntity<AIChatResponse> suggestTasks(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {
        
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.SUGGEST_TASKS);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Quick action - Phân tích tiến độ
     */
    @PostMapping("/projects/{projectId}/analyze")
    public ResponseEntity<AIChatResponse> analyzeProgress(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {
        
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.ANALYZE_PROGRESS);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Quick action - Tạo báo cáo
     */
    @PostMapping("/projects/{projectId}/report")
    public ResponseEntity<AIChatResponse> generateReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long projectId) {
        
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, projectId, AIActionType.GENERATE_REPORT);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Lấy danh sách conversations của user
     */
    @GetMapping("/conversations")
    public ResponseEntity<Page<AIConversationDTO>> getConversations(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Long userId = getCurrentUserId(userDetails);
        Page<AIConversationDTO> conversations = aiService.getConversations(userId, page, size);
        return ResponseEntity.ok(conversations);
    }
    
    /**
     * Lấy chi tiết một conversation với tất cả messages
     */
    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<AIConversationDTO> getConversation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String conversationId) {
        
        Long userId = getCurrentUserId(userDetails);
        AIConversationDTO conversation = aiService.getConversation(conversationId, userId);
        return ResponseEntity.ok(conversation);
    }
    
    /**
     * Xóa một conversation
     */
    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Map<String, String>> deleteConversation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String conversationId) {
        
        Long userId = getCurrentUserId(userDetails);
        aiService.deleteConversation(conversationId, userId);
        return ResponseEntity.ok(Map.of("message", "Conversation deleted successfully"));
    }
    
    /**
     * Hiển thị hướng dẫn sử dụng AI Assistant
     */
    @GetMapping("/help")
    public ResponseEntity<AIChatResponse> getHelp(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        Long userId = getCurrentUserId(userDetails);
        AIChatResponse response = aiService.quickAction(userId, null, AIActionType.HELP);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Thực thi một action từ AI (tạo project, task, sprint...)
     */
    @PostMapping("/actions/execute")
    public ResponseEntity<AIActionDTO> executeAction(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AIActionDTO action) {
        
        Long userId = getCurrentUserId(userDetails);
        log.info("User {} executing AI action: {}", userId, action.getActionType());
        
        AIActionDTO result = actionExecutor.executeAction(action, userId);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Thực thi nhiều actions cùng lúc
     */
    @PostMapping("/actions/execute-batch")
    public ResponseEntity<List<AIActionDTO>> executeBatchActions(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody List<AIActionDTO> actions) {
        
        Long userId = getCurrentUserId(userDetails);
        log.info("User {} executing {} AI actions", userId, actions.size());
        
        List<AIActionDTO> results = actions.stream()
                .map(action -> actionExecutor.executeAction(action, userId))
                .toList();
        
        return ResponseEntity.ok(results);
    }
    
    // ==================== Helper Methods ====================
    
    /**
     * Lấy User ID từ Security Context
     * JWT Filter đặt User entity làm principal, không phải UserDetails
     */
    private Long getCurrentUserId(UserDetails userDetails) {
        // Thử lấy từ SecurityContext trước (đây là cách JWT filter hoạt động)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null) {
            Object principal = auth.getPrincipal();
            
            // JWT filter đặt User entity làm principal
            if (principal instanceof User) {
                return ((User) principal).getUserId();
            }
            
            // Fallback: nếu là UserDetails
            if (principal instanceof UserDetails) {
                String username = ((UserDetails) principal).getUsername();
                return userRepository.findByUsername(username)
                        .map(User::getUserId)
                        .orElseThrow(() -> new RuntimeException("User not found"));
            }
            
            // Fallback: nếu là String (username)
            if (principal instanceof String && !"anonymousUser".equals(principal)) {
                String username = (String) principal;
                return userRepository.findByUsername(username)
                        .map(User::getUserId)
                        .orElseThrow(() -> new RuntimeException("User not found: " + username));
            }
        }
        
        // Thử từ @AuthenticationPrincipal (có thể null)
        if (userDetails != null) {
            return userRepository.findByUsername(userDetails.getUsername())
                    .map(User::getUserId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }
        
        log.error("Cannot get current user. Auth: {}, Principal: {}", 
                auth, auth != null ? auth.getPrincipal() : "null");
        throw new RuntimeException("Không thể xác định người dùng. Vui lòng đăng nhập lại.");
    }
    
    // ==================== Exception Handlers ====================
    
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        log.error("AI Controller error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "error", true,
                        "message", ex.getMessage(),
                        "timestamp", java.time.LocalDateTime.now().toString()
                ));
    }
}
