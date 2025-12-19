package DoAn.BE.notification.service;

import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.notification.dto.CreateThongBaoRequest;
import DoAn.BE.notification.dto.ThongBaoDTO;
import DoAn.BE.notification.entity.ThongBao;
import DoAn.BE.notification.entity.ThongBao.LoaiThongBao;
import DoAn.BE.notification.entity.ThongBao.TrangThaiThongBao;
import DoAn.BE.notification.repository.ThongBaoRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Service quản lý thông báo chi tiết (HR, system với priority, email, pagination)
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ThongBaoService {

    private final ThongBaoRepository thongBaoRepository;
    private final UserRepository userRepository;
    private final EmailNotificationService emailNotificationService;

    // Tạo thông báo mới
    public ThongBaoDTO createThongBao(CreateThongBaoRequest request, User nguoiGui) {
        log.info("Tạo thông báo mới: {} cho user {}", request.getLoai(), request.getNguoiNhanId());

        User nguoiNhan = userRepository.findById(request.getNguoiNhanId())
                .orElseThrow(() -> new EntityNotFoundException("Người nhận không tồn tại"));

        ThongBao thongBao = new ThongBao();
        thongBao.setLoai(request.getLoai());
        thongBao.setTieuDe(request.getTieuDe());
        thongBao.setNoiDung(request.getNoiDung());
        thongBao.setNguoiNhan(nguoiNhan);
        thongBao.setNguoiGui(nguoiGui);
        thongBao.setUrlLienKet(request.getUrlLienKet());
        thongBao.setMetadata(request.getMetadata());
        thongBao.setUuTien(request.getUuTien());
        thongBao.setGuiEmail(request.getGuiEmail());

        thongBao = thongBaoRepository.save(thongBao);

        if (request.getGuiEmail()) {
            try {
                emailNotificationService.sendNotificationEmail(thongBao);
                thongBao.setNgayGuiEmail(LocalDateTime.now());
                thongBaoRepository.save(thongBao);
            } catch (Exception e) {
                log.error("Lỗi gửi email thông báo: {}", e.getMessage());
            }
        }

        return toDTO(thongBao);
    }

    /**
     * Tạo thông báo hệ thống (không cần người gửi)
     */
    public ThongBaoDTO createSystemNotification(CreateThongBaoRequest request) {
        return createThongBao(request, null);
    }

    /**
     * Lấy thông báo của user
     */
    @Transactional(readOnly = true)
    public List<ThongBaoDTO> getUserNotifications(Long userId) {
        List<ThongBao> notifications = thongBaoRepository.findByNguoiNhanUserId(userId);
        return notifications.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Lấy thông báo với phân trang
     */
    @Transactional(readOnly = true)
    public Page<ThongBaoDTO> getUserNotifications(Long userId, Pageable pageable) {
        Page<ThongBao> notifications = thongBaoRepository.findByNguoiNhanUserId(userId, pageable);
        return notifications.map(this::toDTO);
    }

    /**
     * Lấy TẤT CẢ thông báo trong hệ thống (Admin only)
     */
    @Transactional(readOnly = true)
    public Page<ThongBaoDTO> getAllNotifications(Pageable pageable) {
        Page<ThongBao> notifications = thongBaoRepository.findAllNotifications(pageable);
        return notifications.map(this::toDTO);
    }

    /**
     * Đếm thông báo chưa đọc
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return thongBaoRepository.countUnreadByUserId(userId);
    }

    /**
     * Đánh dấu thông báo đã đọc
     */
    public void markAsRead(Long thongBaoId, Long userId) {
        ThongBao thongBao = thongBaoRepository.findById(thongBaoId)
                .orElseThrow(() -> new EntityNotFoundException("Thông báo không tồn tại"));

        if (!thongBao.getNguoiNhan().getUserId().equals(userId)) {
            throw new ForbiddenException("Không có quyền truy cập thông báo này");
        }

        thongBao.markAsRead();
        thongBaoRepository.save(thongBao);
    }

    /**
     * Đánh dấu tất cả thông báo đã đọc
     */
    public void markAllAsRead(Long userId) {
        thongBaoRepository.markAllAsReadByUserId(userId, LocalDateTime.now());
    }

    /**
     * Xóa thông báo (soft delete)
     */
    public void deleteNotification(Long thongBaoId, Long userId) {
        ThongBao thongBao = thongBaoRepository.findById(thongBaoId)
                .orElseThrow(() -> new EntityNotFoundException("Thông báo không tồn tại"));

        if (!thongBao.getNguoiNhan().getUserId().equals(userId)) {
            throw new ForbiddenException("Không có quyền xóa thông báo này");
        }

        thongBao.setTrangThai(TrangThaiThongBao.DA_XOA);
        thongBaoRepository.save(thongBao);
    }

    /**
     * Lấy thông báo theo loại
     */
    @Transactional(readOnly = true)
    public List<ThongBaoDTO> getNotificationsByType(Long userId, LoaiThongBao loai) {
        List<ThongBao> notifications = thongBaoRepository.findByUserIdAndLoai(userId, loai);
        return notifications.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Lấy thông báo ưu tiên cao
     */
    @Transactional(readOnly = true)
    public List<ThongBaoDTO> getHighPriorityNotifications(Long userId) {
        List<ThongBao> notifications = thongBaoRepository.findHighPriorityByUserId(userId);
        return notifications.stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Thống kê thông báo theo loại
     */
    @Transactional(readOnly = true)
    public Map<LoaiThongBao, Long> getNotificationStats(Long userId) {
        List<Object[]> stats = thongBaoRepository.getNotificationStatsByUserId(userId);
        return stats.stream().collect(Collectors.toMap(
                row -> (LoaiThongBao) row[0],
                row -> (Long) row[1]));
    }

    /**
     * Dọn dẹp thông báo cũ (chạy định kỳ)
     */
    public void cleanupOldNotifications(int daysToKeep) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);
        int deletedCount = thongBaoRepository.softDeleteOldNotifications(cutoffDate);
        log.info("Đã dọn dẹp {} thông báo cũ", deletedCount);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Tạo thông báo hợp đồng hết hạn
     */
    public void createContractExpiryNotification(Long userId, String tenNhanVien, String loaiHopDong,
            LocalDateTime ngayHetHan) {
        CreateThongBaoRequest request = new CreateThongBaoRequest();
        request.setLoai(LoaiThongBao.HOP_DONG_HET_HAN);
        request.setTieuDe("Hợp đồng sắp hết hạn");
        request.setNoiDung(String.format("Hợp đồng %s của nhân viên %s sẽ hết hạn vào %s",
                loaiHopDong, tenNhanVien, ngayHetHan.toLocalDate()));
        request.setNguoiNhanId(userId);
        request.setGuiEmail(true);

        createSystemNotification(request);
    }

    /**
     * Tạo thông báo nghỉ phép cần duyệt
     */
    public void createLeaveApprovalNotification(Long managerId, String tenNhanVien, String loaiNghi,
            LocalDateTime ngayBatDau) {
        CreateThongBaoRequest request = new CreateThongBaoRequest();
        request.setLoai(LoaiThongBao.NGHI_PHEP_CHO_DUYET);
        request.setTieuDe("Đơn nghỉ phép cần duyệt");
        request.setNoiDung(String.format("Nhân viên %s đã gửi đơn %s từ ngày %s",
                tenNhanVien, loaiNghi, ngayBatDau.toLocalDate()));
        request.setNguoiNhanId(managerId);
        request.setGuiEmail(true);

        createSystemNotification(request);
    }

    /**
     * Tạo thông báo lương đã duyệt
     */
    public void createSalaryApprovedNotification(Long userId, String thangNam, String soTien) {
        CreateThongBaoRequest request = new CreateThongBaoRequest();
        request.setLoai(LoaiThongBao.LUONG_DA_DUYET);
        request.setTieuDe("Lương đã được duyệt");
        request.setNoiDung(String.format("Lương tháng %s của bạn (%s) đã được duyệt", thangNam, soTien));
        request.setNguoiNhanId(userId);
        request.setGuiEmail(true);

        createSystemNotification(request);
    }

    private ThongBaoDTO toDTO(ThongBao thongBao) {
        ThongBaoDTO dto = new ThongBaoDTO();
        dto.setThongbaoId(thongBao.getThongbaoId());
        dto.setLoai(thongBao.getLoai());
        dto.setTieuDe(thongBao.getTieuDe());
        dto.setNoiDung(thongBao.getNoiDung());
        dto.setNguoiNhanId(thongBao.getNguoiNhan().getUserId());
        dto.setNguoiNhanUsername(thongBao.getNguoiNhan().getUsername());

        if (thongBao.getNguoiGui() != null) {
            dto.setNguoiGuiId(thongBao.getNguoiGui().getUserId());
            dto.setNguoiGuiUsername(thongBao.getNguoiGui().getUsername());
        }

        dto.setTrangThai(thongBao.getTrangThai());
        dto.setNgayTao(thongBao.getNgayTao());
        dto.setNgayDoc(thongBao.getNgayDoc());
        dto.setUrlLienKet(thongBao.getUrlLienKet());
        dto.setMetadata(thongBao.getMetadata());
        dto.setUuTien(thongBao.getUuTien());
        dto.setGuiEmail(thongBao.getGuiEmail());
        dto.setNgayGuiEmail(thongBao.getNgayGuiEmail());

        return dto;
    }
}
