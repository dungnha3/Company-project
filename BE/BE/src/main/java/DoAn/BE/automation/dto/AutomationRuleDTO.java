package DoAn.BE.automation.dto;

import java.time.LocalDateTime;
import java.util.List;

import DoAn.BE.automation.entity.AutomationRule.TriggerType;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationRuleDTO {
    private Long ruleId;
    private Long projectId;
    private String projectName;
    private String name;
    private String description;
    private TriggerType triggerType;
    private String triggerConfig;
    private Boolean isActive;
    private Long createdById;
    private String createdByName;
    private List<ConditionDTO> conditions;
    private List<ActionDTO> actions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
