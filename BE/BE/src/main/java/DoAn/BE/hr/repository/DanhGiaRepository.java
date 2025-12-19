package DoAn.BE.hr.repository;

import DoAn.BE.hr.entity.DanhGia;
import DoAn.BE.hr.entity.DanhGia.LoaiDanhGia;
import DoAn.BE.hr.entity.DanhGia.TrangThaiDanhGia;
import DoAn.BE.hr.entity.DanhGia.XepLoai;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DanhGiaRepository extends JpaRepository<DanhGia, Long> {
    
    // Tìm đánh giá theo nhân viên
    List<DanhGia> findByNhanVien_NhanvienIdOrderByCreatedAtDesc(Long nhanvienId);
    
    // Tìm đánh giá theo người đánh giá
    List<DanhGia> findByNguoiDanhGia_NhanvienIdOrderByCreatedAtDesc(Long nguoiDanhGiaId);
    
    // Tìm đánh giá theo kỳ đánh giá
    List<DanhGia> findByKyDanhGiaOrderByCreatedAtDesc(String kyDanhGia);
    
    // Tìm đánh giá theo loại
    List<DanhGia> findByLoaiDanhGiaOrderByCreatedAtDesc(LoaiDanhGia loaiDanhGia);
    
    // Tìm đánh giá theo trạng thái
    List<DanhGia> findByTrangThaiOrderByCreatedAtDesc(TrangThaiDanhGia trangThai);
    
    // Tìm đánh giá theo xếp loại
    List<DanhGia> findByXepLoaiOrderByCreatedAtDesc(XepLoai xepLoai);
    
    // Tìm đánh giá trong khoảng thời gian
    @Query("SELECT d FROM DanhGia d WHERE d.ngayBatDau >= :startDate AND d.ngayKetThuc <= :endDate ORDER BY d.createdAt DESC")
    List<DanhGia> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Kiểm tra đã có đánh giá cho nhân viên trong kỳ chưa
    @Query("SELECT d FROM DanhGia d WHERE d.nhanVien.nhanvienId = :nhanvienId AND d.kyDanhGia = :kyDanhGia AND d.loaiDanhGia = :loaiDanhGia")
    Optional<DanhGia> findByNhanVienAndKyAndLoai(@Param("nhanvienId") Long nhanvienId, 
                                                 @Param("kyDanhGia") String kyDanhGia, 
                                                 @Param("loaiDanhGia") LoaiDanhGia loaiDanhGia);
    
    // Thống kê đánh giá theo phòng ban
    @Query("SELECT d FROM DanhGia d WHERE d.nhanVien.phongBan.phongbanId = :phongBanId ORDER BY d.createdAt DESC")
    List<DanhGia> findByPhongBan(@Param("phongBanId") Long phongBanId);
    
    // Đánh giá chờ duyệt
    @Query("SELECT d FROM DanhGia d WHERE d.trangThai = 'CHO_DUYET' ORDER BY d.createdAt ASC")
    List<DanhGia> findPendingApproval();
    
    // Đánh giá xuất sắc trong năm
    @Query("SELECT d FROM DanhGia d WHERE d.xepLoai = 'XUAT_SAC' AND YEAR(d.ngayHoanThanh) = :year ORDER BY d.diemTong DESC")
    List<DanhGia> findExcellentPerformanceByYear(@Param("year") int year);
    
    // Thống kê số lượng đánh giá theo xếp loại
    @Query("SELECT d.xepLoai, COUNT(d) FROM DanhGia d WHERE YEAR(d.ngayHoanThanh) = :year GROUP BY d.xepLoai")
    List<Object[]> countByRatingAndYear(@Param("year") int year);
    
    // Tìm nhân viên cần đánh giá (chưa có đánh giá trong kỳ)
    @Query(value = "SELECT nv.* FROM nhan_vien nv " +
           "WHERE nv.trang_thai = 'DANG_LAM_VIEC' " +
           "AND NOT EXISTS (SELECT 1 FROM danh_gia dg " +
           "WHERE dg.nhanvien_id = nv.nhanvien_id " +
           "AND dg.ky_danh_gia = :kyDanhGia " +
           "AND dg.loai_danh_gia = :loaiDanhGia)", 
           nativeQuery = true)
    List<Object[]> findEmployeesNeedEvaluation(@Param("kyDanhGia") String kyDanhGia, 
                                               @Param("loaiDanhGia") String loaiDanhGia);
    
    // Phân trang đánh giá
    Page<DanhGia> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    // Tìm đánh giá theo nhân viên với phân trang
    Page<DanhGia> findByNhanVien_NhanvienIdOrderByCreatedAtDesc(Long nhanvienId, Pageable pageable);
}
