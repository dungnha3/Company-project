package DoAn.BE.hr.repository;

import DoAn.BE.hr.entity.ChucVu;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ChucVuRepository extends JpaRepository<ChucVu, Long> {
    
    Optional<ChucVu> findByTenChucVu(String tenChucVu);
    boolean existsByTenChucVu(String tenChucVu);
    
    // Tìm theo level
    List<ChucVu> findByLevel(Integer level);
    List<ChucVu> findByLevelGreaterThanEqual(Integer level);
    
    // Sắp xếp theo level
    List<ChucVu> findAllByOrderByLevelAsc();
    
    // Đếm số lượng nhân viên theo chức vụ
    @Query("SELECT COUNT(nv) FROM NhanVien nv WHERE nv.chucVu.chucvuId = :chucvuId")
    long countNhanVienByChucVu(@Param("chucvuId") Long chucvuId);
    
    // Tìm kiếm chức vụ
    @Query("SELECT cv FROM ChucVu cv WHERE LOWER(cv.tenChucVu) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<ChucVu> searchByKeyword(@Param("keyword") String keyword);
}


