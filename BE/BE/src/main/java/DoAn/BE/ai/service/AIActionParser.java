package DoAn.BE.ai.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIActionDTO.ActionStatus;
import DoAn.BE.ai.dto.AIActionDTO.ActionType;
import lombok.extern.slf4j.Slf4j;

/**
 * Service phân tích response từ AI để trích xuất các action
 * Tìm các pattern như "tạo dự án", "tạo task", etc.
 */
@Service
@Slf4j
public class AIActionParser {

    // Patterns để detect intent tạo project
    private static final Pattern CREATE_PROJECT_PATTERN = Pattern.compile(
            "(?i)(tạo|create|khởi tạo|thêm)\\s*(dự án|project|prj)\\s*[\"']?([^\"'\\n]+)[\"']?",
            Pattern.UNICODE_CASE);

    // Patterns để detect intent tạo task
    private static final Pattern CREATE_TASK_PATTERN = Pattern.compile(
            "(?i)(tạo|create|thêm|add)\\s*(task|tác vụ|công việc|issue|việc)\\s*[\"']?([^\"'\\n]+)[\"']?",
            Pattern.UNICODE_CASE);

    // Pattern để detect intent tạo sprint
    private static final Pattern CREATE_SPRINT_PATTERN = Pattern.compile(
            "(?i)(tạo|create|khởi tạo|bắt đầu)\\s*(sprint)\\s*[\"']?([^\"'\\n]*)[\"']?",
            Pattern.UNICODE_CASE);

    // Pattern để detect intent thiết lập dự án hoàn chỉnh (project + tasks +
    // members + assign)
    private static final Pattern SETUP_PROJECT_COMPLETE_PATTERN = Pattern.compile(
            "(?i)(tạo|create|thiết lập|khởi tạo|setup)\\s*" +
                    "(dự án|project)\\s*" +
                    "(hoàn chỉnh|full|với (task|công việc|member|thành viên)|và (giao việc|phân công))" +
                    "|" +
                    "(?i)(tự động|auto)\\s*(tạo|setup|thiết lập)\\s*(dự án|project)",
            Pattern.UNICODE_CASE);

    // Pattern để detect công việc với tiêu đề (Công việc 1:, Task 1:, etc.)
    private static final Pattern TASK_TITLE_PATTERN = Pattern.compile(
            "(?i)(?:\\*\\*)?(?:công việc|task|tác vụ|việc)\\s*\\d*\\s*[:.]?\\s*(.+?)(?:\\*\\*)?$");

    // Pattern để detect metadata của task
    private static final Pattern TIME_PATTERN = Pattern.compile(
            "(?i)(?:thời gian|time|ước tính)[^:]*:\\s*(\\d+)\\s*(?:giờ|h|hour|ngày|day)?",
            Pattern.UNICODE_CASE);
    private static final Pattern PRIORITY_PATTERN = Pattern.compile(
            "(?i)(?:ưu tiên|priority|mức độ)[^:]*:\\s*(LOW|MEDIUM|HIGH|CRITICAL|thấp|trung bình|cao|khẩn cấp)",
            Pattern.UNICODE_CASE);
    private static final Pattern DEADLINE_PATTERN = Pattern.compile(
            "(?i)(?:hạn chót|deadline|hạn)[^:]*:\\s*(\\d+)\\s*(?:ngày|day)?",
            Pattern.UNICODE_CASE);
    private static final Pattern DESC_PATTERN = Pattern.compile(
            "(?i)(?:mô tả|description|desc)[^:]*:\\s*(.+)",
            Pattern.UNICODE_CASE);

    /**
     * Phân tích message từ user để detect action intent
     */
    public List<AIActionDTO> parseUserMessage(String message, Long projectId) {
        List<AIActionDTO> actions = new ArrayList<>();

        // Check for setup project complete intent (priority - check first)
        if (isSetupProjectCompleteRequest(message)) {
            actions.add(createSetupProjectCompleteAction(message));
            return actions; // Return early - this is a comprehensive action
        }

        // Check for project creation intent
        Matcher projectMatcher = CREATE_PROJECT_PATTERN.matcher(message);
        if (projectMatcher.find()) {
            String projectName = projectMatcher.group(3).trim();
            actions.add(createProjectAction(projectName, message));
        }

        // Check for task creation intent
        Matcher taskMatcher = CREATE_TASK_PATTERN.matcher(message);
        if (taskMatcher.find() && projectId != null) {
            String taskTitle = taskMatcher.group(3).trim();
            actions.add(createTaskAction(taskTitle, projectId, message));
        }

        // Check for sprint creation intent
        Matcher sprintMatcher = CREATE_SPRINT_PATTERN.matcher(message);
        if (sprintMatcher.find() && projectId != null) {
            String sprintName = sprintMatcher.group(3).trim();
            if (sprintName.isEmpty()) {
                sprintName = "Sprint mới";
            }
            actions.add(createSprintAction(sprintName, projectId));
        }

        return actions;
    }

