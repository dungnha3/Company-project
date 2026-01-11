package DoAn.BE.automation.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import DoAn.BE.automation.entity.*;
import DoAn.BE.automation.entity.AutomationAction.ActionType;
import DoAn.BE.automation.entity.AutomationCondition.Operator;
import DoAn.BE.automation.entity.AutomationLog.ExecutionStatus;
import DoAn.BE.automation.entity.AutomationRule.TriggerType;
import DoAn.BE.automation.repository.*;
import DoAn.BE.notification.entity.NotificationType;
import DoAn.BE.notification.service.NotificationService;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueComment;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.repository.IssueCommentRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Core engine for executing automation rules
 * Entry point for all automation triggers
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AutomationEngine {

    private final AutomationRuleRepository ruleRepository;
    private final AutomationLogRepository logRepository;
    private final IssueRepository issueRepository;
    private final IssueStatusRepository statusRepository;
    private final IssueCommentRepository commentRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    // HTTP client for webhook calls
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    // Maximum actions per trigger to prevent infinite loops
    private static final int MAX_ACTIONS_PER_TRIGGER = 10;

    /**
     * Process a trigger event on an issue
     * Called by event listeners when issue changes
     */
    @Transactional
    public void processEvent(Long projectId, Long issueId, TriggerType triggerType) {
        log.debug("Processing trigger {} for issue {} in project {}", triggerType, issueId, projectId);

        Issue issue = issueRepository.findById(issueId).orElse(null);
        if (issue == null) {
            log.warn("Issue {} not found, skipping automation", issueId);
            return;
        }

        // Find all active rules for this trigger
        List<AutomationRule> rules = ruleRepository
                .findByProject_ProjectIdAndTriggerTypeAndIsActiveTrue(projectId, triggerType);

        for (AutomationRule rule : rules) {
            try {
                executeRule(rule, issue);
            } catch (Exception e) {
                log.error("Error executing rule {}: {}", rule.getRuleId(), e.getMessage());
                logExecution(rule, issue, ExecutionStatus.FAILED, e.getMessage(), 0);
            }
        }
    }

    /**
     * Execute a single rule on an issue
     */
    private void executeRule(AutomationRule rule, Issue issue) {
        log.debug("Evaluating rule: {} for issue {}", rule.getName(), issue.getIssueKey());

        // Check all conditions
        if (!evaluateConditions(rule.getConditions(), issue)) {
            log.debug("Rule {} conditions not met, skipping", rule.getName());
            logExecution(rule, issue, ExecutionStatus.SKIPPED, "Conditions not met", 0);
            return;
        }

        // Execute actions
        int actionsExecuted = 0;
        StringBuilder messages = new StringBuilder();

        for (AutomationAction action : rule.getActions()) {
            if (actionsExecuted >= MAX_ACTIONS_PER_TRIGGER) {
                messages.append("Max actions limit reached. ");
                break;
            }

            try {
                executeAction(action, issue);
                actionsExecuted++;
            } catch (Exception e) {
                messages.append("Action ").append(action.getActionType())
                        .append(" failed: ").append(e.getMessage()).append(". ");
            }
        }

        // Save issue changes
        issueRepository.save(issue);

        // Log execution
        ExecutionStatus status = actionsExecuted == rule.getActions().size()
                ? ExecutionStatus.SUCCESS
                : (actionsExecuted > 0 ? ExecutionStatus.PARTIAL : ExecutionStatus.FAILED);

        logExecution(rule, issue, status, messages.toString(), actionsExecuted);
        log.info("Rule {} executed on issue {}: {} ({} actions)",
                rule.getName(), issue.getIssueKey(), status, actionsExecuted);
    }

    /**
     * Evaluate all conditions for a rule
     */
    private boolean evaluateConditions(List<AutomationCondition> conditions, Issue issue) {
        if (conditions == null || conditions.isEmpty()) {
            return true; // No conditions = always match
        }

        for (AutomationCondition condition : conditions) {
            if (!evaluateCondition(condition, issue)) {
                return false; // AND logic - all must match
            }
        }
        return true;
    }

    /**
     * Evaluate a single condition
     */
    private boolean evaluateCondition(AutomationCondition condition, Issue issue) {
        String fieldValue = getFieldValue(issue, condition.getField());
        String expectedValue = condition.getValue();
        Operator operator = condition.getOperator();

        switch (operator) {
            case EQUALS:
                return expectedValue.equals(fieldValue);
            case NOT_EQUALS:
                return !expectedValue.equals(fieldValue);
            case CONTAINS:
                return fieldValue != null && fieldValue.contains(expectedValue);
            case IS_EMPTY:
                return fieldValue == null || fieldValue.isEmpty();
            case IS_NOT_EMPTY:
                return fieldValue != null && !fieldValue.isEmpty();
            default:
                log.warn("Unsupported operator: {}", operator);
                return false;
        }
    }

    /**
     * Get field value from issue for condition evaluation
     */
    private String getFieldValue(Issue issue, String field) {
        switch (field.toLowerCase()) {
            case "status":
                return issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : null;
            case "priority":
                return issue.getPriority() != null ? issue.getPriority().name() : null;
            case "assignee":
                return issue.getAssignee() != null ? issue.getAssignee().getUserId().toString() : null;
            case "reporter":
                return issue.getReporter() != null ? issue.getReporter().getUserId().toString() : null;
            case "title":
                return issue.getTitle();
            default:
                log.warn("Unknown field: {}", field);
                return null;
        }
    }

    /**
     * Execute a single action
     */
    private void executeAction(AutomationAction action, Issue issue) throws Exception {
        ActionType type = action.getActionType();
        String config = action.getActionConfig();

        switch (type) {
            case UPDATE_FIELD:
                executeUpdateField(config, issue);
                break;
            case ADD_COMMENT:
                executeAddComment(config, issue);
                break;
            case SEND_NOTIFICATION:
                executeSendNotification(config, issue);
                break;
            case SEND_WEBHOOK:
                executeSendWebhook(config, issue);
                break;
            default:
                log.warn("Unsupported action type: {}", type);
        }
    }

    /**
     * Execute UPDATE_FIELD action
     * Config format: {"field": "status", "value": "Done"}
     */
    private void executeUpdateField(String config, Issue issue) throws Exception {
        JsonNode node = objectMapper.readTree(config);
        String field = node.get("field").asText();
        String value = node.get("value").asText();

        switch (field.toLowerCase()) {
            case "status":
                IssueStatus newStatus = statusRepository.findByName(value).orElse(null);
                if (newStatus != null) {
                    issue.setIssueStatus(newStatus);
                    log.debug("Updated status to: {}", value);
                }
                break;
            case "priority":
                issue.setPriority(Issue.Priority.valueOf(value.toUpperCase()));
                log.debug("Updated priority to: {}", value);
                break;
            default:
                log.warn("Cannot update field: {}", field);
        }
    }

    /**
     * Execute ADD_COMMENT action
     * Config format: {"content": "Auto-generated comment text"}
     */
    private void executeAddComment(String config, Issue issue) throws Exception {
        JsonNode node = objectMapper.readTree(config);
        String content = node.get("content").asText();

        // Use constructor instead of builder
        IssueComment comment = new IssueComment(issue, issue.getReporter(), "[Automation] " + content);
        commentRepository.save(comment);
        log.debug("Added automation comment to issue {}", issue.getIssueKey());
    }

    /**
     * Execute SEND_NOTIFICATION action
     * Config format: {"message": "Notification text", "userId": 123}
     */
    private void executeSendNotification(String config, Issue issue) throws Exception {
        JsonNode node = objectMapper.readTree(config);
        String message = node.get("message").asText();

        // Determine recipient - use config userId if specified, otherwise issue
        // assignee
        Long recipientId = null;
        if (node.has("userId")) {
            recipientId = node.get("userId").asLong();
        } else if (issue.getAssignee() != null) {
            recipientId = issue.getAssignee().getUserId();
        }

        if (recipientId != null) {
            // Use the correct service method signature
            notificationService.send(
                    recipientId,
                    NotificationType.TASK_ASSIGNED, // Use appropriate type
                    "/app/my-issues", // Link to issues
                    message);
            log.debug("Sent automation notification to user {}", recipientId);
        } else {
            log.warn("No recipient for notification, skipping");
        }
    }

    /**
     * Execute SEND_WEBHOOK action
     * Config format: {"url": "https://...", "method": "POST", "body": {...}}
     */
    private void executeSendWebhook(String config, Issue issue) throws Exception {
        JsonNode node = objectMapper.readTree(config);
        String url = node.get("url").asText();
        String method = node.has("method") ? node.get("method").asText() : "POST";

        // Build request body with issue context
        String body = node.has("body") ? node.get("body").toString() : buildDefaultWebhookBody(issue);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.debug("Webhook sent successfully to {}, response: {}", url, response.statusCode());
        } else {
            log.warn("Webhook to {} returned status {}", url, response.statusCode());
        }
    }

    /**
     * Build default webhook payload with issue info
     */
    private String buildDefaultWebhookBody(Issue issue) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of(
                "issueId", issue.getIssueId(),
                "issueKey", issue.getIssueKey(),
                "title", issue.getTitle(),
                "status", issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "N/A",
                "priority", issue.getPriority() != null ? issue.getPriority().name() : "N/A"));
    }

    /**
     * Log automation execution
     */
    private void logExecution(AutomationRule rule, Issue issue, ExecutionStatus status,
            String message, int actionsExecuted) {
        AutomationLog automationLog = AutomationLog.builder()
                .rule(rule)
                .issue(issue)
                .status(status)
                .message(message)
                .actionsExecuted(actionsExecuted)
                .build();
        logRepository.save(automationLog);
    }
}
