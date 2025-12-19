package DoAn.BE.hr.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.common.util.GPSUtil;
import DoAn.BE.hr.dto.ChamCongGPSRequest;
import DoAn.BE.hr.dto.ChamCongRequest;
import DoAn.BE.hr.entity.ChamCong;
import DoAn.BE.hr.entity.ChamCong.PhuongThucChamCong;
import DoAn.BE.hr.entity.ChamCong.TrangThaiChamCong;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.repository.ChamCongRepository;
import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.user.entity.User;
import jakarta.transaction.Transactional;

// Service quản lý chấm công (check-in, check-out, GPS validation, thống kê)
@Service
@Transactional
@Slf4j
public class ChamCongService {

    // Tọa độ công ty (configurable)
    @Value("${company.latitude:21.0285}")
    private Double companyLatitude;

    @Value("${company.longitude:105.8542}")
    private Double companyLongitude;

    @Value("${company.radius:500}")
    private Double allowedRadius; // Bán kính cho phép (meters)

    private final ChamCongRepository chamCongRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final DoAn.BE.notification.service.AttendanceNotificationService attendanceNotificationService;

    public ChamCongService(ChamCongRepository chamCongRepository,
            NhanVienRepository nhanVienRepository,
            ProjectMemberRepository projectMemberRepository,
            DoAn.BE.notification.service.AttendanceNotificationService attendanceNotificationService) {
        this.chamCongRepository = chamCongRepository;
        this.nhanVienRepository = nhanVienRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.attendanceNotificationService = attendanceNotificationService;
    }

