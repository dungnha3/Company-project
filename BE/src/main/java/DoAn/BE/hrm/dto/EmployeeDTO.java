package DoAn.BE.hrm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import DoAn.BE.hrm.entity.Employee.Gender;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDTO {
    private Long employeeId;
    private Long userId;
    private String username;
    private String email;
    private String avatarUrl;
    private String phone;
    private String fullName;
    private String idCard;
    private LocalDate dateOfBirth;
    private Gender gender;
    private String address;
    private LocalDate hireDate;
    private EmployeeStatus status;

    private BigDecimal baseSalary;
    private BigDecimal allowance;
    private LocalDateTime createdAt;
}
