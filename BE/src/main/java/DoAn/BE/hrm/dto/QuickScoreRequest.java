package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuickScoreRequest {

    @NotNull(message = "Performance score cannot be null")
    @DecimalMin(value = "1.0")
    @DecimalMax(value = "10.0")
    private BigDecimal performanceScore;

    @Min(value = 0)
    private Integer reworkCount;

    private String reviewerNote;
}
