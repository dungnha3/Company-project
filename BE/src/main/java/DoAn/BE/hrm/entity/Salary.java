package DoAn.BE.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;

// Salary entity - renamed from BangLuong

// Tracks monthly payroll for employees
@Entity
@Table(name = "salaries", indexes = {
        @Index(name = "idx_sal_employee_period", columnList = "employee_id, month, year"),
        @Index(name = "idx_sal_period", columnList = "month, year"),
        @Index(name = "idx_sal_status", columnList = "payment_status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Salary extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "salary_id")
    @EqualsAndHashCode.Include
    private Long salaryId;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "base_salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal baseSalary;

    @Column(name = "working_days")
    private Integer workingDays = 0;

    @Column(name = "standard_working_days")
    private Integer standardWorkingDays = 26;

    @Column(name = "prorated_salary", precision = 15, scale = 2)
    private BigDecimal proratedSalary = BigDecimal.ZERO;

    @Column(name = "allowance", precision = 15, scale = 2)
    private BigDecimal allowance = BigDecimal.ZERO;

    @Column(name = "bonus", precision = 15, scale = 2)
    private BigDecimal bonus = BigDecimal.ZERO;

    @Column(name = "overtime_hours")
    private Integer overtimeHours = 0;

    @Column(name = "overtime_pay", precision = 15, scale = 2)
    private BigDecimal overtimePay = BigDecimal.ZERO;

    // Deductions
    @Column(name = "social_insurance", precision = 15, scale = 2)
    private BigDecimal socialInsurance = BigDecimal.ZERO; // 8%

    @Column(name = "health_insurance", precision = 15, scale = 2)
    private BigDecimal healthInsurance = BigDecimal.ZERO; // 1.5%

    @Column(name = "unemployment_insurance", precision = 15, scale = 2)
    private BigDecimal unemploymentInsurance = BigDecimal.ZERO; // 1%

    @Column(name = "personal_income_tax", precision = 15, scale = 2)
    private BigDecimal personalIncomeTax = BigDecimal.ZERO;

    @Column(name = "other_deductions", precision = 15, scale = 2)
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    @Column(name = "gross_salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossSalary;

    @Column(name = "total_deductions", precision = 15, scale = 2)
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "net_salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal netSalary;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 50)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "note", length = 500)
    private String note;

    @Override
    protected void onCreate() {
        super.onCreate();
        calculateTotalSalary();
    }

    @PreUpdate
    protected void onUpdate() {
        calculateTotalSalary();
    }

    private void calculateTotalSalary() {
        BigDecimal base = baseSalary != null ? baseSalary : BigDecimal.ZERO;

        // 1. Calculate prorated salary
        if (workingDays != null && workingDays > 0 && standardWorkingDays != null && standardWorkingDays > 0) {
            this.proratedSalary = base
                    .divide(new BigDecimal(standardWorkingDays), 2, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal(workingDays));
        } else {
            this.proratedSalary = base;
        }

        // 2. Calculate overtime pay (1.5x hourly rate)
        if (overtimeHours != null && overtimeHours > 0) {
            BigDecimal hourlyRate = base.divide(new BigDecimal(standardWorkingDays * 8), 2, RoundingMode.HALF_UP);
            this.overtimePay = hourlyRate.multiply(new BigDecimal(overtimeHours)).multiply(new BigDecimal("1.5"));
        } else {
            this.overtimePay = BigDecimal.ZERO;
        }

        // 3. Calculate insurance
        this.socialInsurance = base.multiply(new BigDecimal("0.08"));
        this.healthInsurance = base.multiply(new BigDecimal("0.015"));
        this.unemploymentInsurance = base.multiply(new BigDecimal("0.01"));

        // 4. Calculate gross salary
        BigDecimal allowanceAmt = allowance != null ? allowance : BigDecimal.ZERO;
        BigDecimal bonusAmt = bonus != null ? bonus : BigDecimal.ZERO;
        BigDecimal overtimeAmt = overtimePay != null ? overtimePay : BigDecimal.ZERO;

        this.grossSalary = proratedSalary.add(allowanceAmt).add(bonusAmt).add(overtimeAmt);

        // 5. Calculate personal income tax
        BigDecimal taxableIncome = grossSalary.subtract(socialInsurance).subtract(healthInsurance)
                .subtract(unemploymentInsurance);
        BigDecimal personalDeduction = new BigDecimal("11000000");
        BigDecimal taxBase = taxableIncome.subtract(personalDeduction);

        if (taxBase.compareTo(BigDecimal.ZERO) > 0) {
            this.personalIncomeTax = calculateProgressiveTax(taxBase);
        } else {
            this.personalIncomeTax = BigDecimal.ZERO;
        }

        // 6. Calculate total deductions
        BigDecimal otherDed = otherDeductions != null ? otherDeductions : BigDecimal.ZERO;
        this.totalDeductions = socialInsurance.add(healthInsurance).add(unemploymentInsurance)
                .add(personalIncomeTax).add(otherDed);

        // 7. Calculate net salary
        this.netSalary = grossSalary.subtract(totalDeductions);
    }

    private BigDecimal calculateProgressiveTax(BigDecimal taxableIncome) {
        // Progressive tax calculation (Vietnam rates)
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal[] brackets = {
                new BigDecimal("5000000"), new BigDecimal("10000000"), new BigDecimal("18000000"),
                new BigDecimal("32000000"), new BigDecimal("52000000"), new BigDecimal("80000000")
        };
        BigDecimal[] rates = {
                new BigDecimal("0.05"), new BigDecimal("0.10"), new BigDecimal("0.15"),
                new BigDecimal("0.20"), new BigDecimal("0.25"), new BigDecimal("0.30"), new BigDecimal("0.35")
        };

        BigDecimal remaining = taxableIncome;
        BigDecimal previousBracket = BigDecimal.ZERO;

        for (int i = 0; i < brackets.length && remaining.compareTo(BigDecimal.ZERO) > 0; i++) {
            BigDecimal bracketSize = brackets[i].subtract(previousBracket);
            BigDecimal taxableAtBracket = remaining.min(bracketSize);
            tax = tax.add(taxableAtBracket.multiply(rates[i]));
            remaining = remaining.subtract(taxableAtBracket);
            previousBracket = brackets[i];
        }

        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            tax = tax.add(remaining.multiply(rates[6]));
        }

        return tax.setScale(0, RoundingMode.HALF_UP);
    }

    public String getPeriod() {
        return String.format("%02d/%d", month, year);
    }

    public enum PaymentStatus {
        UNPAID, // CHUA_THANH_TOAN
        PAID, // DA_THANH_TOAN
        CANCELLED // DA_HUY
    }

}
