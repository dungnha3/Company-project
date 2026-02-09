package DoAn.BE.hrm.dto;

import java.math.BigDecimal;

import DoAn.BE.hrm.entity.Salary.PaymentStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSalaryRequest {

    @Min(value = 1, message = "Month must be 1-12")
    @Max(value = 12, message = "Month must be 1-12")
    private Integer month;

    @Min(value = 2020, message = "Year must be >= 2020")
    private Integer year;

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
    private PaymentStatus paymentStatus;
    private String note;
}