    /**
     * Kiểm tra xem user có yêu cầu thiết lập dự án hoàn chỉnh không
     */
    public boolean isSetupProjectCompleteRequest(String message) {
        String lowerMessage = message.toLowerCase();

        // Check for explicit patterns
        if (SETUP_PROJECT_COMPLETE_PATTERN.matcher(message).find()) {
            return true;
        }

        // Check for implicit patterns
        boolean hasProject = lowerMessage.contains("dự án") || lowerMessage.contains("project");
        boolean hasTask = lowerMessage.contains("task") || lowerMessage.contains("công việc")
                || lowerMessage.contains("tác vụ");
        boolean hasMember = lowerMessage.contains("thành viên") || lowerMessage.contains("member")
                || lowerMessage.contains("giao việc") || lowerMessage.contains("phân công");
        boolean hasCreate = lowerMessage.contains("tạo") || lowerMessage.contains("create")
                || lowerMessage.contains("thiết lập") || lowerMessage.contains("setup");
        boolean hasAuto = lowerMessage.contains("tự động") || lowerMessage.contains("auto");

        // If user wants to create project with tasks AND (members OR assignment), it's
        // a complete setup
        if (hasCreate && hasProject && hasTask && hasMember) {
            return true;
        }

        // If user wants auto setup
        if (hasAuto && hasCreate && hasProject) {
            return true;
        }

        return false;
    }

    /**
     * Phân tích response từ AI để tìm các actions được gợi ý
     * AI có thể trả về JSON actions trong response
     */
    public List<AIActionDTO> parseAIResponse(String aiResponse, Long projectId) {
        List<AIActionDTO> actions = new ArrayList<>();

        // Tìm JSON action blocks trong response
        Pattern jsonPattern = Pattern.compile("```json\\s*\\{[^}]+\"actionType\"[^}]+\\}\\s*```", Pattern.DOTALL);
        Matcher jsonMatcher = jsonPattern.matcher(aiResponse);

        while (jsonMatcher.find()) {
            try {
                String jsonBlock = jsonMatcher.group()
                        .replace("```json", "")
                        .replace("```", "")
                        .trim();
                AIActionDTO action = parseJsonAction(jsonBlock, projectId);
                if (action != null) {
                    actions.add(action);
                }
            } catch (Exception e) {
                log.warn("Failed to parse AI action JSON: {}", e.getMessage());
            }
        }

        // Fallback: parse task list from response
        if (actions.isEmpty() && projectId != null) {
            List<Map<String, Object>> taskDataList = extractTaskListFromResponse(aiResponse);
            if (!taskDataList.isEmpty()) {
                actions.add(createMultipleTasksAction(taskDataList, projectId));
            }
        }

        return actions;
    }

    /**
     * Kiểm tra user message có yêu cầu tạo mới không
     */
    public boolean isCreateRequest(String message) {
        String lowerMessage = message.toLowerCase();
        return lowerMessage.contains("tạo") ||
                lowerMessage.contains("create") ||
                lowerMessage.contains("thêm") ||
                lowerMessage.contains("add") ||
                lowerMessage.contains("khởi tạo");
    }

    /**
     * Kiểm tra user message có yêu cầu liên quan đến project
     */
    public boolean isProjectRelated(String message) {
        String lowerMessage = message.toLowerCase();
        return lowerMessage.contains("dự án") ||
                lowerMessage.contains("project") ||
                lowerMessage.contains("prj");
    }

    /**
     * Kiểm tra user message có yêu cầu liên quan đến task
     */
    public boolean isTaskRelated(String message) {
        String lowerMessage = message.toLowerCase();
        return lowerMessage.contains("task") ||
                lowerMessage.contains("tác vụ") ||
                lowerMessage.contains("công việc") ||
                lowerMessage.contains("issue") ||
                lowerMessage.contains("việc");
    }

    // ==================== Private Helper Methods ====================

