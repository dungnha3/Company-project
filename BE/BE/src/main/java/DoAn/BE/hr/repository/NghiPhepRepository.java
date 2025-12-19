package DoAn.BE.hr.repository;

import DoAn.BE.hr.entity.NghiPhep;
import DoAn.BE.hr.entity.NghiPhep.TrangThaiNghiPhep;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NghiPhepRepository extends JpaRepository<NghiPhep, Long> {

        // Tìm theo nhân viên
        // Tìm theo nhân viên
        @Query("SELECT np FROM NghiPhep np JOIN FETCH np.nhanVien LEFT JOIN FETCH np.nguoiDuyet WHERE np.nhanVien.nhanvienId = :nhanvienId")
        List<NghiPhep> findByNhanVien_NhanvienId(@Param("nhanvienId") Long nhanvienId);

        // Tìm theo khoảng thời gian
        List<NghiPhep> findByNgayBatDauLessThanEqualAndNgayKetThucGreaterThanEqual(LocalDate end, LocalDate start);

        // Tìm theo trạng thái
        List<NghiPhep> findByTrangThai(TrangThaiNghiPhep trangThai);

        // Tìm theo nhân viên và trạng thái
        List<NghiPhep> findByNhanVien_NhanvienIdAndTrangThai(Long nhanvienId, TrangThaiNghiPhep trangThai);

        // Tìm theo nhân viên và năm (đã duyệt)
        @Query("SELECT np FROM NghiPhep np WHERE np.nhanVien.nhanvienId = :nhanvienId " +
                        "AND np.trangThai = 'DA_DUYET' " +
                        "AND (YEAR(np.ngayBatDau) = :year OR YEAR(np.ngayKetThuc) = :year)")
        List<NghiPhep> findApprovedByNhanVienAndYear(@Param("nhanvienId") Long nhanvienId, @Param("year") int year);

        // Kiểm tra nhân viên có đang nghỉ không
        @Query("SELECT COUNT(np) > 0 FROM NghiPhep np WHERE np.nhanVien.nhanvienId = :nhanvienId " +
                        "AND np.trangThai = 'DA_DUYET' " +
                        "AND :date BETWEEN np.ngayBatDau AND np.ngayKetThuc")
        boolean isNhanVienOnLeave(@Param("nhanvienId") Long nhanvienId, @Param("date") LocalDate date);

        // Đếm theo trạng thái
        long countByTrangThai(TrangThaiNghiPhep trangThai);

        // Tìm theo người duyệt
        List<NghiPhep> findByNguoiDuyet_UserId(Long nguoiDuyetId);

        // Thống kê theo loại phép (cần cho dashboard)
        @Query("SELECT np.loaiPhep, COUNT(np) FROM NghiPhep np GROUP BY np.loaiPhep")
        List<Object[]> getStatsByLoaiPhep();

        // Đếm theo loại phép và trạng thái
        long countByLoaiPhepAndTrangThai(DoAn.BE.hr.entity.NghiPhep.LoaiPhep loaiPhep, TrangThaiNghiPhep trangThai);

        // Tìm theo khoảng ngày bắt đầu (cần cho export)
        List<NghiPhep> findByNgayBatDauBetween(LocalDate startDate, LocalDate endDate);
}
