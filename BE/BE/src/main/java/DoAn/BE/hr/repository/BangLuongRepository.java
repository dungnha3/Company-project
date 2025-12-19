package DoAn.BE.hr.repository;

import DoAn.BE.hr.entity.BangLuong;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BangLuongRepository extends JpaRepository<BangLuong, Long> {
    
    // Tìm bảng lương theo nhân viên
    List<BangLuong> findByNhanVien_NhanvienId(Long nhanvienId);
    
    // Tìm bảng lương theo tháng năm
    List<BangLuong> findByThangAndNam(Integer thang, Integer nam);

    // Tìm bảng lương theo nhân viên và tháng năm
    Optional<BangLuong> findByNhanVien_NhanvienIdAndThangAndNam(Long nhanvienId, Integer thang, Integer nam);
    
    // Tìm bảng lương theo trạng thái
    List<BangLuong> findByTrangThai(String trangThai);

    // Tìm bảng lương chưa thanh toán
    List<BangLuong> findByTrangThaiIn(List<String> trangThai);

    // Tính tổng lương đã thanh toán trong tháng
    @Query("SELECT SUM(bl.luongThucNhan) FROM BangLuong bl WHERE bl.thang = :thang AND bl.nam = :nam AND bl.trangThai = 'DA_THANH_TOAN'")
    BigDecimal getTongLuongThanhToanThang(@Param("thang") Integer thang, @Param("nam") Integer nam);

    // Đếm số bảng lương theo trạng thái
    Long countByTrangThai(String trangThai);

    // Tìm bảng lương theo nhân viên và trạng thái
    List<BangLuong> findByNhanVien_NhanvienIdAndTrangThai(Long nhanvienId, String trangThai);

    // Kiểm tra bảng lương đã tồn tại chưa
    boolean existsByNhanVien_NhanvienIdAndThangAndNam(Long nhanvienId, Integer thang, Integer nam);

    // Tìm bảng lương theo khoảng thời gian
    @Query("SELECT bl FROM BangLuong bl WHERE (bl.nam > :namBatDau OR (bl.nam = :namBatDau AND bl.thang >= :thangBatDau)) AND (bl.nam < :namKetThuc OR (bl.nam = :namKetThuc AND bl.thang <= :thangKetThuc))")
    List<BangLuong> findByPeriodRange(@Param("thangBatDau") Integer thangBatDau, @Param("namBatDau") Integer namBatDau, 
                                       @Param("thangKetThuc") Integer thangKetThuc, @Param("namKetThuc") Integer namKetThuc);

    // Tính tổng lương thực nhận của nhân viên trong năm
    @Query("SELECT SUM(bl.luongThucNhan) FROM BangLuong bl WHERE bl.nhanVien.nhanvienId = :nhanvienId AND bl.nam = :nam")
    BigDecimal getTongLuongNhanVienTheoNam(@Param("nhanvienId") Long nhanvienId, @Param("nam") Integer nam);

    // Lấy danh sách bảng lương mới nhất (sắp xếp theo thời gian)
    @Query(value = "SELECT * FROM bang_luong ORDER BY nam DESC, thang DESC, created_at DESC LIMIT 10", nativeQuery = true)
    List<BangLuong> findTop10ByOrderByNamDescThangDescCreatedAtDesc();

    // Tìm bảng lương theo năm
    List<BangLuong> findByNamOrderByThangAsc(Integer nam);

    // Xóa bảng lương theo nhân viên và tháng năm
    void deleteByNhanVien_NhanvienIdAndThangAndNam(Long nhanvienId, Integer thang, Integer nam);

}


