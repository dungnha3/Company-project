package DoAn.BE.hr.repository;

import DoAn.BE.hr.entity.PhongBan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PhongBanRepository extends JpaRepository<PhongBan, Long> {
    
    Optional<PhongBan> findByTenPhongBan(String tenPhongBan);
    boolean existsByTenPhongBan(String tenPhongBan);
    
    // Tìm phòng ban theo trưởng phòng
    List<PhongBan> findByTruongPhong_NhanvienId(Long truongPhongId);
    
    // Đếm số lượng nhân viên trong phòng ban
    @Query("SELECT COUNT(nv) FROM NhanVien nv WHERE nv.phongBan.phongbanId = :phongbanId")
    long countNhanVienByPhongBan(@Param("phongbanId") Long phongbanId);
    
    // Tìm kiếm phòng ban
    @Query("SELECT pb FROM PhongBan pb WHERE LOWER(pb.tenPhongBan) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<PhongBan> searchByKeyword(@Param("keyword") String keyword);
}


