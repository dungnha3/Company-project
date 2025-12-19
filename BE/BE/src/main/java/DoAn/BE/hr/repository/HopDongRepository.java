package DoAn.BE.hr.repository;

import DoAn.BE.hr.entity.HopDong;
import DoAn.BE.hr.entity.HopDong.LoaiHopDong;
import DoAn.BE.hr.entity.HopDong.TrangThaiHopDong;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface HopDongRepository extends JpaRepository<HopDong, Long> {
    
    // Tìm theo nhân viên
    List<HopDong> findByNhanVien_NhanvienId(Long nhanvienId);
    
    // Tìm theo loại hợp đồng
    List<HopDong> findByLoaiHopDong(LoaiHopDong loaiHopDong);
    
    // Tìm theo trạng thái
    List<HopDong> findByTrangThai(TrangThaiHopDong trangThai);
    
    // Tìm theo nhân viên và trạng thái
    List<HopDong> findByNhanVien_NhanvienIdAndTrangThai(Long nhanvienId, TrangThaiHopDong trangThai);
    
    // Tìm hợp đồng hiệu lực của nhân viên
    Optional<HopDong> findFirstByNhanVien_NhanvienIdAndTrangThaiOrderByNgayBatDauDesc(
        Long nhanvienId, TrangThaiHopDong trangThai);
    
    // Tìm hợp đồng sắp hết hạn
    @Query("SELECT hd FROM HopDong hd WHERE hd.trangThai = 'HIEU_LUC' " +
           "AND hd.ngayKetThuc IS NOT NULL " +
           "AND hd.ngayKetThuc BETWEEN :startDate AND :endDate")
    List<HopDong> findExpiringContracts(@Param("startDate") LocalDate startDate, 
                                        @Param("endDate") LocalDate endDate);
    
    // Tìm hợp đồng đã hết hạn nhưng chưa cập nhật trạng thái
    @Query("SELECT hd FROM HopDong hd WHERE hd.trangThai = 'HIEU_LUC' " +
           "AND hd.ngayKetThuc < :currentDate")
    List<HopDong> findExpiredContracts(@Param("currentDate") LocalDate currentDate);
    
    // Đếm theo trạng thái
    long countByTrangThai(TrangThaiHopDong trangThai);
    
    // Thống kê theo loại hợp đồng (cần cho dashboard)
    @Query("SELECT hd.loaiHopDong, COUNT(hd) FROM HopDong hd GROUP BY hd.loaiHopDong")
    List<Object[]> getStatsByLoaiHopDong();
}


