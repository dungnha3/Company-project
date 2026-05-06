package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class SalaryProposalRequest {
    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Proposed salary is required")
    private BigDecimal proposedSalary;

    private String reason;
    private Long projectId; // Optional
}
