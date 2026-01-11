package DoAn.BE.automation.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.automation.dto.*;
import DoAn.BE.automation.entity.*;
import DoAn.BE.automation.repository.*;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.user.entity.User;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutomationService {

    private final AutomationRuleRepository ruleRepository;
    private final AutomationLogRepository logRepository;
    private final ProjectRepository projectRepository;
    private final CompanyRepository companyRepository;

    /**
     * Create a new automation rule
     */
    @Transactional
    public AutomationRuleDTO createRule(CreateRuleRequest request) {
        User currentUser = SecurityUtil.getCurrentUser();
        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new ForbiddenException("Yêu cầu context công ty");
        }

        AutomationRule rule = AutomationRule.builder()
                .project(projectRepository.getReferenceById(request.getProjectId()))
                .name(request.getName())
                .description(request.getDescription())
                .triggerType(request.getTriggerType())
                .triggerConfig(request.getTriggerConfig())
                .isActive(true)
                .createdBy(currentUser)
                .company(companyRepository.getReferenceById(companyId))
                .build();

        // Add conditions
        if (request.getConditions() != null) {
            for (int i = 0; i < request.getConditions().size(); i++) {
                CreateRuleRequest.ConditionInput input = request.getConditions().get(i);
                AutomationCondition condition = AutomationCondition.builder()
                        .rule(rule)
                        .field(input.getField())
                        .operator(input.getOperator())
                        .value(input.getValue())
                        .orderIndex(input.getOrderIndex() != null ? input.getOrderIndex() : i)
                        .build();
                rule.getConditions().add(condition);
            }
        }

        // Add actions
        if (request.getActions() != null) {
            for (int i = 0; i < request.getActions().size(); i++) {
                CreateRuleRequest.ActionInput input = request.getActions().get(i);
                AutomationAction action = AutomationAction.builder()
                        .rule(rule)
                        .actionType(input.getActionType())
                        .actionConfig(input.getActionConfig())
                        .orderIndex(input.getOrderIndex() != null ? input.getOrderIndex() : i)
                        .build();
                rule.getActions().add(action);
            }
        }

        rule = ruleRepository.save(rule);
        log.info("Created automation rule: {} for project {}", rule.getName(), request.getProjectId());

        return toDTO(rule);
    }

    /**
     * Get all rules for a project
     */
    public List<AutomationRuleDTO> getProjectRules(Long projectId) {
        return ruleRepository.findByProject_ProjectId(projectId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get rule by ID
     */
    public AutomationRuleDTO getRuleById(Long ruleId) {
        AutomationRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy automation rule"));
        return toDTO(rule);
    }

    /**
     * Toggle rule active/inactive
     */
    @Transactional
    public AutomationRuleDTO toggleRule(Long ruleId) {
        AutomationRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy automation rule"));

        rule.setIsActive(!rule.getIsActive());
        rule = ruleRepository.save(rule);

        log.info("Toggled rule {} to {}", ruleId, rule.getIsActive() ? "active" : "inactive");
        return toDTO(rule);
    }

    /**
     * Delete a rule
     */
    @Transactional
    public void deleteRule(Long ruleId) {
        AutomationRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy automation rule"));
        ruleRepository.delete(rule);
        log.info("Deleted automation rule: {}", ruleId);
    }

    /**
     * Get execution logs for a rule
     */
    public Page<AutomationLogDTO> getRuleLogs(Long ruleId, Pageable pageable) {
        return logRepository.findByRule_RuleIdOrderByExecutedAtDesc(ruleId, pageable)
                .map(this::toLogDTO);
    }

    /**
     * Convert rule entity to DTO
     */
    private AutomationRuleDTO toDTO(AutomationRule rule) {
        List<ConditionDTO> conditions = rule.getConditions().stream()
                .map(c -> ConditionDTO.builder()
                        .conditionId(c.getConditionId())
                        .field(c.getField())
                        .operator(c.getOperator())
                        .value(c.getValue())
                        .orderIndex(c.getOrderIndex())
                        .build())
                .collect(Collectors.toList());

        List<ActionDTO> actions = rule.getActions().stream()
                .map(a -> ActionDTO.builder()
                        .actionId(a.getActionId())
                        .actionType(a.getActionType())
                        .actionConfig(a.getActionConfig())
                        .orderIndex(a.getOrderIndex())
                        .build())
                .collect(Collectors.toList());

        return AutomationRuleDTO.builder()
                .ruleId(rule.getRuleId())
                .projectId(rule.getProject().getProjectId())
                .projectName(rule.getProject().getName())
                .name(rule.getName())
                .description(rule.getDescription())
                .triggerType(rule.getTriggerType())
                .triggerConfig(rule.getTriggerConfig())
                .isActive(rule.getIsActive())
                .createdById(rule.getCreatedBy().getUserId())
                .createdByName(rule.getCreatedBy().getUsername())
                .conditions(conditions)
                .actions(actions)
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    /**
     * Convert log entity to DTO
     */
    private AutomationLogDTO toLogDTO(AutomationLog log) {
        return AutomationLogDTO.builder()
                .logId(log.getLogId())
                .ruleId(log.getRule() != null ? log.getRule().getRuleId() : null)
                .ruleName(log.getRule() != null ? log.getRule().getName() : null)
                .issueId(log.getIssue() != null ? log.getIssue().getIssueId() : null)
                .issueKey(log.getIssue() != null ? log.getIssue().getIssueKey() : null)
                .status(log.getStatus())
                .message(log.getMessage())
                .actionsExecuted(log.getActionsExecuted())
                .executedAt(log.getExecutedAt())
                .build();
    }
}
