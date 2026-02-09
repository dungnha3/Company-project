package DoAn.BE.hrm.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionDTO {
    private Long positionId;
    private String name;
    private String description;
    private String icon;
    private Double salaryCoefficient;
    private Integer level;
    private LocalDateTime createdAt;
    private Integer employeeCount;
}
