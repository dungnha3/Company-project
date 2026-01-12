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

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "full_name", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String fullName;

    @Column(name = "id_card", unique = true, length = 200) // Increased for encrypted data
    @Convert(converter = EncryptedStringConverter.class)
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

    // ========== Legacy mappings for backward compatibility ==========

    public Long getNhanvienId() {
        return employeeId;
    }

    public void setNhanvienId(Long id) {
        this.employeeId = id;
    }

    public String getHoTen() {
        return fullName;
    }

    public void setHoTen(String hoTen) {
        this.fullName = hoTen;
    }

    public String getCccd() {
        return idCard;
    }

    public void setCccd(String cccd) {
        this.idCard = cccd;
    }

    public LocalDate getNgaySinh() {
        return dateOfBirth;
    }

    public void setNgaySinh(LocalDate date) {
        this.dateOfBirth = date;
    }

    public String getDiaChi() {
        return address;
    }

    public void setDiaChi(String diaChi) {
        this.address = diaChi;
    }

    public String getSdt() {
        return phone;
    }

    public void setSdt(String sdt) {
        this.phone = sdt;
    }

    public LocalDate getNgayVaoLam() {
        return hireDate;
    }

    public void setNgayVaoLam(LocalDate date) {
        this.hireDate = date;
    }

    public BigDecimal getLuongCoBan() {
        return baseSalary;
    }

    public void setLuongCoBan(BigDecimal luong) {
        this.baseSalary = luong;
    }

    public BigDecimal getPhuCap() {
        return allowance;
    }

    public void setPhuCap(BigDecimal phuCap) {
        this.allowance = phuCap;
    }
}
