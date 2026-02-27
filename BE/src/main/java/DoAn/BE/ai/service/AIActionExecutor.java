package DoAn.BE.ai.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIActionDTO.ActionStatus;
import DoAn.BE.ai.service.handler.IssueActionHandler;
import DoAn.BE.ai.service.handler.ProjectActionHandler;
import DoAn.BE.ai.service.handler.SprintActionHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Routes AI actions to focused handler classes.
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AIActionExecutor {

    private final ProjectActionHandler projectHandler;
    private final IssueActionHandler issueHandler;
    private final SprintActionHandler sprintHandler;

    // Routes an AI action to the appropriate handler.
    // /
    public AIActionDTO executeAction(AIActionDTO action, Long userId) {
        log.info("Executing AI action: {} for user: {}", action.getActionType(), userId);

        try {
            return switch (action.getActionType()) {
                // Project actions
                case CREATE_PROJECT -> projectHandler.createProject(action, userId);
                case SETUP_PROJECT_COMPLETE -> projectHandler.setupProjectComplete(action, userId);
                case ADD_PROJECT_MEMBERS -> projectHandler.addProjectMembers(action, userId);
                case AUTO_ASSIGN_TASKS -> projectHandler.autoAssignTasks(action, userId);

                // Issue actions
                case CREATE_ISSUE -> issueHandler.createIssue(action, userId);
                case CREATE_MULTIPLE_ISSUES -> issueHandler.createMultipleIssues(action, userId);
                case ASSIGN_ISSUE -> issueHandler.assignIssue(action, userId);
                case CHANGE_ISSUE_STATUS -> issueHandler.changeIssueStatus(action, userId);

                // Sprint actions
                case CREATE_SPRINT -> sprintHandler.createSprint(action, userId);
                case START_SPRINT -> sprintHandler.startSprint(action, userId);
                case COMPLETE_SPRINT -> sprintHandler.completeSprint(action, userId);

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
}
