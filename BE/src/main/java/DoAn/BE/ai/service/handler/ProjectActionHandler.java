package DoAn.BE.ai.service.handler;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIActionDTO.ActionStatus;
import DoAn.BE.chat.dto.CreateChatRoomRequest;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.service.ChatRoomService;
import DoAn.BE.common.util.MapUtils;
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

// Handles project-related AI actions.
@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectActionHandler {

    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final SprintRepository sprintRepository;
    private final ProjectMemberRepository memberRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final UserRepository userRepository;
    private final ChatRoomService chatRoomService;
    private final FolderService folderService;
    private final DoAn.BE.common.service.AccessControlService accessControlService;

    private void validateProjectManager(Long projectId, Long userId) {
        if (accessControlService.isOwnerOrAdmin())
            return;

        DoAn.BE.project.entity.ProjectMember member = memberRepository.findByProject_ProjectId(projectId).stream()
                .filter(m -> m.getUser().getUserId().equals(userId))
                .findFirst()
                .orElseThrow(
                        () -> new DoAn.BE.common.exception.ForbiddenException("Bạn không có quyền truy cập dự án này"));

        if (member.getRole() != ProjectMember.ProjectRole.OWNER
                && member.getRole() != ProjectMember.ProjectRole.MANAGER) {
            throw new DoAn.BE.common.exception.ForbiddenException("Yêu cầu quyền Quản trị dự án");
        }
    }

    public AIActionDTO createProject(AIActionDTO action, Long userId) {
        accessControlService.checkProjectCreatePermission();

        Map<String, Object> data = action.getData();

        String name = MapUtils.getString(data, "name", "Dự án mới");
        String description = MapUtils.getString(data, "description", "");
        String key = MapUtils.getString(data, "key", generateProjectKey(name));

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("User not found"));

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

        addCreatorAsMember(project, creator);
        createProjectChatRoom(project, creator);
        createProjectFolder(project, userId);

        log.info("Created project: {} with key: {}", name, project.getKeyProject());

        action.setStatus(ActionStatus.EXECUTED);
        action.setEntityId(project.getProjectId());
        action.setEntityName(project.getName());
        action.setMessage(String.format("✅ Đã tạo dự án \"%s\" thành công!", name));

        Map<String, Object> resultData = new HashMap<>(data);
        resultData.put("projectId", project.getProjectId());
        resultData.put("projectKey", project.getKeyProject());
        action.setData(resultData);

        return action;
    }

    @SuppressWarnings("unchecked")
    public AIActionDTO setupProjectComplete(AIActionDTO action, Long userId) {
        accessControlService.checkProjectCreatePermission();

        Map<String, Object> data = action.getData();

        String projectName = MapUtils.getString(data, "name", "Dự án mới");
        String projectDescription = MapUtils.getString(data, "description", "");
        List<Map<String, Object>> tasksData = (List<Map<String, Object>>) data.get("tasks");
        List<String> memberUsernames = (List<String>) data.get("memberUsernames");
        Integer memberCount = MapUtils.getInt(data, "memberCount", 3);

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("User not found"));

        StringBuilder resultMessage = new StringBuilder();

        // Step 1: Create project
        Project savedProject = createAndSaveProject(projectName, projectDescription, creator);
        resultMessage.append(String.format("✅ Đã tạo dự án \"%s\" (%s)\n",
                projectName, savedProject.getKeyProject()));

        addCreatorAsMember(savedProject, creator);
        createProjectChatRoom(savedProject, creator);
        createProjectFolder(savedProject, userId);

        // Step 2: Add members
        List<User> projectMembers = addMembers(savedProject, creator, memberUsernames, memberCount);
        resultMessage.append(String.format("👥 Đã thêm %d thành viên vào dự án\n", projectMembers.size()));

        // Step 3: Create sprints and tasks
        SprintTaskResult sprintResult = createSprintsAndTasks(
                data, savedProject, creator, projectMembers, tasksData);
        resultMessage.append(String.format("🏃 Đã tạo %d sprints (giai đoạn)\n", sprintResult.sprintCount()));
        resultMessage.append(String.format("📋 Đã tạo %d công việc và phân công cho các thành viên\n",
                sprintResult.taskCount()));

        // Build result
        action.setStatus(ActionStatus.EXECUTED);
        action.setEntityId(savedProject.getProjectId());
        action.setEntityName(savedProject.getName());
        action.setMessage(resultMessage.toString());

        Map<String, Object> resultData = new HashMap<>(data);
        resultData.put("projectId", savedProject.getProjectId());
        resultData.put("projectKey", savedProject.getKeyProject());
        resultData.put("memberCount", projectMembers.size());
        resultData.put("sprintCount", sprintResult.sprintCount());
        resultData.put("taskCount", sprintResult.taskCount());
        action.setData(resultData);

        log.info("Setup complete for project: {} with {} members, {} sprints and {} tasks",
                savedProject.getKeyProject(), projectMembers.size(),
                sprintResult.sprintCount(), sprintResult.taskCount());

        return action;
    }

    @SuppressWarnings("unchecked")
    public AIActionDTO addProjectMembers(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long projectId = MapUtils.getLong(data, "projectId");
        List<String> memberUsernames = (List<String>) data.get("memberUsernames");
        Integer memberCount = MapUtils.getInt(data, "memberCount", 3);

        if (projectId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Vui lòng chỉ định dự án");
            return action;
        }
        // adding members
        validateProjectManager(projectId, userId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Project not found"));

        List<Long> existingMemberIds = memberRepository.findByProject_ProjectId(projectId).stream()
                .map(m -> m.getUser().getUserId()).toList();

        List<String> addedMembers = new ArrayList<>();

        if (memberUsernames != null && !memberUsernames.isEmpty()) {
            for (String username : memberUsernames) {
                userRepository.findByUsername(username).ifPresent(user -> {
                    // Validate user belongs to same company as project (prevent cross-tenant)
                    boolean sameCompany = user.getMemberships() != null && user.getMemberships().stream()
                            .anyMatch(m -> project.getCompany() != null &&
                                    m.getCompany().getCompanyId().equals(project.getCompany().getCompanyId()));
                    if (sameCompany && !existingMemberIds.contains(user.getUserId())) {
                        saveMember(project, user, ProjectMember.ProjectRole.MEMBER);
                        addedMembers.add(user.getUsername());
                    }
                });
            }
        } else {
            // Scope to project's company members only (prevent cross-tenant addition)
            List<User> availableUsers = memberRepository.findByProject_ProjectId(projectId).isEmpty()
                    ? List.of()
                    : userRepository.findAll().stream()
                            .filter(u -> u.getIsActive() && u.getMemberships() != null && u.getMemberships().stream()
                                    .anyMatch(m -> project.getCompany() != null &&
                                            m.getCompany().getCompanyId().equals(project.getCompany().getCompanyId())))
                            .filter(u -> !existingMemberIds.contains(u.getUserId()))
                            .limit(memberCount).toList();

            for (User user : availableUsers) {
                saveMember(project, user, ProjectMember.ProjectRole.MEMBER);
                addedMembers.add(user.getUsername());
            }
        }

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã thêm %d thành viên vào dự án \"%s\": %s",
                addedMembers.size(), project.getName(), String.join(", ", addedMembers)));

        return action;
    }

    public AIActionDTO autoAssignTasks(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long projectId = MapUtils.getLong(data, "projectId");

        if (projectId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Vui lòng chỉ định dự án");
            return action;
        }
        // auto-assigning tasks
        validateProjectManager(projectId, userId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Project not found"));

        List<User> members = memberRepository.findByProject_ProjectId(projectId).stream()
                .map(ProjectMember::getUser).toList();

        if (members.isEmpty()) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Dự án chưa có thành viên nào");
            return action;
        }

        List<Issue> unassignedIssues = issueRepository.findByProject_ProjectId(projectId).stream()
                .filter(i -> i.getAssignee() == null).toList();

        if (unassignedIssues.isEmpty()) {
            action.setStatus(ActionStatus.EXECUTED);
            action.setMessage("Tất cả công việc đã được phân công");
            return action;
        }

        int memberIndex = 0;
        for (Issue issue : unassignedIssues) {
            issue.setAssignee(members.get(memberIndex % members.size()));
            issueRepository.save(issue);
            memberIndex++;
        }

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã tự động phân công %d công việc cho %d thành viên trong dự án \"%s\"",
                unassignedIssues.size(), members.size(), project.getName()));

        return action;
    }

    private Project createAndSaveProject(String name, String description, User creator) {
        String key = generateProjectKey(name);
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
        return projectRepository.save(project);
    }

    private void addCreatorAsMember(Project project, User creator) {
        saveMember(project, creator, ProjectMember.ProjectRole.OWNER);
    }

    private void saveMember(Project project, User user, ProjectMember.ProjectRole role) {
        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(user);
        member.setRole(role);
        memberRepository.save(member);
    }

    private void createProjectChatRoom(Project project, User creator) {
        try {
            CreateChatRoomRequest chatRequest = new CreateChatRoomRequest();
            chatRequest.setName(project.getName());
            chatRequest.setProjectId(project.getProjectId());
            chatRequest.setRoomType(ChatRoom.RoomType.PROJECT);
            chatRequest.setMemberIds(List.of());
            chatRoomService.createChatRoom(chatRequest, creator);
            log.info("Created chat room for project: {}", project.getName());
        } catch (Exception e) {
            log.warn("Failed to create chat room for project {}: {}", project.getName(), e.getMessage());
        }
    }

    private void createProjectFolder(Project project, Long userId) {
        try {
            CreateFolderRequest folderRequest = new CreateFolderRequest();
            folderRequest.setName(project.getName());
            folderRequest.setProjectId(project.getProjectId());
            folderRequest.setFolderType(Folder.FolderType.PROJECT);
            folderService.createFolder(folderRequest, userId);
            log.info("Created folder for project: {}", project.getName());
        } catch (Exception e) {
            log.warn("Failed to create folder for project {}: {}", project.getName(), e.getMessage());
        }
    }

    private List<User> addMembers(Project project, User creator,
            List<String> memberUsernames, int memberCount) {
        List<User> projectMembers = new ArrayList<>();
        projectMembers.add(creator);

        if (memberUsernames != null && !memberUsernames.isEmpty()) {
            for (String username : memberUsernames) {
                userRepository.findByUsername(username).ifPresent(user -> {
                    if (!user.getUserId().equals(creator.getUserId())) {
                        saveMember(project, user, ProjectMember.ProjectRole.MEMBER);
                        projectMembers.add(user);
                    }
                });
            }
        } else {
            Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
            List<User> availableUsers;
            if (companyId != null) {
                // Use company members from the same company
                availableUsers = memberRepository.findAll().stream()
                        .filter(m -> m.getProject() != null && m.getProject().getCompany() != null
                                && companyId.equals(m.getProject().getCompany().getCompanyId()))
                        .map(ProjectMember::getUser)
                        .filter(u -> u != null && !u.getUserId().equals(creator.getUserId()) && u.getIsActive())
                        .distinct()
                        .limit(memberCount - 1)
                        .toList();
            } else {
                availableUsers = java.util.Collections.emptyList();
            }

            for (User user : availableUsers) {
                saveMember(project, user, ProjectMember.ProjectRole.MEMBER);
                projectMembers.add(user);
            }
        }
        return projectMembers;
    }

    @SuppressWarnings("unchecked")
    private SprintTaskResult createSprintsAndTasks(
            Map<String, Object> data, Project project, User creator,
            List<User> projectMembers, List<Map<String, Object>> tasksData) {

        List<Map<String, Object>> sprintsData = (List<Map<String, Object>>) data.get("sprints");
        Integer sprintCount = MapUtils.getInt(data, "sprintCount", 3);

        IssueStatus defaultStatus = issueStatusRepository.findAll().stream()
                .filter(s -> s.getName().equalsIgnoreCase("To Do") || s.getOrderIndex() == 0)
                .findFirst().orElse(null);

        int totalTaskCount = 0;
        int totalSprintCount = 0;
        int memberIndex = 0;

        String[] defaultNames = {
                "Sprint 1: Khởi động & Thiết kế",
                "Sprint 2: Phát triển chức năng chính",
                "Sprint 3: Hoàn thiện & Kiểm thử"
        };
        String[] defaultGoals = {
                "Phân tích yêu cầu, thiết kế hệ thống, chuẩn bị môi trường",
                "Phát triển các tính năng core, tích hợp APIs",
                "Testing, bug fixing, deployment và documentation"
        };

        if (sprintsData != null && !sprintsData.isEmpty()) {
            int sprintIndex = 0;
            for (Map<String, Object> sprintData : sprintsData) {
                Sprint sprint = createSprint(project, creator, sprintData, sprintIndex);
                totalSprintCount++;

                List<Map<String, Object>> sprintTasks = (List<Map<String, Object>>) sprintData.get("tasks");
                if (sprintTasks != null) {
                    for (Map<String, Object> taskData : sprintTasks) {
                        createIssueForSprint(project, sprint, creator, taskData,
                                totalTaskCount, defaultStatus,
                                projectMembers.get(memberIndex % projectMembers.size()));
                        memberIndex++;
                        totalTaskCount++;
                    }
                }
                sprintIndex++;
            }
        } else if (tasksData != null && !tasksData.isEmpty()) {
            int tasksPerSprint = (int) Math.ceil((double) tasksData.size() / sprintCount);

            for (int i = 0; i < sprintCount; i++) {
                Sprint sprint = createDefaultSprint(project, creator, i, defaultNames, defaultGoals);
                totalSprintCount++;

                int startIdx = i * tasksPerSprint;
                int endIdx = Math.min(startIdx + tasksPerSprint, tasksData.size());

                for (int j = startIdx; j < endIdx; j++) {
                    createIssueForSprint(project, sprint, creator, tasksData.get(j),
                            totalTaskCount, defaultStatus,
                            projectMembers.get(memberIndex % projectMembers.size()));
                    memberIndex++;
                    totalTaskCount++;
                }
            }
        }

        return new SprintTaskResult(totalSprintCount, totalTaskCount);
    }

    private Sprint createSprint(Project project, User creator,
            Map<String, Object> sprintData, int index) {
        Sprint sprint = new Sprint();
        sprint.setProject(project);
        sprint.setName(MapUtils.getString(sprintData, "name", "Sprint " + (index + 1)));
        sprint.setGoal(MapUtils.getString(sprintData, "goal", ""));
        Integer duration = MapUtils.getInt(sprintData, "durationDays", 14);
        sprint.setStartDate(LocalDate.now().plusWeeks(index * 2));
        sprint.setEndDate(LocalDate.now().plusWeeks(index * 2).plusDays(duration));
        sprint.setStatus(Sprint.SprintStatus.PLANNING);
        sprint.setCreatedBy(creator);
        return sprintRepository.save(sprint);
    }

    private Sprint createDefaultSprint(Project project, User creator, int index,
            String[] names, String[] goals) {
        Sprint sprint = new Sprint();
        sprint.setProject(project);
        sprint.setName(index < names.length ? names[index] : "Sprint " + (index + 1));
        sprint.setGoal(index < goals.length ? goals[index]
                : "Hoàn thành các công việc giai đoạn " + (index + 1));
        sprint.setStartDate(LocalDate.now().plusWeeks(index * 2));
        sprint.setEndDate(LocalDate.now().plusWeeks(index * 2 + 2));
        sprint.setStatus(Sprint.SprintStatus.PLANNING);
        sprint.setCreatedBy(creator);
        return sprintRepository.save(sprint);
    }

    private void createIssueForSprint(Project project, Sprint sprint, User creator,
            Map<String, Object> taskData, int taskIndex,
            IssueStatus defaultStatus, User assignee) {
        Issue issue = new Issue();
        issue.setProject(project);
        issue.setSprint(sprint);
        issue.setTitle(MapUtils.getString(taskData, "title", "Task " + (taskIndex + 1)));
        issue.setDescription(MapUtils.getString(taskData, "description", ""));
        issue.setIssueKey(generateIssueKey(project));
        issue.setPriority(Issue.Priority.valueOf(
                MapUtils.getString(taskData, "priority", "MEDIUM").toUpperCase()));
        issue.setReporter(creator);
        issue.setIssueStatus(defaultStatus);
        issue.setEstimatedHours(MapUtils.getBigDecimal(taskData, "estimatedHours", null));
        issue.setAssignee(assignee);
        issueRepository.save(issue);
    }

    String generateProjectKey(String name) {
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

    String generateIssueKey(Project project) {
        long issueCount = issueRepository.findByProject_ProjectId(project.getProjectId()).size() + 1;
        return project.getKeyProject() + "-" + issueCount;
    }

    public record SprintTaskResult(int sprintCount, int taskCount) {
    }
}
