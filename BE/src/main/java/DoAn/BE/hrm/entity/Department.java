package DoAn.BE.hrm.entity;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import DoAn.BE.common.entity.TenantScopedEntity;
import jakarta.persistence.*;
import lombok.*;

// Department entity - renamed from PhongBan
@Entity
@Table(name = "departments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Department extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "name", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String name;

    @Column(name = "description", length = 500, columnDefinition = "NVARCHAR(500)")
    private String description;

    @ManyToOne
    @JoinColumn(name = "manager_id")
    private Employee manager;

    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Employee> employees;

}
