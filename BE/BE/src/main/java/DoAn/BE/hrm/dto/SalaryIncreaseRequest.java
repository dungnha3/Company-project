package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class SalaryIncreaseRequest {
    @NotNull(message = "Employee ID cannot be null")
    private Long employeeId;

    @NotNull(message = "Proposed salary cannot be null")
    @Positive(message = "Proposed salary must be greater than 0")
    private BigDecimal proposedSalary;

    private String reason;
}
