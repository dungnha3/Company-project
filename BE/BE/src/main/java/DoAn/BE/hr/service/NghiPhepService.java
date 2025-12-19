package DoAn.BE.hr.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.hr.dto.NghiPhepRequest;
import DoAn.BE.hr.entity.NghiPhep;
import DoAn.BE.hr.entity.NghiPhep.TrangThaiNghiPhep;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.repository.NghiPhepRepository;
import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.notification.service.HRNotificationService;
import DoAn.BE.notification.service.FCMService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import jakarta.transaction.Transactional;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;

// Service quản lý nghỉ phép (tạo, duyệt, từ chối, thống kê)
@Service
@Transactional
@Slf4j
public class NghiPhepService {

    private final NghiPhepRepository nghiPhepRepository;
    private final NhanVienRepository nhanVienRepository;
    private final UserRepository userRepository;
    private final HRNotificationService hrNotificationService;
    private final FCMService fcmService;

    public NghiPhepService(NghiPhepRepository nghiPhepRepository,
            NhanVienRepository nhanVienRepository,
            UserRepository userRepository,
            HRNotificationService hrNotificationService,
            FCMService fcmService) {
        this.nghiPhepRepository = nghiPhepRepository;
        this.nhanVienRepository = nhanVienRepository;
        this.userRepository = userRepository;
        this.hrNotificationService = hrNotificationService;
        this.fcmService = fcmService;
    }

