package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionRequest {

    @NotBlank(message = "Position name cannot be empty")
    private String name;

    private String description;

    private String icon;

    private Double salaryCoefficient;

    @Min(value = 1, message = "Level must be >= 1")
    private Integer level;
}