    /**
     * Tạo chấm công mới
     */
    /**
     * Tạo chấm công - Tất cả trừ Admin
     */
    public ChamCong createChamCong(ChamCongRequest request, User currentUser) {
        if (!PermissionUtil.canPerformAttendance(currentUser)) {
            throw new ForbiddenException("Admin không có quyền thực hiện chấm công");
        }
        Long nhanvienId = request.getNhanvienId();
        if (nhanvienId == null) {
            throw new BadRequestException("ID nhân viên không được để trống");
        }

        log.info("User {} tạo chấm công cho nhân viên ID: {}", currentUser.getUsername(), nhanvienId);
        // Kiểm tra nhân viên tồn tại
        NhanVien nhanVien = nhanVienRepository.findById(nhanvienId)
                .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));

        ChamCong chamCong = new ChamCong();
        chamCong.setNhanVien(nhanVien);
        chamCong.setNgayCham(request.getNgayCham());
        chamCong.setGioVao(request.getGioVao());
        chamCong.setGioRa(request.getGioRa());
        chamCong.setTrangThai(request.getTrangThai());
        chamCong.setGhiChu(request.getGhiChu());

        return chamCongRepository.save(chamCong);
    }

    /**
     * Lấy thông tin chấm công theo ID
     */
    /**
     * Lấy thông tin chấm công theo ID
     * - Accounting Manager: xem tất cả
     * - Employee: chỉ xem của mình
     */
    public ChamCong getChamCongById(Long id, User currentUser) {
        ChamCong chamCong = chamCongRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Chấm công không tồn tại"));

        // Admin không có quyền xem
        if (currentUser.isAdmin()) {
            throw new ForbiddenException("Admin không có quyền truy cập dữ liệu chấm công");
        }

        // HR/Accounting Manager xem tất cả, Project Manager xem team
        if (PermissionUtil.canViewTeamAttendance(currentUser)) {
            // Project Manager cần kiểm tra thêm ở service layer nếu cần
            return chamCong;
        }

        // Employee chỉ xem của mình
        if (!chamCong.getNhanVien().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn không có quyền xem chấm công này");
        }

        return chamCong;
    }

    public ChamCong getChamCongById(Long id) {
        return chamCongRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Chấm công không tồn tại"));
    }

    /**
     * Lấy danh sách tất cả chấm công
     */
    /**
     * Lấy danh sách tất cả chấm công - HR/Accounting/Project Manager
     */
    public List<ChamCong> getAllChamCong(User currentUser) {
        if (!PermissionUtil.canViewTeamAttendance(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền xem danh sách chấm công");
        }

        // HR và Accounting xem tất cả
        if (currentUser.isManagerHR() || currentUser.isManagerAccounting()) {
            return chamCongRepository.findAll();
        }

        // Project Manager chỉ xem team của mình
        if (currentUser.isManagerProject()) {
            List<Long> teamMemberIds = projectMemberRepository.findTeamMemberUserIdsByManager(currentUser.getUserId());
            return chamCongRepository.findByNhanVien_User_UserIdIn(teamMemberIds);
        }

        return chamCongRepository.findAll();
    }

    public List<ChamCong> getAllChamCong() {
        return chamCongRepository.findAll();
    }

    /**
     * Cập nhật chấm công - Tất cả trừ Admin
     */
    public ChamCong updateChamCong(Long id, ChamCongRequest request, User currentUser) {
        if (!PermissionUtil.canPerformAttendance(currentUser)) {
            throw new ForbiddenException("Admin không có quyền thực hiện chấm công");
        }
        log.info("User {} cập nhật chấm công ID: {}", currentUser.getUsername(), id);

        ChamCong chamCong = getChamCongById(id);

        // Không cho đổi nhân viên
        if (request.getNhanvienId() != null &&
                !request.getNhanvienId().equals(chamCong.getNhanVien().getNhanvienId())) {
            throw new DuplicateException("Không thể thay đổi nhân viên");
        }

        // Cập nhật các trường
        if (request.getNgayCham() != null) {
            chamCong.setNgayCham(request.getNgayCham());
        }
        if (request.getGioVao() != null) {
            chamCong.setGioVao(request.getGioVao());
        }
        if (request.getGioRa() != null) {
            chamCong.setGioRa(request.getGioRa());
        }
        if (request.getTrangThai() != null) {
            chamCong.setTrangThai(request.getTrangThai());
        }
        if (request.getGhiChu() != null) {
            chamCong.setGhiChu(request.getGhiChu());
        }

        return chamCongRepository.save(chamCong);
    }

    /**
     * Xóa chấm công - Tất cả trừ Admin
     */
    public void deleteChamCong(Long id, User currentUser) {
        if (!PermissionUtil.canPerformAttendance(currentUser)) {
            throw new ForbiddenException("Admin không có quyền thực hiện chấm công");
        }
        log.info("User {} xóa chấm công ID: {}", currentUser.getUsername(), id);

        ChamCong chamCong = getChamCongById(id);
        chamCongRepository.delete(chamCong);
    }

    /**
     * Lấy chấm công theo nhân viên
     * - Accounting Manager: xem tất cả
     * - Employee: chỉ xem của mình
     */
    public List<ChamCong> getChamCongByNhanVien(Long nhanvienId, User currentUser) {
        if (nhanvienId == null) {
            throw new BadRequestException("ID nhân viên không được để trống");
        }

        // Admin không có quyền
        if (currentUser.isAdmin()) {
            throw new ForbiddenException("Admin không có quyền truy cập dữ liệu chấm công");
        }

        // HR/Accounting Manager xem tất cả, Project Manager xem team
        if (!PermissionUtil.canViewTeamAttendance(currentUser)) {
            // Employee chỉ xem của mình
            NhanVien nhanVien = nhanVienRepository.findById(nhanvienId)
                    .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
            if (!nhanVien.getUser().getUserId().equals(currentUser.getUserId())) {
                throw new ForbiddenException("Bạn chỉ có thể xem chấm công của chính mình");
            }
        } else if (currentUser.isManagerProject()) {
            // Project Manager chỉ xem team của mình
            List<Long> teamMemberIds = projectMemberRepository.findTeamMemberUserIdsByManager(currentUser.getUserId());
            NhanVien nhanVien = nhanVienRepository.findById(nhanvienId)
                    .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));
            if (!teamMemberIds.contains(nhanVien.getUser().getUserId())) {
                throw new ForbiddenException("Bạn chỉ có thể xem chấm công của team members");
            }
        }
        return chamCongRepository.findByNhanVien_NhanvienIdOrderByNgayChamDesc(nhanvienId);
    }

    /**
     * Lấy chấm công theo khoảng thời gian
     */
    public List<ChamCong> getChamCongByDateRange(LocalDate startDate, LocalDate endDate) {
        return chamCongRepository.findByNgayChamBetween(startDate, endDate);
    }

    /**
     * Lấy chấm công của nhân viên trong tháng
     */
    public List<ChamCong> getChamCongByNhanVienAndMonth(Long nhanvienId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        return chamCongRepository.findByNhanVien_NhanvienIdAndNgayChamBetween(nhanvienId, startDate, endDate);
    }

    /**
     * Tính tổng số ngày công của nhân viên trong tháng
     */
    public int countWorkingDays(Long nhanvienId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        return chamCongRepository.countWorkingDaysByNhanVienAndMonth(nhanvienId, startDate, endDate);
    }

    /**
     * Tính tổng số giờ làm việc của nhân viên trong tháng
     */
    public BigDecimal getTotalWorkingHours(Long nhanvienId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        return chamCongRepository.sumWorkingHoursByNhanVienAndMonth(nhanvienId, startDate, endDate);
    }

    /**
     * Đếm số lần đi trễ của nhân viên trong tháng
     */
    public long countLateDays(Long nhanvienId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        return chamCongRepository.countLateDaysByNhanVienAndMonth(nhanvienId, startDate, endDate);
    }

    /**
     * Đếm số lần về sớm của nhân viên trong tháng
     */
    public long countEarlyLeaveDays(Long nhanvienId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        return chamCongRepository.countEarlyLeaveDaysByNhanVienAndMonth(nhanvienId, startDate, endDate);
    }

    /**
     * Check-in (chấm công vào)
     */
    public ChamCong checkIn(Long nhanvienId, LocalDate ngayCham) {
        NhanVien nhanVien = nhanVienRepository.findById(nhanvienId)
                .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));

        ChamCong chamCong = new ChamCong();
        chamCong.setNhanVien(nhanVien);
        chamCong.setNgayCham(ngayCham);
        chamCong.setGioVao(java.time.LocalTime.now());

        // Tự động xác định trạng thái
        if (chamCong.isLate()) {
            chamCong.setTrangThai(TrangThaiChamCong.DI_TRE);
        } else {
            chamCong.setTrangThai(TrangThaiChamCong.DU_GIO);
        }

        return chamCongRepository.save(chamCong);
    }

    /**
     * Check-out (chấm công ra)
     */
    public ChamCong checkOut(Long chamcongId) {
        ChamCong chamCong = getChamCongById(chamcongId);
        chamCong.setGioRa(java.time.LocalTime.now());

        // Cập nhật trạng thái
        if (chamCong.isEarlyLeave()) {
            chamCong.setTrangThai(TrangThaiChamCong.VE_SOM);
        } else if (!chamCong.isLate()) {
            chamCong.setTrangThai(TrangThaiChamCong.DU_GIO);
        }

        return chamCongRepository.save(chamCong);
    }

    /**
     * ⭐⭐⭐ CHẤM CÔNG GPS - Tính năng mới
     * Chấm công bằng GPS với kiểm tra vị trí
     * Tự động lấy nhanvienId từ user hiện tại nếu không được cung cấp
     */
    public Map<String, Object> chamCongGPS(ChamCongGPSRequest request, User currentUser) {
        log.info("Chấm công GPS cho user: {}", currentUser.getUsername());

        // 1. Lấy thông tin nhân viên từ user hiện tại
        Long nhanvienId = request.getNhanvienId();
        if (nhanvienId == null) {
            // Tự động lấy nhanvienId từ userId
            NhanVien nhanVien = nhanVienRepository.findByUser_UserId(currentUser.getUserId())
                    .orElseThrow(
                            () -> new EntityNotFoundException("Không tìm thấy thông tin nhân viên cho user hiện tại"));
            nhanvienId = nhanVien.getNhanvienId();
            log.info("Tự động lấy nhanvienId: {} từ userId: {}", nhanvienId, currentUser.getUserId());
        } else {
            // Kiểm tra quyền: chỉ cho phép chấm công cho chính mình (trừ HR/Accounting
            // Manager)
            if (!currentUser.isManagerHR() && !currentUser.isManagerAccounting()) {
                NhanVien myNhanVien = nhanVienRepository.findByUser_UserId(currentUser.getUserId())
                        .orElseThrow(() -> new EntityNotFoundException(
                                "Không tìm thấy thông tin nhân viên cho user hiện tại"));
                if (!nhanvienId.equals(myNhanVien.getNhanvienId())) {
                    throw new ForbiddenException("Bạn chỉ có thể chấm công cho chính mình");
                }
            }
        }

        NhanVien nhanVien = nhanVienRepository.findById(nhanvienId)
                .orElseThrow(() -> new EntityNotFoundException("Nhân viên không tồn tại"));

        // 2. Tính khoảng cách từ công ty
        double distance = GPSUtil.calculateDistance(
                request.getLatitude(), request.getLongitude(),
                companyLatitude, companyLongitude);

        log.debug("Khoảng cách: {}m, Cho phép: {}m", distance, allowedRadius);

        // 3. Kiểm tra trong bán kính cho phép
        if (distance > allowedRadius) {
            throw new BadRequestException(String.format(
                    "Vị trí của bạn cách công ty %.0fm. Vui lòng đến gần hơn (trong bán kính %.0fm)",
                    distance, allowedRadius));
        }

        // 4. Lấy hoặc tạo bản ghi chấm công hôm nay
        LocalDate today = LocalDate.now();
        Optional<ChamCong> existingOpt = chamCongRepository
                .findByNhanVien_NhanvienIdAndNgayCham(nhanvienId, today)
                .stream()
                .findFirst();

        ChamCong chamCong;
        boolean isCheckIn;

        if (existingOpt.isEmpty()) {
            // Chấm công vào
            chamCong = new ChamCong();
            chamCong.setNhanVien(nhanVien);
            chamCong.setNgayCham(today);
            chamCong.setGioVao(LocalTime.now());
            chamCong.setPhuongThuc(PhuongThucChamCong.GPS);
            isCheckIn = true;
        } else {
            // Chấm công ra
            chamCong = existingOpt.get();
            if (chamCong.getGioRa() != null) {
                throw new BadRequestException("Bạn đã chấm công ra hôm nay rồi");
            }
            chamCong.setGioRa(LocalTime.now());
            isCheckIn = false;
        }

        // 5. Lưu thông tin GPS
        chamCong.setLatitude(request.getLatitude());
        chamCong.setLongitude(request.getLongitude());
        chamCong.setDiaChiCheckin(request.getDiaChiCheckin());
        chamCong.setKhoangCach(distance);

        // 6. Lưu vào database
        chamCong = chamCongRepository.save(chamCong);

        // 7. Send notifications
        if (nhanVien.getUser() != null) {
            Long userId = nhanVien.getUser().getUserId();
            String timeStr = (isCheckIn ? chamCong.getGioVao() : chamCong.getGioRa()).toString();

            if (isCheckIn) {
                // Check-in notification
                if (chamCong.getTrangThai() == TrangThaiChamCong.DI_TRE) {
                    attendanceNotificationService.createCheckinLateNotification(userId, timeStr);
                } else {
                    attendanceNotificationService.createCheckinSuccessNotification(userId, timeStr, "GPS");
                }
            } else {
                // Check-out notification
                String hoursWorked = chamCong.getSoGioLam() != null ? chamCong.getSoGioLam().toString() : "0";
                attendanceNotificationService.createCheckoutSuccessNotification(userId, timeStr, hoursWorked);
            }
        }

        // 8. Tạo response
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", isCheckIn ? "Chấm công vào thành công!" : "Chấm công ra thành công!");
        response.put("isCheckIn", isCheckIn);
        response.put("time", isCheckIn ? chamCong.getGioVao() : chamCong.getGioRa());
        response.put("distance", Math.round(distance));
        response.put("address", request.getDiaChiCheckin());
        response.put("trangThai", chamCong.getTrangThai());

        log.info("✅ Chấm công {} thành công cho nhân viên: {}",
                isCheckIn ? "vào" : "ra", nhanVien.getHoTen());

        return response;
    }

    /**
     * Lấy trạng thái chấm công hôm nay
     */
    public Map<String, Object> getTrangThaiChamCongHomNay(Long nhanvienId) {
        Map<String, Object> response = new HashMap<>();

        // Kiểm tra nhanvienId
        if (nhanvienId == null) {
            response.put("checkedIn", false);
            response.put("checkedOut", false);
            response.put("message", "Không có thông tin nhân viên");
            return response;
        }

        // Kiểm tra nhân viên tồn tại - trả về empty thay vì throw exception
        Optional<NhanVien> nhanVienOpt = nhanVienRepository.findById(nhanvienId);
        if (nhanVienOpt.isEmpty()) {
            response.put("checkedIn", false);
            response.put("checkedOut", false);
            response.put("message", "Nhân viên không tồn tại");
            return response;
        }

        LocalDate today = LocalDate.now();
        Optional<ChamCong> chamCongOpt = chamCongRepository
                .findByNhanVien_NhanvienIdAndNgayCham(nhanvienId, today)
                .stream()
                .findFirst();

        if (chamCongOpt.isEmpty()) {
            response.put("checkedIn", false);
            response.put("checkedOut", false);
            response.put("message", "Chưa chấm công hôm nay");
        } else {
            ChamCong chamCong = chamCongOpt.get();
            response.put("checkedIn", true);
            response.put("checkedOut", chamCong.getGioRa() != null);
            response.put("gioVao", chamCong.getGioVao());
            response.put("gioRa", chamCong.getGioRa());
            response.put("soGioLam", chamCong.getSoGioLam());
            response.put("trangThai", chamCong.getTrangThai());
            response.put("phuongThuc", chamCong.getPhuongThuc());
            response.put("chamcongId", chamCong.getChamcongId());
            response.put("message", chamCong.getGioRa() != null ? "Đã chấm công đầy đủ" : "Đã chấm công vào");
        }

        return response;
    }
}
