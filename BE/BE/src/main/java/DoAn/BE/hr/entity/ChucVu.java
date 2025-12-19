package DoAn.BE.hr.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "chuc_vu")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChucVu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chucvu_id")
    private Long chucvuId;

    @Column(name = "ten_chuc_vu", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String tenChucVu;

    @Column(name = "mo_ta", length = 500, columnDefinition = "NVARCHAR(500)")
    private String moTa;

    @Column(name = "icon", length = 50, columnDefinition = "NVARCHAR(50)")
    private String icon;

    @Column(name = "he_so_luong")
    private Double heSoLuong;

    @Column(name = "level", nullable = false)
    private Integer level = 1;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "chucVu", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<NhanVien> nhanViens;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
