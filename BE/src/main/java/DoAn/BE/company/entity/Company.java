package DoAn.BE.company.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Entity đại diện cho công ty trong hệ thống multi-tenant
@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Company extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "company_id")
    private Long companyId;

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String name;

    @Column(length = 1000, columnDefinition = "NVARCHAR(1000)")
    private String description;

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



    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @OneToOne(mappedBy = "company", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("company")
    private CompanySettings settings;
    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (!(o instanceof Company other))
            return false;
        return companyId != null && companyId.equals(other.getCompanyId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
