package DoAn.BE.automation.dto;

import java.util.List;

import DoAn.BE.automation.entity.AutomationAction.ActionType;
import DoAn.BE.automation.entity.AutomationCondition.Operator;
import DoAn.BE.automation.entity.AutomationRule.TriggerType;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRuleRequest {

    @NotNull(message = "Project ID là bắt buộc")
    private Long projectId;

    @NotBlank(message = "Tên rule là bắt buộc")
    @Size(max = 255)
    private String name;

    private String description;

    @NotNull(message = "Trigger type là bắt buộc")
    private TriggerType triggerType;

    private String triggerConfig;

    private List<ConditionInput> conditions;
    private List<ActionInput> actions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConditionInput {
        private String field;
        private Operator operator;
        private String value;
        private Integer orderIndex;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActionInput {
        private ActionType actionType;
        private String actionConfig;
        private Integer orderIndex;
    }
}
