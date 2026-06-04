package DoAn.BE.smart.service;

import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.smart.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;

import java.util.*;

@Service
@Slf4j
public class SmartAssistantService {

    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final SprintRepository sprintRepository;
    private final WorkloadAnalysisService workloadAnalysisService;
    private final ProjectRiskService projectRiskService;
    private final SprintHealthService sprintHealthService;
    private final RestTemplate restTemplate;

    @Value("${app.security.gemini.api-key:}")
    private String geminiApiKey;

    public SmartAssistantService(
            ProjectRepository projectRepository,
            IssueRepository issueRepository,
            ProjectMemberRepository projectMemberRepository,
            SprintRepository sprintRepository,
            WorkloadAnalysisService workloadAnalysisService,
            ProjectRiskService projectRiskService,
            SprintHealthService sprintHealthService,
            RestTemplateBuilder restTemplateBuilder) {
        this.projectRepository = projectRepository;
        this.issueRepository = issueRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.sprintRepository = sprintRepository;
        this.workloadAnalysisService = workloadAnalysisService;
        this.projectRiskService = projectRiskService;
        this.sprintHealthService = sprintHealthService;
        this.restTemplate = restTemplateBuilder.build();
    }

    public SmartChatResponse generateResponse(SmartChatRequest request) {
        try {
            if (geminiApiKey == null || geminiApiKey.isBlank()) {
                return SmartChatResponse.builder()
                        .text("AI Assistant chưa được cấu hình. Vui lòng thiết lập biến môi trường GEMINI_API_KEY trong file .env để bắt đầu trò chuyện.")
                        .build();
            }

            Long projectId = request.getProjectId();
            String systemInstruction = buildSystemInstruction(projectId);

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", request.getContents());

            Map<String, Object> systemInstructionMap = new HashMap<>();
            Map<String, Object> partMap = new HashMap<>();
            partMap.put("text", systemInstruction);
            systemInstructionMap.put("parts", List.of(partMap));
            requestBody.put("systemInstruction", systemInstructionMap);

            @SuppressWarnings("unchecked")
            Map<String, Object> responseMap = restTemplate.postForObject(url, requestBody, Map.class);
            String aiResponse = extractTextFromResponse(responseMap);
            return SmartChatResponse.builder().text(aiResponse).build();
        } catch (Exception e) {
            log.error("Failed to call Gemini API for project chat", e);
            return SmartChatResponse.builder()
                    .text("Xin lỗi, đã xảy ra lỗi khi kết nối với AI Assistant: " + e.getMessage() + ". Vui lòng liên hệ quản trị viên hoặc kiểm tra log.")
                    .build();
        }
    }

