package DoAn.BE.notification.repository;

import DoAn.BE.notification.entity.ThongBao;
import DoAn.BE.notification.entity.ThongBao.LoaiThongBao;
import DoAn.BE.notification.entity.ThongBao.TrangThaiThongBao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ThongBaoRepository extends JpaRepository<ThongBao, Long> {

    // Lấy thông báo theo người nhận
    @Query("SELECT tb FROM ThongBao tb WHERE tb.nguoiNhan.userId = :userId AND tb.trangThai != 'DA_XOA' ORDER BY tb.ngayTao DESC")
    List<ThongBao> findByNguoiNhanUserId(@Param("userId") Long userId);

    @Query("SELECT tb FROM ThongBao tb WHERE tb.nguoiNhan.userId = :userId AND tb.trangThai != 'DA_XOA'")
    Page<ThongBao> findByNguoiNhanUserId(@Param("userId") Long userId, Pageable pageable);

    // Lấy TẤT CẢ thông báo trong hệ thống (Admin only)
    @Query("SELECT tb FROM ThongBao tb WHERE tb.trangThai != 'DA_XOA'")
    Page<ThongBao> findAllNotifications(Pageable pageable);

    // Đếm thông báo chưa đọc
    @Query("SELECT COUNT(tb) FROM ThongBao tb WHERE tb.nguoiNhan.userId = :userId AND tb.trangThai = 'CHUA_DOC'")
    long countUnreadByUserId(@Param("userId") Long userId);

    // Lấy thông báo theo loại
    @Query("SELECT tb FROM ThongBao tb WHERE tb.nguoiNhan.userId = :userId AND tb.loai = :loai AND tb.trangThai != 'DA_XOA' ORDER BY tb.ngayTao DESC")
    List<ThongBao> findByUserIdAndLoai(@Param("userId") Long userId, @Param("loai") LoaiThongBao loai);

    // Lấy thông báo chưa đọc
    @Query("SELECT tb FROM ThongBao tb WHERE tb.nguoiNhan.userId = :userId AND tb.trangThai = 'CHUA_DOC' ORDER BY tb.ngayTao DESC")
    List<ThongBao> findUnreadByUserId(@Param("userId") Long userId);

    // Đánh dấu tất cả đã đọc
    @Modifying
    @Query("UPDATE ThongBao tb SET tb.trangThai = 'DA_DOC', tb.ngayDoc = :ngayDoc WHERE tb.nguoiNhan.userId = :userId AND tb.trangThai = 'CHUA_DOC'")
    int markAllAsReadByUserId(@Param("userId") Long userId, @Param("ngayDoc") LocalDateTime ngayDoc);

    // Xóa thông báo cũ (soft delete)
    @Modifying
    @Query("UPDATE ThongBao tb SET tb.trangThai = 'DA_XOA' WHERE tb.ngayTao < :cutoffDate")
    int softDeleteOldNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);

    // Lấy thông báo cần gửi email
    @Query("SELECT tb FROM ThongBao tb WHERE tb.guiEmail = true AND tb.ngayGuiEmail IS NULL AND tb.trangThai != 'DA_XOA'")
    List<ThongBao> findPendingEmailNotifications();

    // Lấy thông báo theo khoảng thời gian
    @Query("SELECT tb FROM ThongBao tb WHERE tb.nguoiNhan.userId = :userId AND tb.ngayTao BETWEEN :startDate AND :endDate AND tb.trangThai != 'DA_XOA' ORDER BY tb.ngayTao DESC")
    List<ThongBao> findByUserIdAndDateRange(@Param("userId") Long userId, @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    // Thống kê thông báo theo loại
    @Query("SELECT tb.loai, COUNT(tb) FROM ThongBao tb WHERE tb.nguoiNhan.userId = :userId AND tb.trangThai != 'DA_XOA' GROUP BY tb.loai")
    List<Object[]> getNotificationStatsByUserId(@Param("userId") Long userId);

    // Lấy thông báo ưu tiên cao
    @Query("SELECT tb FROM ThongBao tb WHERE tb.nguoiNhan.userId = :userId AND tb.uuTien IN ('CAO', 'KHAN_CAP') AND tb.trangThai = 'CHUA_DOC' ORDER BY tb.uuTien DESC, tb.ngayTao DESC")
    List<ThongBao> findHighPriorityByUserId(@Param("userId") Long userId);

    // Xóa thông báo cũ hoàn toàn (hard delete - cho cleanup job)
    @Modifying
    @Query("DELETE FROM ThongBao tb WHERE tb.ngayTao < :cutoffDate")
    int deleteOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);

    // Đếm thông báo cũ (để log trước khi xóa)
    @Query("SELECT COUNT(tb) FROM ThongBao tb WHERE tb.ngayTao < :cutoffDate")
    long countOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);
}
