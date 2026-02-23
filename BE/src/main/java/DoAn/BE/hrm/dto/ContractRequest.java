package DoAn.BE.hrm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import DoAn.BE.hrm.entity.Contract.ContractType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContractRequest {

    @NotNull(message = "Employee ID cannot be null")
    private Long employeeId;

    @NotNull(message = "Contract type cannot be null")
    private ContractType contractType;

    @NotNull(message = "Start date cannot be null")
    private LocalDate startDate;

    private LocalDate endDate;

    @NotNull(message = "Salary cannot be null")
    @Min(value = 0, message = "Salary must be >= 0")
    private BigDecimal salary;

    private String content;
}
