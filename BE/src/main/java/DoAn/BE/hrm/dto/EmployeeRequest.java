package DoAn.BE.hrm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import DoAn.BE.hrm.entity.Employee.Gender;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRequest {

    @NotNull(message = "User ID cannot be null")
    private Long userId;

    @NotBlank(message = "Full name cannot be empty")
    private String fullName;

    private String idCard;

    @NotNull(message = "Date of birth cannot be null")
    private LocalDate dateOfBirth;

    @NotNull(message = "Gender cannot be null")
    private Gender gender;

    private String address;

    @NotNull(message = "Hire date cannot be null")
    private LocalDate hireDate;


    @Min(value = 0, message = "Base salary must be >= 0")
    private BigDecimal baseSalary;

    @Min(value = 0, message = "Allowance must be >= 0")
    private BigDecimal allowance;
}
