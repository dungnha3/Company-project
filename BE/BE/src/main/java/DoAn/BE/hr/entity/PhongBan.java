package DoAn.BE.hr.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "phong_ban")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhongBan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "phongban_id")
    private Long phongbanId;

    @Column(name = "ten_phong_ban", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String tenPhongBan;

    @Column(name = "mo_ta", length = 500, columnDefinition = "NVARCHAR(500)")
    private String moTa;

    @ManyToOne
    @JoinColumn(name = "truong_phong_id")
    private NhanVien truongPhong;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "phongBan", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<NhanVien> nhanViens;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