    public SmartInsightResponse generateProactiveInsight(Long projectId) {
        try {
            if (geminiApiKey == null || geminiApiKey.isBlank()) {
                return SmartInsightResponse.builder()
                        .insight("AI Assistant chưa được cấu hình. Vui lòng thiết lập GEMINI_API_KEY trong file .env.")
                        .build();
            }

            String projectContext = buildProjectSummaryContext(projectId);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

            String prompt = "Dựa trên dữ liệu tóm tắt dự án dưới đây:\n" +
                    "------------------\n" +
                    projectContext + "\n" +
                    "------------------\n" +
                    "Hãy đưa ra đúng 1 câu cảnh báo chủ động và ngắn gọn (khoảng 20-30 từ) về tình hình trễ hạn, quá tải nhân sự, hoặc rủi ro Sprint hiện tại để nhắc nhở người quản lý khi họ truy cập dashboard. Bạn phải nêu đích danh tên nhân sự hoặc chỉ ra rủi ro cụ thể nếu phát hiện vấn đề (ví dụ: quá tải, trễ deadline). Trả lời bằng tiếng Việt, giọng điệu chuyên nghiệp, chu đáo. Không viết thêm lời mở đầu hay giải thích gì khác.";

            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> contentMap = new HashMap<>();
            Map<String, Object> partMap = new HashMap<>();
            partMap.put("text", prompt);
            contentMap.put("role", "user");
            contentMap.put("parts", List.of(partMap));
            requestBody.put("contents", List.of(contentMap));

            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseMap = restTemplate.postForObject(url, requestBody, Map.class);
                String insightText = extractTextFromResponse(responseMap);
                return SmartInsightResponse.builder().insight(insightText.trim()).build();
            } catch (Exception e) {
                log.error("Failed to generate proactive insights from Gemini API", e);
                return SmartInsightResponse.builder()
                        .insight("Dự án hiện tại đang duy trì tiến độ bình thường. Không phát hiện rủi ro khẩn cấp.")
                        .build();
            }
        } catch (Exception e) {
            log.error("Failed to generate proactive insights context", e);
            return SmartInsightResponse.builder()
                    .insight("Dự án hiện tại đang duy trì tiến độ bình thường. Không phát hiện rủi ro khẩn cấp.")
                    .build();
        }
    }

    private String buildSystemInstruction(Long projectId) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là AI Project Assistant - trợ lý ảo quản lý dự án thông minh được tích hợp trực tiếp trong hệ thống.\n");
        sb.append("Dưới đây là thông tin chi tiết hiện tại của dự án giúp bạn trả lời các câu hỏi từ người dùng:\n\n");

        if (projectId != null) {
            sb.append(buildProjectSummaryContext(projectId));
        } else {
            sb.append("Hiện tại người dùng chưa chọn dự án cụ thể. Hãy hướng dẫn họ chọn một dự án trong danh sách để xem dữ liệu phân tích.\n");
        }

        sb.append("\n\nYÊU CẦU ĐỐI VỚI CÂU TRẢ LỜI CỦA BẠN:\n");
        sb.append("1. Đi thẳng vào trọng tâm câu hỏi của người dùng. Trả lời ngắn gọn, súc tích và có tính hành động cao.\n");
        sb.append("2. Nếu người dùng hỏi các câu hỏi như \"Ai đang ôm nhiều lỗi/công việc nhất?\", hãy thống kê cụ thể tên nhân sự đó cùng số lượng công việc họ đang nắm giữ từ dữ liệu được cung cấp.\n");
        sb.append("3. Giọng điệu chuyên nghiệp, thân thiện, mang tính hỗ trợ cao của một trợ lý ảo quản lý dự án.\n");
        sb.append("4. Chỉ trả lời dựa trên dữ liệu dự án thực tế đã cung cấp ở trên. Nếu không tìm thấy thông tin phù hợp, hãy thông báo lịch sự cho người dùng.");

        return sb.toString();
    }

    private String buildProjectSummaryContext(Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return "Không tìm thấy thông tin dự án có ID: " + projectId;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("[THÔNG TIN DỰ ÁN]\n");
        sb.append("Tên dự án: ").append(project.getName()).append("\n");
        sb.append("Mã dự án: ").append(project.getKeyProject()).append("\n");
        sb.append("Mô tả: ").append(project.getDescription() != null ? project.getDescription() : "Không có mô tả").append("\n\n");

        // Sprint Info
        sb.append("[SPRINT HIỆN TẠI]\n");
        Sprint activeSprint = sprintRepository.findFirstByProject_ProjectIdAndStatus(projectId, Sprint.SprintStatus.ACTIVE).orElse(null);
        if (activeSprint != null) {
            sb.append("Tên Sprint: ").append(activeSprint.getName()).append(" (Đang hoạt động)\n");
            sb.append("Thời gian: ").append(activeSprint.getStartDate() != null ? activeSprint.getStartDate() : "Chưa đặt").append(" đến ").append(activeSprint.getEndDate() != null ? activeSprint.getEndDate() : "Chưa đặt").append("\n");
            try {
                SprintHealthDTO health = sprintHealthService.getHealth(activeSprint.getSprintId());
                if (health != null) {
                    sb.append("Sức khỏe Sprint: ").append(health.getLabel()).append(" (").append(health.getHealthScore()).append(" điểm)\n");
                    sb.append("Tỷ lệ hoàn thành: ").append(health.getMetrics().getCompletionRate()).append("%\n");
                    sb.append("Số ngày còn lại: ").append(health.getSprint().getDaysRemaining()).append("\n");
                    sb.append("Khuyến nghị: ").append(health.getRecommendation()).append("\n");
                }
            } catch (Exception e) {
                sb.append("Sức khỏe Sprint: Không thể phân tích\n");
            }
        } else {
            sb.append("Dự án hiện tại không có Sprint nào đang hoạt động.\n");
        }
        sb.append("\n");

        // Workload Info
        sb.append("[PHÂN BỔ CÔNG VIỆC THÀNH VIÊN (WORKLOAD)]\n");
        try {
            WorkloadAnalysisDTO workload = workloadAnalysisService.getWorkload(projectId);
            if (workload != null && workload.getMembers() != null) {
                sb.append("Điểm cân bằng workload: ").append(workload.getBalanceScore()).append("/100\n");
                for (WorkloadAnalysisDTO.MemberWorkload mw : workload.getMembers()) {
                    sb.append("- ").append(mw.getFullName()).append(" (").append(mw.getUsername()).append("): ")
                            .append(mw.getActiveTasks()).append(" tasks đang làm, ")
                            .append("Tổng độ phức tạp: ").append(mw.getTotalWeight()).append(", ")
                            .append("Trạng thái tải: ").append(mw.getWorkloadLevel()).append("\n");
                }
            } else {
                sb.append("Không có dữ liệu thành viên.\n");
            }
        } catch (Exception e) {
            sb.append("Không thể lấy dữ liệu phân bổ công việc thành viên.\n");
        }
        sb.append("\n");

        // Risk Info
        sb.append("[ĐÁNH GIÁ RỦI RO DỰ ÁN]\n");
        try {
            ProjectRiskDTO risk = projectRiskService.getRisk(projectId);
            if (risk != null) {
                sb.append("Điểm rủi ro tổng quát: ").append(risk.getRiskScore()).append("/100 (Mức độ: ").append(risk.getLabel()).append(")\n");
                if (risk.getRiskFactors() != null && !risk.getRiskFactors().isEmpty()) {
                    sb.append("Yếu tố rủi ro phát hiện:\n");
                    for (ProjectRiskDTO.RiskFactor factor : risk.getRiskFactors()) {
                        sb.append("  + ").append(factor.getLabel()).append(" (").append(factor.getScore()).append(" điểm): ")
                                .append(factor.getDescription()).append(" (Mức độ: ").append(factor.getSeverity()).append(")\n");
                    }
                }
                if (risk.getRecommendations() != null) {
                    sb.append("Khuyến nghị của trợ lý ảo:\n");
                    for (String rec : risk.getRecommendations()) {
                        sb.append("  * ").append(rec).append("\n");
                    }
                }
            }
        } catch (Exception e) {
            sb.append("Không thể lấy dữ liệu đánh giá rủi ro dự án.\n");
        }
        sb.append("\n");

        // Issues List Info
        sb.append("[DANH SÁCH CÔNG VIỆC CHI TIẾT (ISSUES)]\n");
        List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);
        if (issues != null && !issues.isEmpty()) {
            for (Issue issue : issues) {
                sb.append("- [").append(issue.getIssueKey()).append("] ").append(issue.getTitle());
                sb.append(" (Độ ưu tiên: ").append(issue.getPriority() != null ? issue.getPriority().name() : "MEDIUM");
                sb.append(", Trạng thái: ").append(issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "To Do");
                sb.append(", Người thực hiện: ").append(issue.getAssignee() != null ? issue.getAssignee().getFullName() : "Chưa gán");
                sb.append(", Hạn chót: ").append(issue.getDueDate() != null ? issue.getDueDate().toString() : "Không có");
                if (issue.getEstimatedHours() != null) {
                    sb.append(", Ước lượng: ").append(issue.getEstimatedHours()).append("h");
                }
                if (issue.getActualHours() != null) {
                    sb.append(", Thực tế: ").append(issue.getActualHours()).append("h");
                }
                sb.append(")\n");
            }
        } else {
            sb.append("Chưa có công việc nào được tạo trong dự án này.\n");
        }

        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String extractTextFromResponse(Map<String, Object> responseMap) {
        try {
            if (responseMap != null && responseMap.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    if (content != null && content.containsKey("parts")) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            return (String) parts.get(0).get("text");
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Gemini response payload", e);
        }
        return "Không thể nhận phản hồi từ AI Assistant. Vui lòng kiểm tra lại cấu hình API.";
    }
}
