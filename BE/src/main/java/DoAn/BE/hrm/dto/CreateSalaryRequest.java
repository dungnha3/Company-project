package DoAn.BE.hrm.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSalaryRequest {

    @NotNull(message = "Employee ID cannot be null")
    private Long employeeId;

    @NotNull(message = "Month cannot be null")
    @Min(value = 1, message = "Month must be 1-12")
    @Max(value = 12, message = "Month must be 1-12")
    private Integer month;

    @NotNull(message = "Year cannot be null")
    @Min(value = 2020, message = "Year must be >= 2020")
    private Integer year;

    @NotNull(message = "Base salary cannot be null")
    @Min(value = 0, message = "Base salary must be >= 0")
    private BigDecimal baseSalary;

    @Min(value = 0, message = "Working days must be >= 0")
    private Integer workingDays;

    @Min(value = 1, message = "Standard working days must be >= 1")
    private Integer standardWorkingDays;

    private BigDecimal allowance;
    private BigDecimal bonus;

    @Min(value = 0, message = "Overtime hours must be >= 0")
    private Integer overtimeHours;

    private BigDecimal otherDeductions;
    private String note;
}
