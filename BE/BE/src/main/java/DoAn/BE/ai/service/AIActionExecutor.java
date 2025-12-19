package DoAn.BE.ai.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIActionDTO.ActionStatus;
import DoAn.BE.ai.dto.AIActionDTO.ActionType;
import DoAn.BE.chat.dto.CreateChatRoomRequest;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.service.ChatRoomService;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.storage.dto.CreateFolderRequest;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.service.FolderService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service thực thi các action từ AI
 * Xử lý tạo Project, Issue, Sprint tự động
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AIActionExecutor {

    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final SprintRepository sprintRepository;
    private final ProjectMemberRepository memberRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final UserRepository userRepository;
    private final ChatRoomService chatRoomService;
    private final FolderService folderService;

    /**
     * Thực thi action từ AI
     */
    public AIActionDTO executeAction(AIActionDTO action, Long userId) {
        log.info("Executing AI action: {} for user: {}", action.getActionType(), userId);

        try {
            return switch (action.getActionType()) {
                case CREATE_PROJECT -> createProject(action, userId);
                case CREATE_ISSUE -> createIssue(action, userId);
                case CREATE_MULTIPLE_ISSUES -> createMultipleIssues(action, userId);
                case CREATE_SPRINT -> createSprint(action, userId);
                case ASSIGN_ISSUE -> assignIssue(action, userId);
                case CHANGE_ISSUE_STATUS -> changeIssueStatus(action, userId);
                case START_SPRINT -> startSprint(action, userId);
                case COMPLETE_SPRINT -> completeSprint(action, userId);
                case SETUP_PROJECT_COMPLETE -> setupProjectComplete(action, userId);
                case ADD_PROJECT_MEMBERS -> addProjectMembers(action, userId);
                case AUTO_ASSIGN_TASKS -> autoAssignTasks(action, userId);
                default -> {
                    action.setStatus(ActionStatus.FAILED);
                    action.setMessage("Action không được hỗ trợ: " + action.getActionType());
                    yield action;
                }
            };
        } catch (Exception e) {
            log.error("Error executing action: {}", e.getMessage());
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Lỗi: " + e.getMessage());
            return action;
        }
    }

    /**
     * Tạo project mới
     */
    private AIActionDTO createProject(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        String name = getStringValue(data, "name", "Dự án mới");
        String description = getStringValue(data, "description", "");
        String key = getStringValue(data, "key", generateProjectKey(name));

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if project key exists
        if (projectRepository.findByKeyProject(key).isPresent()) {
            key = key + "_" + System.currentTimeMillis() % 1000;
        }

        Project project = new Project();
        project.setName(name);
        project.setDescription(description);
        project.setKeyProject(key);
        project.setStatus(Project.ProjectStatus.ACTIVE);
        project.setCreatedBy(creator);
        project.setStartDate(LocalDate.now());

        project = projectRepository.save(project);

        // Add creator as project owner
        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(creator);
        member.setRole(ProjectMember.ProjectRole.OWNER);
        memberRepository.save(member);

        // Tạo phòng chat cho project
        try {
            CreateChatRoomRequest chatRequest = new CreateChatRoomRequest();
            chatRequest.setName(name);
            chatRequest.setProjectId(project.getProjectId());
            chatRequest.setRoomType(ChatRoom.RoomType.PROJECT);
            chatRequest.setMemberIds(List.of()); // Creator được thêm tự động
            chatRoomService.createChatRoom(chatRequest, creator);
            log.info("Created chat room for project: {}", name);
        } catch (Exception e) {
            log.warn("Failed to create chat room for project {}: {}", name, e.getMessage());
        }

        // Tạo thư mục cho project
        try {
            CreateFolderRequest folderRequest = new CreateFolderRequest();
            folderRequest.setName(name);
            folderRequest.setProjectId(project.getProjectId());
            folderRequest.setFolderType(Folder.FolderType.PROJECT);
            folderService.createFolder(folderRequest, userId);
            log.info("Created folder for project: {}", name);
        } catch (Exception e) {
            log.warn("Failed to create folder for project {}: {}", name, e.getMessage());
        }

        log.info("Created project: {} with key: {}", name, project.getKeyProject());

        action.setStatus(ActionStatus.EXECUTED);
        action.setEntityId(project.getProjectId());
        action.setEntityName(project.getName());
        action.setMessage(String.format("✅ Đã tạo dự án \"%s\" thành công!", name));

        // Add created project info to data
        Map<String, Object> resultData = new HashMap<>(data);
        resultData.put("projectId", project.getProjectId());
        resultData.put("projectKey", project.getKeyProject());
        action.setData(resultData);

        return action;
    }

    /**
     * Tạo issue/task mới
     */
    private AIActionDTO createIssue(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long projectId = getLongValue(data, "projectId");
        String title = getStringValue(data, "title", "Task mới");
        String description = getStringValue(data, "description", "");
        String priority = getStringValue(data, "priority", "MEDIUM");
        BigDecimal estimatedHours = getBigDecimalValue(data, "estimatedHours", null);
        Integer deadlineDays = getIntValue(data, "deadlineDays", null);

        if (projectId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Vui lòng chỉ định dự án để tạo task");
            return action;
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get default status (To Do)
        IssueStatus defaultStatus = issueStatusRepository.findAll().stream()
                .filter(s -> s.getName().equalsIgnoreCase("To Do") || s.getOrderIndex() == 0)
                .findFirst()
                .orElse(null);

        Issue issue = new Issue();
        issue.setProject(project);
        issue.setTitle(title);
        issue.setDescription(description);
        issue.setIssueKey(generateIssueKey(project));
        issue.setPriority(Issue.Priority.valueOf(priority.toUpperCase()));
        issue.setReporter(reporter);
        issue.setIssueStatus(defaultStatus);
        issue.setEstimatedHours(estimatedHours);

        // Set due date from deadline days
        if (deadlineDays != null && deadlineDays > 0) {
            issue.setDueDate(java.time.LocalDate.now().plusDays(deadlineDays));
        }

        issue = issueRepository.save(issue);

        log.info("Created issue: {} in project: {}", issue.getIssueKey(), project.getKeyProject());

        action.setStatus(ActionStatus.EXECUTED);
        action.setEntityId(issue.getIssueId());
        action.setEntityName(issue.getTitle());
        action.setMessage(String.format("✅ Đã tạo task \"%s\" (%s) thành công!", title, issue.getIssueKey()));

        Map<String, Object> resultData = new HashMap<>(data);
        resultData.put("issueId", issue.getIssueId());
        resultData.put("issueKey", issue.getIssueKey());
        action.setData(resultData);

        return action;
    }

    /**
     * Tạo nhiều issues cùng lúc
     */
    @SuppressWarnings("unchecked")
    private AIActionDTO createMultipleIssues(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long projectId = getLongValue(data, "projectId");
        List<Map<String, Object>> issues = (List<Map<String, Object>>) data.get("issues");

        if (projectId == null || issues == null || issues.isEmpty()) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Thiếu thông tin dự án hoặc danh sách tasks");
            return action;
        }

        List<String> createdIssues = new ArrayList<>();

        for (Map<String, Object> issueData : issues) {
            Map<String, Object> issueActionData = new HashMap<>(issueData);
            issueActionData.put("projectId", projectId);

            AIActionDTO issueAction = AIActionDTO.builder()
                    .actionType(ActionType.CREATE_ISSUE)
                    .data(issueActionData)
                    .build();

            AIActionDTO result = createIssue(issueAction, userId);
            if (result.getStatus() == ActionStatus.EXECUTED) {
                createdIssues.add(result.getEntityName());
            }
        }

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã tạo %d tasks thành công: %s",
                createdIssues.size(), String.join(", ", createdIssues)));

        return action;
    }

    /**
     * Tạo sprint mới
     */
    private AIActionDTO createSprint(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long projectId = getLongValue(data, "projectId");
        String name = getStringValue(data, "name", "Sprint mới");
        String goal = getStringValue(data, "goal", "");
        Integer durationDays = getIntValue(data, "durationDays", 14);

        if (projectId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Vui lòng chỉ định dự án để tạo sprint");
            return action;
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Sprint sprint = new Sprint();
        sprint.setProject(project);
        sprint.setName(name);
        sprint.setGoal(goal);
        sprint.setStatus(Sprint.SprintStatus.PLANNING);
        sprint.setCreatedBy(creator);
        sprint.setStartDate(LocalDate.now());
        sprint.setEndDate(LocalDate.now().plusDays(durationDays));

        sprint = sprintRepository.save(sprint);

        log.info("Created sprint: {} in project: {}", name, project.getKeyProject());

        action.setStatus(ActionStatus.EXECUTED);
        action.setEntityId(sprint.getSprintId());
        action.setEntityName(sprint.getName());
        action.setMessage(String.format("✅ Đã tạo sprint \"%s\" thành công! (Từ %s đến %s)",
                name, sprint.getStartDate(), sprint.getEndDate()));

        return action;
    }

    /**
     * Gán issue cho user
     */
    private AIActionDTO assignIssue(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long issueId = getLongValue(data, "issueId");
        String assigneeUsername = getStringValue(data, "assigneeUsername", null);

        if (issueId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Thiếu thông tin issue");
            return action;
        }

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        User assignee = null;
        if (assigneeUsername != null) {
            assignee = userRepository.findByUsername(assigneeUsername).orElse(null);
        }

        issue.setAssignee(assignee);
        issueRepository.save(issue);

        String assigneeName = assignee != null ? assignee.getUsername() : "không ai";
        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã gán task \"%s\" cho %s", issue.getTitle(), assigneeName));

        return action;
    }

    /**
     * Thay đổi trạng thái issue
     */
    private AIActionDTO changeIssueStatus(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long issueId = getLongValue(data, "issueId");
        String statusName = getStringValue(data, "status", null);

        if (issueId == null || statusName == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Thiếu thông tin issue hoặc trạng thái");
            return action;
        }

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        IssueStatus newStatus = issueStatusRepository.findAll().stream()
                .filter(s -> s.getName().equalsIgnoreCase(statusName))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Status not found: " + statusName));

        issue.setIssueStatus(newStatus);
        issueRepository.save(issue);

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã chuyển task \"%s\" sang trạng thái \"%s\"",
                issue.getTitle(), newStatus.getName()));

        return action;
    }

    /**
     * Bắt đầu sprint
     */
    private AIActionDTO startSprint(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long sprintId = getLongValue(data, "sprintId");

        if (sprintId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Thiếu thông tin sprint");
            return action;
        }

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setStatus(Sprint.SprintStatus.ACTIVE);
        sprint.setStartDate(LocalDate.now());
        sprintRepository.save(sprint);

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã bắt đầu sprint \"%s\"", sprint.getName()));

        return action;
    }

    /**
     * Hoàn thành sprint
     */
    private AIActionDTO completeSprint(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long sprintId = getLongValue(data, "sprintId");

        if (sprintId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Thiếu thông tin sprint");
            return action;
        }

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setStatus(Sprint.SprintStatus.COMPLETED);
        sprint.setEndDate(LocalDate.now());
        sprintRepository.save(sprint);

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã hoàn thành sprint \"%s\"", sprint.getName()));

        return action;
    }

    // ==================== Helper Methods ====================

    private String generateProjectKey(String name) {
        // Generate key from first letters of words
        String[] words = name.split("\\s+");
        StringBuilder key = new StringBuilder();
        for (String word : words) {
            if (!word.isEmpty() && key.length() < 5) {
                key.append(Character.toUpperCase(word.charAt(0)));
            }
        }
        if (key.length() < 2) {
            key.append("PRJ");
        }
        return key.toString();
    }

    private String generateIssueKey(Project project) {
        long issueCount = issueRepository.findByProject_ProjectId(project.getProjectId()).size() + 1;
        return project.getKeyProject() + "-" + issueCount;
    }

    private String getStringValue(Map<String, Object> data, String key, String defaultValue) {
        if (data == null || !data.containsKey(key))
            return defaultValue;
        Object value = data.get(key);
        return value != null ? value.toString() : defaultValue;
    }

    private Long getLongValue(Map<String, Object> data, String key) {
        if (data == null || !data.containsKey(key))
            return null;
        Object value = data.get(key);
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        if (value instanceof String) {
            try {
                return Long.parseLong((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private Integer getIntValue(Map<String, Object> data, String key, Integer defaultValue) {
        if (data == null || !data.containsKey(key))
            return defaultValue;
        Object value = data.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private BigDecimal getBigDecimalValue(Map<String, Object> data, String key, BigDecimal defaultValue) {
        if (data == null || !data.containsKey(key))
            return defaultValue;
        Object value = data.get(key);
        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    // ==================== Auto Setup Methods ====================

    /**
     * Thiết lập dự án hoàn chỉnh: tạo project + tasks + thêm members + gán việc
     */
    @SuppressWarnings("unchecked")
    private AIActionDTO setupProjectComplete(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        String projectName = getStringValue(data, "name", "Dự án mới");
        String projectDescription = getStringValue(data, "description", "");
        List<Map<String, Object>> tasksData = (List<Map<String, Object>>) data.get("tasks");
        List<String> memberUsernames = (List<String>) data.get("memberUsernames");
        Integer memberCount = getIntValue(data, "memberCount", 3);

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        StringBuilder resultMessage = new StringBuilder();

        // 1. Tạo project
        String projectKey = generateProjectKey(projectName);
        if (projectRepository.findByKeyProject(projectKey).isPresent()) {
            projectKey = projectKey + "_" + System.currentTimeMillis() % 1000;
        }

        Project project = new Project();
        project.setName(projectName);
        project.setDescription(projectDescription);
        project.setKeyProject(projectKey);
        project.setStatus(Project.ProjectStatus.ACTIVE);
        project.setCreatedBy(creator);
        project.setStartDate(LocalDate.now());
        final Project savedProject = projectRepository.save(project);

        resultMessage.append(String.format("✅ Đã tạo dự án \"%s\" (%s)\n", projectName, projectKey));

        // 2. Thêm creator làm owner
        ProjectMember ownerMember = new ProjectMember();
        ownerMember.setProject(savedProject);
        ownerMember.setUser(creator);
        ownerMember.setRole(ProjectMember.ProjectRole.OWNER);
        memberRepository.save(ownerMember);

        // 2.1 Tạo phòng chat cho project
        try {
            CreateChatRoomRequest chatRequest = new CreateChatRoomRequest();
            chatRequest.setName(projectName);
            chatRequest.setProjectId(savedProject.getProjectId());
            chatRequest.setRoomType(ChatRoom.RoomType.PROJECT);
            chatRequest.setMemberIds(List.of()); // Creator được thêm tự động
            chatRoomService.createChatRoom(chatRequest, creator);
            log.info("Created chat room for project: {}", projectName);
        } catch (Exception e) {
            log.warn("Failed to create chat room for project {}: {}", projectName, e.getMessage());
        }

        // 2.2 Tạo thư mục cho project
        try {
            CreateFolderRequest folderRequest = new CreateFolderRequest();
            folderRequest.setName(projectName);
            folderRequest.setProjectId(savedProject.getProjectId());
            folderRequest.setFolderType(Folder.FolderType.PROJECT);
            folderService.createFolder(folderRequest, userId);
            log.info("Created folder for project: {}", projectName);
        } catch (Exception e) {
            log.warn("Failed to create folder for project {}: {}", projectName, e.getMessage());
        }

        // 3. Thêm members - từ danh sách hoặc tạo mẫu
        List<User> projectMembers = new ArrayList<>();
        projectMembers.add(creator);

        if (memberUsernames != null && !memberUsernames.isEmpty()) {
            // Thêm members theo username
            for (String username : memberUsernames) {
                userRepository.findByUsername(username).ifPresent(user -> {
                    if (!user.getUserId().equals(creator.getUserId())) {
                        ProjectMember member = new ProjectMember();
                        member.setProject(savedProject);
                        member.setUser(user);
                        member.setRole(ProjectMember.ProjectRole.MEMBER);
                        memberRepository.save(member);
                        projectMembers.add(user);
                    }
                });
            }
        } else {
            // Lấy users có sẵn trong hệ thống
            List<User> availableUsers = userRepository.findByIsActiveTrue().stream()
                    .filter(u -> !u.getUserId().equals(creator.getUserId()))
                    .limit(memberCount - 1)
                    .toList();

            for (User user : availableUsers) {
                ProjectMember member = new ProjectMember();
                member.setProject(savedProject);
                member.setUser(user);
                member.setRole(ProjectMember.ProjectRole.MEMBER);
                memberRepository.save(member);
                projectMembers.add(user);
            }
        }

        resultMessage.append(String.format("👥 Đã thêm %d thành viên vào dự án\n", projectMembers.size()));

        // 4. Tạo Sprints (giai đoạn) và tasks
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sprintsData = (List<Map<String, Object>>) data.get("sprints");
        Integer sprintCount = getIntValue(data, "sprintCount", 3);

        IssueStatus defaultStatus = issueStatusRepository.findAll().stream()
                .filter(s -> s.getName().equalsIgnoreCase("To Do") || s.getOrderIndex() == 0)
                .findFirst()
                .orElse(null);

        List<Sprint> createdSprints = new ArrayList<>();
        int totalTaskCount = 0;
        int memberIndex = 0;

        // Default sprint configuration if not provided
        String[] defaultSprintNames = {
                "Sprint 1: Khởi động & Thiết kế",
                "Sprint 2: Phát triển chức năng chính",
                "Sprint 3: Hoàn thiện & Kiểm thử"
        };
        String[] defaultSprintGoals = {
                "Phân tích yêu cầu, thiết kế hệ thống, chuẩn bị môi trường",
                "Phát triển các tính năng core, tích hợp APIs",
                "Testing, bug fixing, deployment và documentation"
        };

        if (sprintsData != null && !sprintsData.isEmpty()) {
            // Create sprints from AI-generated data
            int sprintIndex = 0;
            for (Map<String, Object> sprintData : sprintsData) {
                String sprintName = getStringValue(sprintData, "name", "Sprint " + (sprintIndex + 1));
                String sprintGoal = getStringValue(sprintData, "goal", "");
                Integer durationDays = getIntValue(sprintData, "durationDays", 14);

                Sprint sprint = new Sprint();
                sprint.setProject(savedProject);
                sprint.setName(sprintName);
                sprint.setGoal(sprintGoal);
                sprint.setStartDate(LocalDate.now().plusWeeks(sprintIndex * 2));
                sprint.setEndDate(LocalDate.now().plusWeeks(sprintIndex * 2).plusDays(durationDays));
                sprint.setStatus(sprintIndex == 0 ? Sprint.SprintStatus.PLANNING : Sprint.SprintStatus.PLANNING);
                sprint.setCreatedBy(creator);
                sprint = sprintRepository.save(sprint);
                createdSprints.add(sprint);

                // Create tasks for this sprint
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> sprintTasks = (List<Map<String, Object>>) sprintData.get("tasks");
                if (sprintTasks != null) {
                    for (Map<String, Object> taskData : sprintTasks) {
                        String title = getStringValue(taskData, "title", "Task " + (totalTaskCount + 1));
                        String description = getStringValue(taskData, "description", "");
                        String priority = getStringValue(taskData, "priority", "MEDIUM");
                        BigDecimal estimatedHours = getBigDecimalValue(taskData, "estimatedHours", null);

                        Issue issue = new Issue();
                        issue.setProject(savedProject);
                        issue.setSprint(sprint);
                        issue.setTitle(title);
                        issue.setDescription(description);
                        issue.setIssueKey(savedProject.getKeyProject() + "-" + (totalTaskCount + 1));
                        issue.setPriority(Issue.Priority.valueOf(priority.toUpperCase()));
                        issue.setReporter(creator);
                        issue.setIssueStatus(defaultStatus);
                        issue.setEstimatedHours(estimatedHours);

                        User assignee = projectMembers.get(memberIndex % projectMembers.size());
                        issue.setAssignee(assignee);
                        memberIndex++;

                        issueRepository.save(issue);
                        totalTaskCount++;
                    }
                }
                sprintIndex++;
            }
        } else if (tasksData != null && !tasksData.isEmpty()) {
            // Create default sprints and distribute tasks across them
            int tasksPerSprint = (int) Math.ceil((double) tasksData.size() / sprintCount);

            for (int i = 0; i < sprintCount; i++) {
                Sprint sprint = new Sprint();
                sprint.setProject(savedProject);
                sprint.setName(i < defaultSprintNames.length ? defaultSprintNames[i] : "Sprint " + (i + 1));
                sprint.setGoal(i < defaultSprintGoals.length ? defaultSprintGoals[i]
                        : "Hoàn thành các công việc giai đoạn " + (i + 1));
                sprint.setStartDate(LocalDate.now().plusWeeks(i * 2));
                sprint.setEndDate(LocalDate.now().plusWeeks(i * 2 + 2));
                sprint.setStatus(Sprint.SprintStatus.PLANNING);
                sprint.setCreatedBy(creator);
                sprint = sprintRepository.save(sprint);
                createdSprints.add(sprint);

                // Assign tasks to this sprint
                int startIdx = i * tasksPerSprint;
                int endIdx = Math.min(startIdx + tasksPerSprint, tasksData.size());

                for (int j = startIdx; j < endIdx; j++) {
                    Map<String, Object> taskData = tasksData.get(j);
                    String title = getStringValue(taskData, "title", "Task " + (totalTaskCount + 1));
                    String description = getStringValue(taskData, "description", "");
                    String priority = getStringValue(taskData, "priority", "MEDIUM");
                    BigDecimal estimatedHours = getBigDecimalValue(taskData, "estimatedHours", null);

                    Issue issue = new Issue();
                    issue.setProject(savedProject);
                    issue.setSprint(sprint);
                    issue.setTitle(title);
                    issue.setDescription(description);
                    issue.setIssueKey(savedProject.getKeyProject() + "-" + (totalTaskCount + 1));
                    issue.setPriority(Issue.Priority.valueOf(priority.toUpperCase()));
                    issue.setReporter(creator);
                    issue.setIssueStatus(defaultStatus);
                    issue.setEstimatedHours(estimatedHours);

                    User assignee = projectMembers.get(memberIndex % projectMembers.size());
                    issue.setAssignee(assignee);
                    memberIndex++;

                    issueRepository.save(issue);
                    totalTaskCount++;
                }
            }
        }

        resultMessage.append(String.format("🏃 Đã tạo %d sprints (giai đoạn)\n", createdSprints.size()));
        resultMessage.append(String.format("📋 Đã tạo %d công việc và phân công cho các thành viên\n", totalTaskCount));

        action.setStatus(ActionStatus.EXECUTED);
        action.setEntityId(savedProject.getProjectId());
        action.setEntityName(savedProject.getName());
        action.setMessage(resultMessage.toString());

        Map<String, Object> resultData = new HashMap<>(data);
        resultData.put("projectId", savedProject.getProjectId());
        resultData.put("projectKey", savedProject.getKeyProject());
        resultData.put("memberCount", projectMembers.size());
        resultData.put("sprintCount", createdSprints.size());
        resultData.put("taskCount", totalTaskCount);
        action.setData(resultData);

        log.info("Setup complete for project: {} with {} members, {} sprints and {} tasks",
                savedProject.getKeyProject(), projectMembers.size(), createdSprints.size(), totalTaskCount);

        return action;
    }

    /**
     * Thêm thành viên vào project
     */
    @SuppressWarnings("unchecked")
    private AIActionDTO addProjectMembers(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long projectId = getLongValue(data, "projectId");
        List<String> memberUsernames = (List<String>) data.get("memberUsernames");
        Integer memberCount = getIntValue(data, "memberCount", 3);

        if (projectId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Vui lòng chỉ định dự án");
            return action;
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        List<Long> existingMemberIds = memberRepository.findByProject_ProjectId(projectId).stream()
                .map(m -> m.getUser().getUserId())
                .toList();

        List<String> addedMembers = new ArrayList<>();

        if (memberUsernames != null && !memberUsernames.isEmpty()) {
            for (String username : memberUsernames) {
                userRepository.findByUsername(username).ifPresent(user -> {
                    if (!existingMemberIds.contains(user.getUserId())) {
                        ProjectMember member = new ProjectMember();
                        member.setProject(project);
                        member.setUser(user);
                        member.setRole(ProjectMember.ProjectRole.MEMBER);
                        memberRepository.save(member);
                        addedMembers.add(user.getUsername());
                    }
                });
            }
        } else {
            // Lấy users có sẵn
            List<User> availableUsers = userRepository.findByIsActiveTrue().stream()
                    .filter(u -> !existingMemberIds.contains(u.getUserId()))
                    .limit(memberCount)
                    .toList();

            for (User user : availableUsers) {
                ProjectMember member = new ProjectMember();
                member.setProject(project);
                member.setUser(user);
                member.setRole(ProjectMember.ProjectRole.MEMBER);
                memberRepository.save(member);
                addedMembers.add(user.getUsername());
            }
        }

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã thêm %d thành viên vào dự án \"%s\": %s",
                addedMembers.size(), project.getName(), String.join(", ", addedMembers)));

        return action;
    }

    /**
     * Tự động gán tasks cho members trong project
     */
    private AIActionDTO autoAssignTasks(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long projectId = getLongValue(data, "projectId");

        if (projectId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Vui lòng chỉ định dự án");
            return action;
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Lấy danh sách members
        List<User> members = memberRepository.findByProject_ProjectId(projectId).stream()
                .map(ProjectMember::getUser)
                .toList();

        if (members.isEmpty()) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Dự án chưa có thành viên nào");
            return action;
        }

        // Lấy các tasks chưa được gán
        List<Issue> unassignedIssues = issueRepository.findByProject_ProjectId(projectId).stream()
                .filter(i -> i.getAssignee() == null)
                .toList();

        if (unassignedIssues.isEmpty()) {
            action.setStatus(ActionStatus.EXECUTED);
            action.setMessage("Tất cả công việc đã được phân công");
            return action;
        }

        // Gán theo round-robin
        int memberIndex = 0;
        for (Issue issue : unassignedIssues) {
            User assignee = members.get(memberIndex % members.size());
            issue.setAssignee(assignee);
            issueRepository.save(issue);
            memberIndex++;
        }

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã tự động phân công %d công việc cho %d thành viên trong dự án \"%s\"",
                unassignedIssues.size(), members.size(), project.getName()));

        return action;
    }
}
