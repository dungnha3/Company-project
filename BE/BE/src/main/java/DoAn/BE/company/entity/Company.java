package DoAn.BE.company.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

// Entity đại diện cho công ty trong hệ thống multi-tenant
@Entity
@Table(name = "companies")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Company extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "company_id")
    private Long companyId;

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String name;

    @Column(unique = true, length = 100)
    private String slug; // Đường dẫn URL: /company/{slug}

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(length = 500, columnDefinition = "NVARCHAR(500)")
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_plan", length = 20, nullable = false) // 'plan' là từ khóa dành riêng trong SQL Server
    private Plan plan = Plan.FREE;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @OneToOne(mappedBy = "company", cascade = CascadeType.ALL, orphanRemoval = true)
    private CompanySettings settings;
}
