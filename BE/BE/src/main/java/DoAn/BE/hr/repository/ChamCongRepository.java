package DoAn.BE.hr.repository;

import DoAn.BE.hr.entity.ChamCong;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ChamCongRepository extends JpaRepository<ChamCong, Long> {

       // Tìm theo nhân viên
       List<ChamCong> findByNhanVien_NhanvienIdOrderByNgayChamDesc(Long nhanvienId);

       // Tìm theo khoảng thời gian
       List<ChamCong> findByNgayChamBetween(LocalDate start, LocalDate end);

       // Tìm theo nhân viên và khoảng thời gian
       List<ChamCong> findByNhanVien_NhanvienIdAndNgayChamBetween(Long nhanvienId, LocalDate start, LocalDate end);

       // Tìm theo nhân viên và ngày cụ thể (cho GPS attendance)
       List<ChamCong> findByNhanVien_NhanvienIdAndNgayCham(Long nhanvienId, LocalDate ngayCham);

       // Đếm số ngày công (trạng thái hợp lệ)
       @Query(value = "SELECT COUNT(*) FROM cham_cong cc " +
                     "WHERE cc.nhanvien_id = :nhanvienId " +
                     "AND cc.ngay_cham BETWEEN :startDate AND :endDate " +
                     "AND cc.trang_thai IN ('DU_GIO', 'DI_TRE', 'VE_SOM')", nativeQuery = true)
       int countWorkingDaysByNhanVienAndMonth(@Param("nhanvienId") Long nhanvienId,
                     @Param("startDate") LocalDate startDate,
                     @Param("endDate") LocalDate endDate);

       // Tính tổng giờ làm việc
       @Query(value = "SELECT COALESCE(SUM(cc.so_gio_lam), 0) FROM cham_cong cc " +
                     "WHERE cc.nhanvien_id = :nhanvienId " +
                     "AND cc.ngay_cham BETWEEN :startDate AND :endDate", nativeQuery = true)
       BigDecimal sumWorkingHoursByNhanVienAndMonth(@Param("nhanvienId") Long nhanvienId,
                     @Param("startDate") LocalDate startDate,
                     @Param("endDate") LocalDate endDate);

       // Đếm số ngày đi trễ (dựa vào trạng thái DI_TRE đã lưu)
       @Query(value = "SELECT COUNT(*) FROM cham_cong cc " +
                     "WHERE cc.nhanvien_id = :nhanvienId " +
                     "AND cc.ngay_cham BETWEEN :startDate AND :endDate " +
                     "AND cc.trang_thai = 'DI_TRE'", nativeQuery = true)
       long countLateDaysByNhanVienAndMonth(@Param("nhanvienId") Long nhanvienId,
                     @Param("startDate") LocalDate startDate,
                     @Param("endDate") LocalDate endDate);

       // Đếm số ngày về sớm (dựa vào trạng thái VE_SOM đã lưu)
       @Query(value = "SELECT COUNT(*) FROM cham_cong cc " +
                     "WHERE cc.nhanvien_id = :nhanvienId " +
                     "AND cc.ngay_cham BETWEEN :startDate AND :endDate " +
                     "AND cc.trang_thai = 'VE_SOM'", nativeQuery = true)
       long countEarlyLeaveDaysByNhanVienAndMonth(@Param("nhanvienId") Long nhanvienId,
                     @Param("startDate") LocalDate startDate,
                     @Param("endDate") LocalDate endDate);

       // Tìm theo nhân viên và khoảng thời gian (cần cho dashboard)
       List<ChamCong> findByNhanVienAndNgayChamBetween(DoAn.BE.hr.entity.NhanVien nhanVien, LocalDate startDate,
                     LocalDate endDate);

       // Tìm chấm công theo danh sách user ID (cho Project Manager)
       List<ChamCong> findByNhanVien_User_UserIdIn(List<Long> userIds);
}
