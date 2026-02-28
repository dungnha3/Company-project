package DoAn.BE.ai.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIChatRequest;
import DoAn.BE.ai.dto.AIChatRequest.AIActionType;
import DoAn.BE.ai.dto.AIChatResponse;
import DoAn.BE.ai.dto.AIChatResponse.*;
import DoAn.BE.ai.dto.AIConversationDTO;
import DoAn.BE.ai.dto.AIConversationDTO.AIMessageDTO;
import DoAn.BE.ai.dto.ProjectContextDTO;
import DoAn.BE.ai.entity.AIConversation;
import DoAn.BE.ai.entity.AIMessage;
import DoAn.BE.ai.repository.AIConversationRepository;
import DoAn.BE.ai.service.GeminiService.GeminiResponse;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Tương tự như Notion AI - hỗ trợ quản lý dự án thông minh
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AIProjectAssistantService {

    private final GeminiService geminiService;
    private final ProjectContextService projectContextService;
    private final AIConversationRepository conversationRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AIActionParser actionParser;

    // System prompt cho AI Assistant
    private static final String BASE_SYSTEM_PROMPT = """
                        Bạn là AI Assistant chuyên hỗ trợ quản lý dự án trong hệ thống Enterprise Management System.
                        Bạn có khả năng như Notion AI, giúp người dùng:

                        ## CHỨC NĂNG CHÍNH:
                        1. **Tóm tắt dự án**: Tóm tắt tình trạng, tiến độ, các vấn đề nổi bật của dự án
                        2. **Phân tích tiến độ**: Đánh giá sprint, đo lường hiệu suất team
                        3. **Gợi ý công việc**: Đề xuất các task tiếp theo dựa trên backlog và ưu tiên
                        4. **Brainstorm**: Hỗ trợ brainstorm ý tưởng cho features, giải pháp kỹ thuật
                        5. **Viết mô tả**: Giúp viết mô tả task, acceptance criteria, user stories
                        6. **Báo cáo**: Tạo báo cáo tổng kết sprint, status update cho stakeholders
                        7. **Giải đáp**: Trả lời các câu hỏi về dự án, workflow, best practices

                        ## QUẢN LÝ DỰ ÁN TỰ ĐỘNG:
                        Bạn có thể TỰ ĐỘNG thực hiện các hành động sau khi user yêu cầu:
                        - **Tạo dự án mới**: Khi user nói "tạo dự án", "create project"
                        - **Tạo task/issue**: Khi user nói "tạo task", "thêm công việc"
                        - **Tạo sprint**: Khi user nói "tạo sprint", "bắt đầu sprint mới"
                        - **Gợi ý danh sách tasks**: Liệt kê các task gợi ý dưới dạng bullet points

                        ## THIẾT LẬP DỰ ÁN HOÀN CHỈNH:
                        Khi user yêu cầu "tạo dự án hoàn chỉnh", "thiết lập dự án với tasks", "tự động tạo dự án và giao việc":
                        1. Tạo dự án mới với tên và mô tả phù hợp
                        2. Chia công việc thành 3 GIAI ĐOẠN (Sprint):
                           - **Sprint 1: Khởi động & Thiết kế** - Phân tích, thiết kế, chuẩn bị môi trường
                           - **Sprint 2: Phát triển chức năng chính** - Coding, tích hợp APIs, features core
                           - **Sprint 3: Hoàn thiện & Kiểm thử** - Testing, bug fixing, deployment
                        3. Thêm thành viên vào dự án
                        4. Tự động phân công tasks cho các thành viên

                        Khi gợi ý tasks cho dự án, PHẢI chia theo Sprint, format như sau:

                        ### 🏃 Sprint 1: Khởi động & Thiết kế (2 tuần)

            // *Công việc 1: [Tên task]**
                        - Mô tả: [Mô tả chi tiết]
                        - Thời gian ước tính: [X] giờ
                        - Ưu tiên: HIGH

                        ### 🏃 Sprint 2: Phát triển chức năng chính (2 tuần)

            // *Công việc X: [Tên task]**
                        ...

                        ### 🏃 Sprint 3: Hoàn thiện & Kiểm thử (2 tuần)

            // *Công việc Y: [Tên task]**
                        ...

                        Khi user yêu cầu tạo mới, hãy:
                        1. Xác nhận thông tin cần thiết (tên, mô tả, độ ưu tiên...)
                        2. Đề xuất các tasks/sprints phù hợp nếu cần
                        3. Hỏi xác nhận trước khi tạo

                        ## QUY TẮC:
                        - Luôn trả lời bằng tiếng Việt (trừ thuật ngữ kỹ thuật)
                        - Sử dụng Markdown formatting (bullets, headers, bold, code blocks)
                        - Đưa ra câu trả lời ngắn gọn, đi thẳng vào vấn đề
                        - Khi không chắc chắn, hãy hỏi lại để làm rõ
                        - Dựa vào context dự án được cung cấp để trả lời chính xác
                        - Khi gợi ý tasks, LUÔN chia thành các Sprint/giai đoạn
                        """;

    // Xử lý chat request từ user
    public AIChatResponse chat(Long userId, AIChatRequest request) {
        long startTime = System.currentTimeMillis();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("User not found"));

        // Lấy hoặc tạo conversation
        AIConversation conversation = getOrCreateConversation(request, user);

        // Build system prompt với context
        String systemPrompt = buildSystemPrompt(request.getProjectId(), request.getActionType());

        // Lấy conversation history
        List<AIMessage> history = conversation.getMessages();

        // Parse user message để detect action intents
        List<AIActionDTO> detectedActions = actionParser.parseUserMessage(
                request.getMessage(), request.getProjectId());

        // Gọi Gemini API
        GeminiResponse result = geminiService.chat(systemPrompt, history, request.getMessage());
        String responseContent = result.getContent();
        Integer tokensUsed = result.getTokensUsed();

        long responseTime = System.currentTimeMillis() - startTime;

        // Parse AI response để tìm thêm actions
        List<AIActionDTO> aiSuggestedActions = actionParser.parseAIResponse(
                responseContent, request.getProjectId());

        // Merge actions
        List<AIActionDTO> allActions = new ArrayList<>();
        allActions.addAll(detectedActions);
        allActions.addAll(aiSuggestedActions);

        // Lưu user message
        AIMessage userMessage = AIMessage.builder()
                .conversation(conversation)
                .role("user")
                .content(request.getMessage())
                .actionType(request.getActionType().name())
                .build();
        conversation.addMessage(userMessage);

        // Lưu assistant response
        AIMessage assistantMessage = AIMessage.builder()
                .conversation(conversation)
                .role("assistant")
                .content(responseContent)
                .actionType(request.getActionType().name())
                .tokensUsed(tokensUsed)
                .modelUsed(geminiService.isAvailable() ? "gemini-2.0-flash" : "mock")
                .responseTimeMs(responseTime)
                .build();
        conversation.addMessage(assistantMessage);

        // Auto-generate title nếu chưa có
        if (conversation.getTitle() == null) {
            conversation.generateTitleFromFirstMessage();
        }

        // Save conversation
        conversationRepository.save(conversation);

        // Build response
        return AIChatResponse.builder()
                .conversationId(conversation.getConversationUuid())
                .message(responseContent)
                .formattedMessage(responseContent)
                .timestamp(LocalDateTime.now())
                .responseType(ResponseType.MARKDOWN)
                .suggestedActions(generateSuggestedActions(request.getActionType()))
                .executableActions(allActions.isEmpty() ? null : allActions)
                .metadata(AIMetadata.builder()
                        .model("gemini-2.0-flash")
                        .tokensUsed(tokensUsed)
                        .responseTimeMs(responseTime)
                        .contextUsed(request.getProjectId() != null ? "project-context" : "general")
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<AIConversationDTO> getConversations(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AIConversation> conversations = conversationRepository
                .findByUser_UserIdAndIsActiveTrueOrderByLastMessageAtDesc(userId, pageable);

        return conversations.map(this::toConversationDTO);
    }

    @Transactional(readOnly = true)
    public AIConversationDTO getConversation(String conversationUuid, Long userId) {
        AIConversation conversation = conversationRepository
                .findByConversationUuidWithMessages(conversationUuid)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Conversation not found"));

        // Verify user owns this conversation
        if (!conversation.getUser().getUserId().equals(userId)) {
            throw new DoAn.BE.common.exception.ForbiddenException("Access denied");
        }

        return toConversationDTOWithMessages(conversation);
    }

    public void deleteConversation(String conversationUuid, Long userId) {
        AIConversation conversation = conversationRepository
                .findByConversationUuid(conversationUuid)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Conversation not found"));

        if (!conversation.getUser().getUserId().equals(userId)) {
            throw new DoAn.BE.common.exception.ForbiddenException("Access denied");
        }

        conversation.setIsActive(false);
        conversationRepository.save(conversation);
    }

    // Quick actions - các hành động nhanh
    public AIChatResponse quickAction(Long userId, Long projectId, AIActionType actionType) {
        String message = switch (actionType) {
            case SUMMARIZE_PROJECT -> "Hãy tóm tắt tình trạng hiện tại của dự án này";
            case SUMMARIZE_SPRINT -> "Hãy tóm tắt tiến độ sprint hiện tại";
            case SUGGEST_TASKS -> "Dựa vào backlog, hãy gợi ý các công việc ưu tiên tiếp theo";
            case ANALYZE_PROGRESS -> "Hãy phân tích tiến độ dự án và đưa ra đánh giá";
            case GENERATE_REPORT -> "Hãy tạo báo cáo status update cho stakeholders";
            case HELP -> "Hãy giới thiệu các tính năng AI Assistant hỗ trợ quản lý dự án";
            default -> "Xin chào! Tôi có thể giúp gì cho bạn?";
        };

        AIChatRequest request = new AIChatRequest();
        request.setMessage(message);
        request.setProjectId(projectId);
        request.setActionType(actionType);

        return chat(userId, request);
    }

    private AIConversation getOrCreateConversation(AIChatRequest request, User user) {
        if (request.getConversationId() != null && !request.getConversationId().isEmpty()) {
            AIConversation existing = conversationRepository.findByConversationUuid(request.getConversationId())
                    .orElse(null);
            if (existing != null && existing.getUser().getUserId().equals(user.getUserId())) {
                return existing;
            }
            // If not found or not owned by user, create new
        }
        return createNewConversation(user, request.getProjectId());
    }

    private AIConversation createNewConversation(User user, Long projectId) {
        AIConversation conversation = new AIConversation();
        conversation.setConversationUuid(UUID.randomUUID().toString());
        conversation.setUser(user);
        conversation.setIsActive(true);
        conversation.setMessages(new ArrayList<>());

        if (projectId != null) {
            projectRepository.findById(projectId).ifPresent(conversation::setProject);
        }

        return conversationRepository.save(conversation);
    }

    private String buildSystemPrompt(Long projectId, AIActionType actionType) {
        StringBuilder prompt = new StringBuilder(BASE_SYSTEM_PROMPT);

        // Add project context if available
        if (projectId != null) {
            try {
                ProjectContextDTO context = projectContextService.getProjectContext(projectId);
                String contextSummary = projectContextService.buildContextSummary(context);
                prompt.append("\n\n=== CONTEXT DỰ ÁN HIỆN TẠI ===\n");
                prompt.append(contextSummary);
            } catch (Exception e) {
                log.warn("Could not load project context: {}", e.getMessage());
            }
        }

        // Add action-specific instructions
        prompt.append("\n\n=== HƯỚNG DẪN CHO HÀNH ĐỘNG: ").append(actionType.name()).append(" ===\n");
        prompt.append(getActionInstructions(actionType));

        return prompt.toString();
    }

    private String getActionInstructions(AIActionType actionType) {
        return switch (actionType) {
            case SUMMARIZE_PROJECT -> """
                    Tóm tắt ngắn gọn tình trạng dự án bao gồm:
                    - Tiến độ tổng thể (% hoàn thành)
                    - Các milestone/sprint quan trọng
                    - Vấn đề nổi bật cần chú ý
                    - Recommendation tiếp theo
                    """;
            case SUMMARIZE_SPRINT -> """
                    Tóm tắt sprint hiện tại:
                    - Mục tiêu sprint
                    - Tiến độ (issues hoàn thành/tổng)
                    - Burndown status
                    - Blockers nếu có
                    """;
            case SUGGEST_TASKS -> """
                    Dựa vào context, đề xuất:
                    - 3-5 công việc ưu tiên cao cần làm tiếp
                    - Lý do ưu tiên
                    - Ai nên được assign (nếu rõ)
                    """;
            case ANALYZE_PROGRESS -> """
                    Phân tích chi tiết:
                    - Velocity của team
                    - Bottlenecks
                    - Risk assessment
                    - Recommendations để cải thiện
                    """;
            case GENERATE_REPORT -> """
                    Tạo báo cáo professional cho stakeholders:
                    - Executive summary
                    - Achievements
                    - Challenges
                    - Next steps
                    - Timeline outlook
                    """;
            case BRAINSTORM -> """
                    Hỗ trợ brainstorm:
                    - Đưa ra nhiều ý tưởng sáng tạo
                    - Đánh giá pros/cons
                    - Suggest cách implement
                    """;
            case CREATE_ISSUE -> """
                    Giúp tạo issue/task:
                    - Viết title rõ ràng
                    - Mô tả chi tiết
                    - Acceptance criteria
                    - Story points estimate
                    """;
            case HELP -> """
                    Giới thiệu các tính năng:
                    - Tóm tắt dự án
                    - Phân tích tiến độ
                    - Gợi ý công việc
                    - Brainstorm
                    - Tạo báo cáo
                    """;
            default -> "Trả lời câu hỏi của user một cách helpful và chính xác.";
        };
    }

    private List<SuggestedAction> generateSuggestedActions(AIActionType currentAction) {
        List<SuggestedAction> actions = new ArrayList<>();

        if (currentAction != AIActionType.SUMMARIZE_PROJECT) {
            actions.add(SuggestedAction.builder()
                    .label("📊 Tóm tắt dự án")
                    .actionType("SUMMARIZE_PROJECT")
                    .actionPayload(null)
                    .build());
        }

        if (currentAction != AIActionType.SUGGEST_TASKS) {
            actions.add(SuggestedAction.builder()
                    .label("💡 Gợi ý công việc")
                    .actionType("SUGGEST_TASKS")
                    .actionPayload(null)
                    .build());
        }

        if (currentAction != AIActionType.ANALYZE_PROGRESS) {
            actions.add(SuggestedAction.builder()
                    .label("📈 Phân tích tiến độ")
                    .actionType("ANALYZE_PROGRESS")
                    .actionPayload(null)
                    .build());
        }

        return actions;
    }

    private AIConversationDTO toConversationDTO(AIConversation conversation) {
        return AIConversationDTO.builder()
                .conversationId(conversation.getConversationUuid())
                .userId(conversation.getUser().getUserId())
                .username(conversation.getUser().getUsername())
                .projectId(conversation.getProject() != null ? conversation.getProject().getProjectId() : null)
                .projectName(conversation.getProject() != null ? conversation.getProject().getName() : null)
                .title(conversation.getTitle())
                .createdAt(conversation.getCreatedAt())
                .lastMessageAt(conversation.getLastMessageAt())
                .messageCount(conversation.getMessageCount())
                .build();
    }

    private AIConversationDTO toConversationDTOWithMessages(AIConversation conversation) {
        AIConversationDTO dto = toConversationDTO(conversation);

        List<AIMessageDTO> messageDTOs = conversation.getMessages().stream()
                .map(msg -> AIMessageDTO.builder()
                        .messageId(msg.getId())
                        .role(msg.getRole())
                        .content(msg.getContent())
                        .timestamp(msg.getCreatedAt())
                        .actionType(msg.getActionType())
                        .build())
                .toList();

        dto.setMessages(messageDTOs);
        return dto;
    }
}
