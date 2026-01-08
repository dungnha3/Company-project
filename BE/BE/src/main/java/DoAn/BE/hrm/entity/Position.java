package DoAn.BE.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

// Position entity - renamed from ChucVu
@Entity
@Table(name = "positions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Position extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "position_id")
    private Long positionId;

    @Column(name = "name", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String name;

    @Column(name = "description", length = 500, columnDefinition = "NVARCHAR(500)")
    private String description;

    @Column(name = "icon", length = 50)
    private String icon;

    @Column(name = "salary_coefficient")
    private Double salaryCoefficient;

    @Column(name = "level", nullable = false)
    private Integer level = 1;

    @OneToMany(mappedBy = "position", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Employee> employees;

    // Legacy getters/setters for backward compatibility
    public Long getChucvuId() {
        return positionId;
    }

    public void setChucvuId(Long id) {
        this.positionId = id;
    }

    public String getTenChucVu() {
        return name;
    }

    public void setTenChucVu(String ten) {
        this.name = ten;
    }

    public String getMoTa() {
        return description;
    }

    public void setMoTa(String moTa) {
        this.description = moTa;
    }

    public Double getHeSoLuong() {
        return salaryCoefficient;
    }

    public void setHeSoLuong(Double heSo) {
        this.salaryCoefficient = heSo;
    }
}
