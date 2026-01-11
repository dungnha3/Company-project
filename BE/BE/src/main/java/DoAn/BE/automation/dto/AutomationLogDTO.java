package DoAn.BE.automation.dto;

import java.time.LocalDateTime;

import DoAn.BE.automation.entity.AutomationLog.ExecutionStatus;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationLogDTO {
    private Long logId;
    private Long ruleId;
    private String ruleName;
    private Long issueId;
    private String issueKey;
    private ExecutionStatus status;
    private String message;
    private Integer actionsExecuted;
    private LocalDateTime executedAt;
}
