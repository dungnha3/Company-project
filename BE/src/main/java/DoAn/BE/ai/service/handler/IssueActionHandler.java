package DoAn.BE.ai.service.handler;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIActionDTO.ActionStatus;
import DoAn.BE.ai.dto.AIActionDTO.ActionType;
import DoAn.BE.common.util.MapUtils;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Handles issue-related AI actions: create, create multiple, assign, change
// status.
// /
@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IssueActionHandler {

    private final IssueRepository issueRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public AIActionDTO createIssue(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long projectId = MapUtils.getLong(data, "projectId");
        String title = MapUtils.getString(data, "title", "Task mới");
        String description = MapUtils.getString(data, "description", "");
        String priority = MapUtils.getString(data, "priority", "MEDIUM");
        BigDecimal estimatedHours = MapUtils.getBigDecimal(data, "estimatedHours", null);
        Integer deadlineDays = MapUtils.getInt(data, "deadlineDays", null);

        if (projectId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Vui lòng chỉ định dự án để tạo task");
            return action;
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        IssueStatus defaultStatus = issueStatusRepository.findAll().stream()
                .filter(s -> s.getName().equalsIgnoreCase("To Do") || s.getOrderIndex() == 0)
                .findFirst().orElse(null);

        Issue issue = new Issue();
        issue.setProject(project);
        issue.setTitle(title);
        issue.setDescription(description);
        issue.setIssueKey(generateIssueKey(project));
        issue.setPriority(Issue.Priority.valueOf(priority.toUpperCase()));
        issue.setReporter(reporter);
        issue.setIssueStatus(defaultStatus);
        issue.setEstimatedHours(estimatedHours);

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

    @SuppressWarnings("unchecked")
    public AIActionDTO createMultipleIssues(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long projectId = MapUtils.getLong(data, "projectId");
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
                    .data(issueActionData).build();

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

    public AIActionDTO assignIssue(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long issueId = MapUtils.getLong(data, "issueId");
        String assigneeUsername = MapUtils.getString(data, "assigneeUsername", null);

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

    public AIActionDTO changeIssueStatus(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long issueId = MapUtils.getLong(data, "issueId");
        String statusName = MapUtils.getString(data, "status", null);

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

    private String generateIssueKey(Project project) {
        long issueCount = issueRepository.findByProject_ProjectId(project.getProjectId()).size() + 1;
        return project.getKeyProject() + "-" + issueCount;
    }
}