    // Tạo đơn nghỉ phép mới - Employee tự tạo
    public NghiPhep createNghiPhep(NghiPhepRequest request, User currentUser) {
        // Admin không có quyền
        if (currentUser.isAdmin()) {
            throw new ForbiddenException("Admin không có quyền tạo đơn nghỉ phép");
        }

        log.info("User {} tạo đơn nghỉ phép cho nhân viên ID: {}", currentUser.getUsername(), request.getNhanvienId());
        NhanVien nhanVien = nhanVienRepository.findById(request.getNhanvienId())
                .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
        if (request.getNgayKetThuc().isBefore(request.getNgayBatDau())) {
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        NghiPhep nghiPhep = new NghiPhep();
        nghiPhep.setNhanVien(nhanVien);
        nghiPhep.setLoaiPhep(request.getLoaiPhep());
        nghiPhep.setNgayBatDau(request.getNgayBatDau());
        nghiPhep.setNgayKetThuc(request.getNgayKetThuc());
        nghiPhep.setLyDo(request.getLyDo());
        nghiPhep.setTrangThai(TrangThaiNghiPhep.CHO_DUYET);

        return nghiPhepRepository.save(nghiPhep);
    }

    /**
     * Lấy thông tin nghỉ phép theo ID
     * - Accounting/PM: xem tất cả
     * - Employee: chỉ xem của mình
     */
    public NghiPhep getNghiPhepById(Long id, User currentUser) {
        NghiPhep nghiPhep = nghiPhepRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Đơn nghỉ phép không tồn tại"));

        // Admin không có quyền xem
        if (currentUser.isAdmin()) {
            throw new ForbiddenException("Admin không có quyền truy cập dữ liệu nghỉ phép");
        }

        // HR/Accounting/Project Manager xem tất cả
        if (PermissionUtil.canViewLeave(currentUser)) {
            return nghiPhep;
        }

        // Employee chỉ xem của mình
        if (!nghiPhep.getNhanVien().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn không có quyền xem đơn nghỉ phép này");
        }

        return nghiPhep;
    }

    public NghiPhep getNghiPhepById(Long id) {
        return nghiPhepRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Đơn nghỉ phép không tồn tại"));
    }

    /**
     * Lấy danh sách tất cả nghỉ phép - HR/Accounting/Project Manager
     */
    public List<NghiPhep> getAllNghiPhep(User currentUser) {
        if (!PermissionUtil.canViewLeave(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền xem danh sách nghỉ phép");
        }
        return nghiPhepRepository.findAll();
    }

    public List<NghiPhep> getAllNghiPhep() {
        return nghiPhepRepository.findAll();
    }

    /**
     * Cập nhật đơn nghỉ phép - Employee chỉ sửa của mình
     */
    public NghiPhep updateNghiPhep(Long id, NghiPhepRequest request, User currentUser) {
        NghiPhep nghiPhep = getNghiPhepById(id, currentUser);

        // Employee chỉ sửa đơn của mình, Manager không được sửa
        if (!nghiPhep.getNhanVien().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn chỉ có thể sửa đơn nghỉ phép của chính mình");
        }

        log.info("User {} cập nhật đơn nghỉ phép ID: {}", currentUser.getUsername(), id);

        // Chỉ cho phép cập nhật nếu đang chờ duyệt
        if (nghiPhep.getTrangThai() != TrangThaiNghiPhep.CHO_DUYET) {
            throw new BadRequestException("Chỉ có thể cập nhật đơn đang chờ duyệt");
        }

        // Không cho đổi nhân viên
        if (request.getNhanvienId() != null &&
                !request.getNhanvienId().equals(nghiPhep.getNhanVien().getNhanvienId())) {
            throw new BadRequestException("Không thể thay đổi nhân viên");
        }

        // Cập nhật các trường
        if (request.getLoaiPhep() != null) {
            nghiPhep.setLoaiPhep(request.getLoaiPhep());
        }
        if (request.getNgayBatDau() != null) {
            nghiPhep.setNgayBatDau(request.getNgayBatDau());
        }
        if (request.getNgayKetThuc() != null) {
            nghiPhep.setNgayKetThuc(request.getNgayKetThuc());
        }
        if (request.getLyDo() != null) {
            nghiPhep.setLyDo(request.getLyDo());
        }

        // Validate lại ngày
        if (nghiPhep.getNgayKetThuc().isBefore(nghiPhep.getNgayBatDau())) {
            throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        return nghiPhepRepository.save(nghiPhep);
    }

    /**
     * Xóa đơn nghỉ phép
     */
    public void deleteNghiPhep(Long id) {
        NghiPhep nghiPhep = getNghiPhepById(id);

        // Chỉ cho phép xóa nếu đang chờ duyệt
        if (nghiPhep.getTrangThai() != TrangThaiNghiPhep.CHO_DUYET) {
            throw new BadRequestException("Chỉ có thể xóa đơn đang chờ duyệt");
        }

        nghiPhepRepository.delete(nghiPhep);
    }

    /**
     * Lấy nghỉ phép theo nhân viên
     */
    public List<NghiPhep> getNghiPhepByNhanVien(Long nhanvienId) {
        return nghiPhepRepository.findByNhanVien_NhanvienId(nhanvienId);
    }

    /**
     * Lấy nghỉ phép trong khoảng thời gian
     */
    public List<NghiPhep> getNghiPhepInDateRange(LocalDate startDate, LocalDate endDate) {
        return nghiPhepRepository.findByNgayBatDauLessThanEqualAndNgayKetThucGreaterThanEqual(endDate, startDate);
    }

    /**
     * PM duyệt đơn nghỉ phép (Step 1: Kiểm tra tiến độ dự án)
     */
    public NghiPhep approvePM(Long id, String note, User currentUser) {
        if (!currentUser.isManagerProject()) {
            throw new ForbiddenException("Chỉ Project Manager mới có quyền duyệt về mặt tiến độ dự án");
        }

        log.info("PM {} duyệt đơn nghỉ phép ID: {}", currentUser.getUsername(), id);
        NghiPhep nghiPhep = getNghiPhepById(id);

        if (nghiPhep.getTrangThai() != TrangThaiNghiPhep.CHO_DUYET) {
            throw new BadRequestException("Đơn này đã được xử lý hoặc đang chờ Accounting");
        }

        nghiPhep.approvePM(currentUser, note);
        NghiPhep saved = nghiPhepRepository.save(nghiPhep);
        log.info("✅ PM đã duyệt đơn nghỉ phép, chờ Accounting duyệt phép tồn");

        return saved;
    }

    /**
     * Accounting duyệt đơn nghỉ phép (Step 2: Kiểm tra phép tồn/lương)
     */
    public NghiPhep approveAccounting(Long id, String note, User currentUser) {
        if (!currentUser.isManagerAccounting()) {
            throw new ForbiddenException("Chỉ Accounting Manager mới có quyền duyệt về mặt phép tồn/lương");
        }

        log.info("Accounting {} duyệt đơn nghỉ phép ID: {}", currentUser.getUsername(), id);
        NghiPhep nghiPhep = getNghiPhepById(id);

        if (nghiPhep.getTrangThai() != TrangThaiNghiPhep.PM_APPROVED) {
            throw new BadRequestException("Đơn này cần PM duyệt trước hoặc đã được xử lý");
        }

        nghiPhep.approveAccounting(currentUser, note);
        NghiPhep saved = nghiPhepRepository.save(nghiPhep);
        log.info("✅ Accounting đã duyệt đơn nghỉ phép - Hoàn tất 2-step approval");

        // 🔔 Gửi notification + Push FCM cho nhân viên khi hoàn tất
        try {
            User employeeUser = nghiPhep.getNhanVien().getUser();
            if (employeeUser != null) {
                hrNotificationService.createLeaveApprovedNotification(
                        employeeUser.getUserId(),
                        nghiPhep.getNgayBatDau().toString(),
                        nghiPhep.getNgayKetThuc().toString());

                // 📱 Push FCM notification
                if (employeeUser.getFcmToken() != null) {
                    Map<String, String> data = new HashMap<>();
                    data.put("type", "LEAVE_APPROVED");
                    data.put("link", "/leave-request");
                    fcmService.sendToDevice(
                            employeeUser.getFcmToken(),
                            "✅ Đơn nghỉ phép được duyệt",
                            "Đơn nghỉ từ " + nghiPhep.getNgayBatDau() + " đến " + nghiPhep.getNgayKetThuc()
                                    + " đã được duyệt",
                            data);
                }
            }
        } catch (Exception e) {
            log.warn("Không thể gửi notification: {}", e.getMessage());
        }

        return saved;
    }

    /**
     * Legacy approve method (backward compatibility)
     * Duyệt đơn nghỉ phép - Chỉ Accounting/PM
     */
    public NghiPhep approveNghiPhep(Long id, String note, User currentUser) {
        if (!PermissionUtil.canApproveLeave(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền duyệt nghỉ phép");
        }

        log.info("Phê duyệt đơn nghỉ phép ID: {} bởi user: {}", id, currentUser.getUsername());
        NghiPhep nghiPhep = getNghiPhepById(id);

        if (nghiPhep.getTrangThai() != TrangThaiNghiPhep.CHO_DUYET) {
            throw new BadRequestException("Đơn này đã được xử lý");
        }

        nghiPhep.approve(currentUser, note);
        NghiPhep saved = nghiPhepRepository.save(nghiPhep);
        log.info("✅ Đã phê duyệt đơn nghỉ phép cho nhân viên: {}", nghiPhep.getNhanVien().getHoTen());

        // 🔔 Gửi notification + Push FCM cho nhân viên
        try {
            User employeeUser = nghiPhep.getNhanVien().getUser();
            if (employeeUser != null) {
                hrNotificationService.createLeaveApprovedNotification(
                        employeeUser.getUserId(),
                        nghiPhep.getNgayBatDau().toString(),
                        nghiPhep.getNgayKetThuc().toString());

                // 📱 Push FCM notification
                if (employeeUser.getFcmToken() != null) {
                    Map<String, String> data = new HashMap<>();
                    data.put("type", "LEAVE_APPROVED");
                    data.put("link", "/leave-request");
                    fcmService.sendToDevice(
                            employeeUser.getFcmToken(),
                            "✅ Đơn nghỉ phép được duyệt",
                            "Đơn nghỉ từ " + nghiPhep.getNgayBatDau() + " đến " + nghiPhep.getNgayKetThuc()
                                    + " đã được duyệt",
                            data);
                }
            }
        } catch (Exception e) {
            log.warn("Không thể gửi notification: {}", e.getMessage());
        }

        return saved;
    }

    /**
     * Từ chối đơn nghỉ phép - Chỉ Accounting/PM
     */
    public NghiPhep rejectNghiPhep(Long id, String note, User currentUser) {
        if (!PermissionUtil.canApproveLeave(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền từ chối nghỉ phép");
        }

        log.info("Từ chối đơn nghỉ phép ID: {} bởi user: {}", id, currentUser.getUsername());
        NghiPhep nghiPhep = getNghiPhepById(id);

        if (nghiPhep.getTrangThai() != TrangThaiNghiPhep.CHO_DUYET) {
            throw new BadRequestException("Đơn này đã được xử lý");
        }

        nghiPhep.reject(currentUser, note);
        NghiPhep saved = nghiPhepRepository.save(nghiPhep);
        log.info("❌ Đã từ chối đơn nghỉ phép cho nhân viên: {}", nghiPhep.getNhanVien().getHoTen());

        // 🔔 Gửi notification + Push FCM cho nhân viên
        try {
            User employeeUser = nghiPhep.getNhanVien().getUser();
            if (employeeUser != null) {
                String reason = note != null ? note : "Không có lý do cụ thể";
                hrNotificationService.createLeaveRejectedNotification(
                        employeeUser.getUserId(),
                        nghiPhep.getNgayBatDau().toString(),
                        nghiPhep.getNgayKetThuc().toString(),
                        reason);

                // 📱 Push FCM notification
                if (employeeUser.getFcmToken() != null) {
                    Map<String, String> data = new HashMap<>();
                    data.put("type", "LEAVE_REJECTED");
                    data.put("link", "/leave-request");
                    fcmService.sendToDevice(
                            employeeUser.getFcmToken(),
                            "❌ Đơn nghỉ phép bị từ chối",
                            "Đơn nghỉ từ " + nghiPhep.getNgayBatDau() + " đến " + nghiPhep.getNgayKetThuc()
                                    + " bị từ chối. Lý do: " + reason,
                            data);
                }
            }
        } catch (Exception e) {
            log.warn("Không thể gửi notification: {}", e.getMessage());
        }

        return saved;
    }

    /**
     * Lấy danh sách đơn chờ duyệt
     */
    public List<NghiPhep> getPendingNghiPhep() {
        return nghiPhepRepository.findByTrangThai(TrangThaiNghiPhep.CHO_DUYET);
    }

    /**
     * Lấy danh sách đơn đã duyệt
     */
    public List<NghiPhep> getApprovedNghiPhep() {
        return nghiPhepRepository.findByTrangThai(TrangThaiNghiPhep.DA_DUYET);
    }

    /**
     * Lấy danh sách đơn bị từ chối
     */
    public List<NghiPhep> getRejectedNghiPhep() {
        return nghiPhepRepository.findByTrangThai(TrangThaiNghiPhep.TU_CHOI);
    }

    /**
     * Tính tổng số ngày nghỉ của nhân viên trong năm
     */
    public int getTotalLeaveDays(Long nhanvienId, int year) {
        List<NghiPhep> nghiPheps = nghiPhepRepository.findApprovedByNhanVienAndYear(nhanvienId, year);
        return nghiPheps.stream()
                .mapToInt(NghiPhep::getSoNgay)
                .sum();
    }

    /**
     * Kiểm tra nhân viên có đang nghỉ phép không
     */
    public boolean isOnLeave(Long nhanvienId, LocalDate date) {
        return nghiPhepRepository.isNhanVienOnLeave(nhanvienId, date);
    }
}
