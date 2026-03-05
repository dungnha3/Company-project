package DoAn.BE.common.entity;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.company.entity.Company;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import lombok.Getter;
import lombok.Setter;

// Base class cho các entity thuộc về một công ty cụ thể (data isolation)
@MappedSuperclass
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "companyId", type = Long.class))
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
@Getter
@Setter
public abstract class TenantScopedEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @PrePersist
    protected void prePersistTenant() {
        if (company == null && TenantContext.getCompanyId() != null) {
            Company c = new Company();
            c.setCompanyId(TenantContext.getCompanyId());
            this.company = c;
        }
    }
}
