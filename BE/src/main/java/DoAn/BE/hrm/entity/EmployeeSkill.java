package DoAn.BE.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "employee_skills", indexes = {
        @Index(name = "idx_emp_skill_employee", columnList = "employee_id"),
        @Index(name = "idx_emp_skill_skill", columnList = "skill_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Builder.Default
    @Column(name = "level")
    private Integer level = 0; // 0-4: None, Basic, Intermediate, Proficient, Expert

    @Column(name = "notes", columnDefinition = "NVARCHAR(500)")
    private String notes;
}
