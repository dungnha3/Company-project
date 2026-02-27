package DoAn.BE.hrm.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import DoAn.BE.common.converter.EncryptedStringConverter;
import org.hibernate.annotations.Filter;
import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

// Employee entity - belongs to a company

// Renamed from NhanVien for English naming consistency
@Entity
@Table(name = "employees", indexes = {
        @Index(name = "idx_emp_user", columnList = "user_id"),
        @Index(name = "idx_emp_status", columnList = "status"),
        @Index(name = "idx_emp_department", columnList = "department_id"),
        @Index(name = "idx_emp_position", columnList = "position_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(exclude = { "user", "leaveRequests", "department", "position" })
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Employee extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Long employeeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Links this employee profile to the user's membership in this company
    // Nullable for backward compatibility with existing data
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_member_id")
    @JsonIgnore
    private DoAn.BE.company.entity.CompanyMember companyMember;

    @Column(name = "full_name", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String fullName;

    @Column(name = "id_card", unique = true, length = 200) // Increased for encrypted data
    @Convert(converter = EncryptedStringConverter.class)
    @JsonIgnore
    private String idCard; // CCCD - Encrypted

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 10)
    private Gender gender;

    @Column(name = "address", length = 255, columnDefinition = "NVARCHAR(255)")
    private String address;

    @Column(name = "phone", length = 200) // Increased for encrypted data
    @Convert(converter = EncryptedStringConverter.class)
    @JsonIgnore
    private String phone; // Encrypted

    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne
    @JoinColumn(name = "position_id")
    private Position position;

    @Column(name = "base_salary", precision = 15, scale = 2)
    private BigDecimal baseSalary = BigDecimal.ZERO;

    @Column(name = "allowance", precision = 15, scale = 2)
    private BigDecimal allowance = BigDecimal.ZERO;

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<LeaveRequest> leaveRequests;

    public enum Gender {
        MALE, FEMALE, OTHER
    }

    public enum EmployeeStatus {
        ACTIVE, // DANG_LAM_VIEC
        RESIGNED, // NGHI_VIEC
        ON_LEAVE // TAM_NGHI
    }

}
