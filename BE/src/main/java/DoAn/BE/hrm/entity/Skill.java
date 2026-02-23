package DoAn.BE.hrm.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "skills", indexes = {
        @Index(name = "idx_skill_category", columnList = "category")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Skill extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "skill_id")
    private Long id;

    @Column(name = "name", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String name;

    @Column(name = "category", length = 100, columnDefinition = "NVARCHAR(100)")
    private String category; // Technical, Soft Skills, Tools

    @Column(name = "description", columnDefinition = "NVARCHAR(500)")
    private String description;
}
