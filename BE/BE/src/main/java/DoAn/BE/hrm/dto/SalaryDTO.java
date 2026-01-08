package DoAn.BE.hrm.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import DoAn.BE.hrm.entity.Salary.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalaryDTO {
    private Long salaryId;
    private Long employeeId;
    private String employeeName;
    private Integer month;
    private Integer year;
    private String period;

    // Income
    private BigDecimal baseSalary;
    private Integer workingDays;
    private Integer standardWorkingDays;
    private BigDecimal proratedSalary;
    private BigDecimal allowance;
    private BigDecimal bonus;
    private Integer overtimeHours;
    private BigDecimal overtimePay;

    // Deductions
    private BigDecimal socialInsurance;
    private BigDecimal healthInsurance;
    private BigDecimal unemploymentInsurance;
    private BigDecimal personalIncomeTax;
    private BigDecimal otherDeductions;

    // Totals
    private BigDecimal grossSalary;
    private BigDecimal totalDeductions;
    private BigDecimal netSalary;

    private PaymentStatus paymentStatus;
    private String note;
    private LocalDateTime createdAt;
}
