package DoAn.BE.automation.dto;

import DoAn.BE.automation.entity.AutomationAction.ActionType;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActionDTO {
    private Long actionId;
    private ActionType actionType;
    private String actionConfig;
    private Integer orderIndex;
}