    /**
     * Tạo action thiết lập dự án hoàn chỉnh
     */
    private AIActionDTO createSetupProjectCompleteAction(String message) {
        Map<String, Object> data = new HashMap<>();

        // Try to extract project name from message
        Matcher projectMatcher = CREATE_PROJECT_PATTERN.matcher(message);
        String projectName = "Dự án mới";
        if (projectMatcher.find()) {
            projectName = projectMatcher.group(3).trim();
        }
        data.put("name", projectName);

        // Extract description if available
        String description = extractDescription(message, projectName);
        if (description != null) {
            data.put("description", description);
        }

        // Default settings
        data.put("memberCount", 3); // Default 3 members
        data.put("generateTasks", true); // AI will generate tasks

        return AIActionDTO.builder()
                .actionType(ActionType.SETUP_PROJECT_COMPLETE)
                .status(ActionStatus.PENDING)
                .data(data)
                .message(String.format("Bạn muốn tạo dự án \"%s\" với các công việc và thành viên tự động?",
                        projectName))
                .build();
    }

    private AIActionDTO createProjectAction(String name, String fullMessage) {
        Map<String, Object> data = new HashMap<>();
        data.put("name", name);

        // Try to extract description from message
        String description = extractDescription(fullMessage, name);
        if (description != null) {
            data.put("description", description);
        }

        return AIActionDTO.builder()
                .actionType(ActionType.CREATE_PROJECT)
                .status(ActionStatus.PENDING)
                .data(data)
                .message(String.format("Bạn muốn tạo dự án \"%s\"?", name))
                .build();
    }

    private AIActionDTO createTaskAction(String title, Long projectId, String fullMessage) {
        Map<String, Object> data = new HashMap<>();
        data.put("title", title);
        data.put("projectId", projectId);

        // Try to extract priority
        String priority = extractPriority(fullMessage);
        if (priority != null) {
            data.put("priority", priority);
        }

        return AIActionDTO.builder()
                .actionType(ActionType.CREATE_ISSUE)
                .status(ActionStatus.PENDING)
                .data(data)
                .message(String.format("Bạn muốn tạo task \"%s\"?", title))
                .build();
    }

    private AIActionDTO createSprintAction(String name, Long projectId) {
        Map<String, Object> data = new HashMap<>();
        data.put("name", name);
        data.put("projectId", projectId);
        data.put("durationDays", 14); // Default 2 weeks

        return AIActionDTO.builder()
                .actionType(ActionType.CREATE_SPRINT)
                .status(ActionStatus.PENDING)
                .data(data)
                .message(String.format("Bạn muốn tạo sprint \"%s\"?", name))
                .build();
    }

    private AIActionDTO createMultipleTasksAction(List<Map<String, Object>> taskDataList, Long projectId) {
        Map<String, Object> data = new HashMap<>();
        data.put("projectId", projectId);
        data.put("issues", taskDataList);

        return AIActionDTO.builder()
                .actionType(ActionType.CREATE_MULTIPLE_ISSUES)
                .status(ActionStatus.PENDING)
                .data(data)
                .message(String.format("Tạo %d công việc từ gợi ý của AI?", taskDataList.size()))
                .build();
    }

    /**
     * Trích xuất danh sách tasks từ AI response
     * Chỉ lấy các dòng có tiêu đề công việc, bỏ qua metadata
     */
    private List<Map<String, Object>> extractTaskListFromResponse(String response) {
        List<Map<String, Object>> tasks = new ArrayList<>();

        log.debug("Parsing AI response for tasks, length: {}", response.length());

        // Split response into lines
        String[] lines = response.split("\n");

        Map<String, Object> currentTask = null;

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty())
                continue;

            // Remove single bullet points at the beginning (not **)
            String cleanLine = line;
            if (line.startsWith("- ")) {
                cleanLine = line.substring(2).trim();
            } else if (line.startsWith("• ")) {
                cleanLine = line.substring(2).trim();
            } else if (line.matches("^\\d+[.):]\\s+.*")) {
                cleanLine = line.replaceFirst("^\\d+[.):]\\s+", "");
            }

