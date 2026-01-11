package DoAn.BE.automation.dto;

import DoAn.BE.automation.entity.AutomationCondition.Operator;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConditionDTO {
    private Long conditionId;
    private String field;
    private Operator operator;
    private String value;
    private Integer orderIndex;
}
