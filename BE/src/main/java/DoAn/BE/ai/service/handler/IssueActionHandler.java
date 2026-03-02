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
import DoAn.BE.project.repository.IssueStatusRepository;
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

    private final IssueStatusRepository issueStatusRepository;
    private final UserRepository userRepository;
    private final DoAn.BE.project.service.IssueService issueService;

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

        DoAn.BE.project.dto.CreateIssueRequest request = new DoAn.BE.project.dto.CreateIssueRequest();
        request.setProjectId(projectId);
        request.setTitle(title);
        request.setDescription(description);
        try {
            request.setPriority(Issue.Priority.valueOf(priority.toUpperCase()));
        } catch (Exception e) {
            request.setPriority(Issue.Priority.MEDIUM);
        }
        request.setEstimatedHours(estimatedHours);
        if (deadlineDays != null && deadlineDays > 0) {
            request.setDueDate(java.time.LocalDate.now().plusDays(deadlineDays));
        }

        try {
            DoAn.BE.project.dto.IssueDTO issueDTO = issueService.createIssue(request, userId);

            action.setStatus(ActionStatus.EXECUTED);
            action.setEntityId(issueDTO.getIssueId());
            action.setEntityName(issueDTO.getTitle());
            action.setMessage(String.format("✅ Đã tạo task \"%s\" (%s) thành công!", title, issueDTO.getIssueKey()));

            Map<String, Object> resultData = new HashMap<>(data);
            resultData.put("issueId", issueDTO.getIssueId());
            resultData.put("issueKey", issueDTO.getIssueKey());
            action.setData(resultData);
            return action;
        } catch (Exception e) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Không thể tạo task: " + e.getMessage());
            return action;
        }
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

        try {
            DoAn.BE.project.dto.IssueDTO issue = issueService.getIssueById(issueId, userId);

            User assignee = null;
            if (assigneeUsername != null) {
                assignee = userRepository.findByUsername(assigneeUsername).orElse(null);
            }

            if (assignee != null) {
                issueService.assignIssue(issueId, assignee.getUserId(), userId);
            } else {
                throw new DoAn.BE.common.exception.ResourceNotFoundException("Không tìm thấy người cần gán");
            }

            String assigneeName = assignee.getUsername();
            action.setStatus(ActionStatus.EXECUTED);
            action.setMessage(String.format("✅ Đã gán task \"%s\" cho %s", issue.getTitle(), assigneeName));
            return action;
        } catch (Exception e) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Không thể gán task: " + e.getMessage());
            return action;
        }
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

        try {
            DoAn.BE.project.dto.IssueDTO issue = issueService.getIssueById(issueId, userId);
            IssueStatus newStatus = issueStatusRepository.findByNameIgnoreCase(statusName)
                    .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException(
                            "Status not found: " + statusName));

            issueService.changeIssueStatus(issueId, newStatus.getStatusId(), userId);

            action.setStatus(ActionStatus.EXECUTED);
            action.setMessage(String.format("✅ Đã chuyển task \"%s\" sang trạng thái \"%s\"",
                    issue.getTitle(), newStatus.getName()));
            return action;
        } catch (Exception e) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Không thể cập nhật trạng thái task: " + e.getMessage());
            return action;
        }
    }

    // Unused generateIssueKey removed
}