            // Check if this is a task title line
            if (isTaskTitleLine(cleanLine)) {
                log.debug("Found task title line: {}", cleanLine);

                // Save previous task if exists
                if (currentTask != null && currentTask.containsKey("title")) {
                    tasks.add(currentTask);
                }

                // Start new task
                currentTask = new HashMap<>();
                String title = extractTaskTitle(cleanLine);
                if (title != null && !title.isEmpty()) {
                    currentTask.put("title", title);
                    currentTask.put("priority", "MEDIUM"); // Default
                    log.debug("Extracted task title: {}", title);
                }
            } else if (currentTask != null) {
                // Try to extract metadata for current task
                extractAndApplyMetadata(cleanLine, currentTask);
            }
        }

        // Add last task
        if (currentTask != null && currentTask.containsKey("title")) {
            tasks.add(currentTask);
        }

        log.info("Extracted {} tasks from AI response", tasks.size());
        return tasks;
    }

    /**
     * Kiểm tra xem dòng có phải là tiêu đề công việc không
     */
    private boolean isTaskTitleLine(String line) {
        String lowerLine = line.toLowerCase();

        // Exclude metadata lines first - MUST check this
        if (isMetadataLine(lowerLine)) {
            log.debug("Excluded as metadata: {}", line);
            return false;
        }

        // Check for "**Công việc X: Title**" format (AI's typical format)
        if (line.matches("(?i)\\*\\*(?:công việc|task|tác vụ)\\s*\\d*\\s*[:.]\\s*.+\\*\\*")) {
            return true;
        }

        // Check for "Công việc X:", "Task X:", etc.
        if (lowerLine.matches("(?i).*(?:\\*\\*)?(?:công việc|task|tác vụ)\\s*\\d*\\s*[:.].*")) {
            return true;
        }

        // Check for bold text at the start (likely a task title) - e.g., "**Task
        // title**"
        // But make sure it doesn't contain metadata patterns
        if (line.startsWith("**") && line.endsWith("**") && line.length() > 6) {
            String content = line.substring(2, line.length() - 2).toLowerCase();
            // Double check it's not metadata
            if (!isMetadataLine(content)) {
                return true;
            }
        }

        // Check for numbered list items that look like tasks - e.g., "1. Task title" or
        // "1) Task title"
        if (line.matches("^\\d+[.):]\\s*.+") && line.length() > 10) {
            String content = line.replaceFirst("^\\d+[.):]\\s*", "").toLowerCase();
            return !isMetadataLine(content);
        }

        return false;
    }

    /**
     * Kiểm tra xem dòng có phải là metadata không
     */
    private boolean isMetadataLine(String lowerLine) {
        // Remove leading whitespace and bullet for checking
        String check = lowerLine.replaceFirst("^\\s*[-•]?\\s*", "").trim();

        // List of metadata prefixes (Vietnamese and English)
        String[] metadataPrefixes = {
                "thời gian", "ước tính", "estimated",
                "ưu tiên", "mức độ ưu tiên", "mức độ", "priority", "độ ưu tiên",
                "hạn chót", "hạn:", "deadline", "due",
                "mô tả", "mô tả:", "description", "desc:",
                "lý do", "reason",
                "assign", "gán cho", "người thực hiện", "assignee",
                "time:", "duration",
                "status", "trạng thái",
                "note", "ghi chú", "lưu ý"
        };

        for (String prefix : metadataPrefixes) {
            if (check.startsWith(prefix)) {
                return true;
            }
        }

        // Check for "label: value" pattern with priority values
        if (check.contains(": low") ||
                check.contains(": medium") ||
                check.contains(": high") ||
                check.contains(": critical") ||
                check.contains(": thấp") ||
                check.contains(": trung bình") ||
                check.contains(": cao") ||
                check.contains(": khẩn cấp")) {
            return true;
        }

        // Check for time patterns like "16 giờ", "2 ngày"
        if (check.matches("^\\d+\\s*(giờ|ngày|h|hour|day|hours|days)s?$")) {
            return true;
        }
        if (check.matches(".*:\\s*\\d+\\s*(giờ|ngày|h|hour|day).*")) {
            return true;
        }

        return false;
    }

    /**
     * Trích xuất tiêu đề task từ dòng
     */
    private String extractTaskTitle(String line) {
        // Remove markdown bold markers
        String clean = line.replaceAll("\\*\\*", "").trim();

        // Remove bullet points
        clean = clean.replaceFirst("^[-*•]\\s*", "");

        // Remove numbered list prefix (e.g., "1. ", "2) ")
        clean = clean.replaceFirst("^\\d+[.):]+\\s*", "");

        // Pattern: "Công việc 1: Tên công việc"
        Matcher matcher = TASK_TITLE_PATTERN.matcher(clean);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        // If line starts with "Công việc", "Task", etc., get text after colon
        String lowerClean = clean.toLowerCase();
        if (lowerClean.startsWith("công việc") ||
                lowerClean.startsWith("task") ||
                lowerClean.startsWith("tác vụ")) {
            int colonIndex = clean.indexOf(':');
            if (colonIndex > 0 && colonIndex < clean.length() - 1) {
                return clean.substring(colonIndex + 1).trim();
            }
        }

        // Return the whole cleaned line as task title
        return clean.isEmpty() ? null : clean;
    }

    /**
     * Trích xuất và áp dụng metadata vào task
     */
    private void extractAndApplyMetadata(String line, Map<String, Object> task) {
        // Extract estimated hours
        Matcher timeMatcher = TIME_PATTERN.matcher(line);
        if (timeMatcher.find()) {
            try {
                int hours = Integer.parseInt(timeMatcher.group(1));
                task.put("estimatedHours", hours);
            } catch (NumberFormatException e) {
                // Ignore
            }
            return;
        }

        // Extract priority
        Matcher priorityMatcher = PRIORITY_PATTERN.matcher(line);
        if (priorityMatcher.find()) {
            String priority = normalizePriority(priorityMatcher.group(1));
            task.put("priority", priority);
            return;
        }

        // Extract deadline (days from now)
        Matcher deadlineMatcher = DEADLINE_PATTERN.matcher(line);
        if (deadlineMatcher.find()) {
            try {
                int days = Integer.parseInt(deadlineMatcher.group(1));
                task.put("deadlineDays", days);
            } catch (NumberFormatException e) {
                // Ignore
            }
            return;
        }

        // Extract description
        Matcher descMatcher = DESC_PATTERN.matcher(line);
        if (descMatcher.find()) {
            task.put("description", descMatcher.group(1).trim());
        }
    }

    /**
     * Chuẩn hóa giá trị priority
     */
    private String normalizePriority(String priority) {
        String lower = priority.toLowerCase();
        if (lower.equals("low") || lower.equals("thấp")) {
            return "LOW";
        } else if (lower.equals("high") || lower.equals("cao")) {
            return "HIGH";
        } else if (lower.equals("critical") || lower.equals("khẩn cấp")) {
            return "CRITICAL";
        }
        return "MEDIUM";
    }

    private String extractDescription(String message, String name) {
        // Simple extraction: get text after project name
        int nameIndex = message.indexOf(name);
        if (nameIndex >= 0 && nameIndex + name.length() < message.length()) {
            String remaining = message.substring(nameIndex + name.length()).trim();
            if (remaining.length() > 10) {
                return remaining;
            }
        }
        return null;
    }

    private String extractPriority(String message) {
        String lowerMessage = message.toLowerCase();
        if (lowerMessage.contains("khẩn cấp") || lowerMessage.contains("critical") || lowerMessage.contains("gấp")) {
            return "CRITICAL";
        } else if (lowerMessage.contains("cao") || lowerMessage.contains("high")
                || lowerMessage.contains("quan trọng")) {
            return "HIGH";
        } else if (lowerMessage.contains("thấp") || lowerMessage.contains("low")) {
            return "LOW";
        }
        return "MEDIUM";
    }

    @SuppressWarnings("unchecked")
    private AIActionDTO parseJsonAction(String json, Long projectId) {
        // Simple JSON parsing without external library
        // In production, use Jackson ObjectMapper
        try {
            ActionType actionType = ActionType.NONE;
            Map<String, Object> data = new HashMap<>();

            if (json.contains("CREATE_PROJECT")) {
                actionType = ActionType.CREATE_PROJECT;
            } else if (json.contains("CREATE_ISSUE") || json.contains("CREATE_TASK")) {
                actionType = ActionType.CREATE_ISSUE;
                data.put("projectId", projectId);
            } else if (json.contains("CREATE_SPRINT")) {
                actionType = ActionType.CREATE_SPRINT;
                data.put("projectId", projectId);
            }

            // Extract name/title from JSON
            Pattern namePattern = Pattern.compile("\"(?:name|title)\"\\s*:\\s*\"([^\"]+)\"");
            Matcher nameMatcher = namePattern.matcher(json);
            if (nameMatcher.find()) {
                String fieldName = actionType == ActionType.CREATE_ISSUE ? "title" : "name";
                data.put(fieldName, nameMatcher.group(1));
            }

            if (actionType != ActionType.NONE) {
                return AIActionDTO.builder()
                        .actionType(actionType)
                        .status(ActionStatus.PENDING)
                        .data(data)
                        .build();
            }
        } catch (Exception e) {
            log.warn("Failed to parse action JSON: {}", e.getMessage());
        }
        return null;
    }
}
