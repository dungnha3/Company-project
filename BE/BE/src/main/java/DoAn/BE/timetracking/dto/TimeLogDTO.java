package DoAn.BE.timetracking.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeLogDTO {
    private Long logId;
    private Long issueId;
    private String issueKey;
    private String issueTitle;
    private Long projectId;
    private String projectName;
    private Long userId;
    private String userName;
    private String userAvatar;
    private BigDecimal loggedHours;
    private LocalDate workDate;
    private String description;
    private LocalDateTime createdAt;
}
