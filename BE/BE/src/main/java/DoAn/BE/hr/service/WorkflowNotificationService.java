package DoAn.BE.hr.service;

import DoAn.BE.hr.entity.BangLuong;
import DoAn.BE.hr.entity.HopDong;
import DoAn.BE.hr.entity.NghiPhep;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.repository.HopDongRepository;
import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.notification.dto.CreateThongBaoRequest;
import DoAn.BE.notification.entity.ThongBao.LoaiThongBao;
import DoAn.BE.notification.entity.ThongBao.MucDoUuTien;
import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.notification.service.ThongBaoService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowNotificationService {
    
    private final ThongBaoService thongBaoService;
    private final EmailNotificationService emailNotificationService;
    private final UserRepository userRepository;
    private final HopDongRepository hopDongRepository;
    private final NhanVienRepository nhanVienRepository;
    
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final NumberFormat CURRENCY_FORMATTER = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
    
    /**
     * Thông báo hợp đồng sắp hết hạn (chạy hàng ngày lúc 8h sáng)
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void checkContractExpiry() {
        log.info("Kiểm tra hợp đồng sắp hết hạn");
        
        LocalDate today = LocalDate.now();
        LocalDate after30Days = today.plusDays(30);
        LocalDate after7Days = today.plusDays(7);
        
        // Hợp đồng hết hạn trong 30 ngày
        List<HopDong> contractsExpiring30Days = hopDongRepository.findExpiringContracts(today, after30Days);
        
        // Hợp đồng hết hạn trong 7 ngày (ưu tiên cao)
        List<HopDong> contractsExpiring7Days = hopDongRepository.findExpiringContracts(today, after7Days);
        
        // Gửi thông báo cho HR Manager
        List<User> hrManagers = userRepository.findByRole(User.Role.MANAGER_HR);
        
        for (HopDong contract : contractsExpiring30Days) {
            MucDoUuTien priority = contractsExpiring7Days.contains(contract) ? 
                MucDoUuTien.CAO : MucDoUuTien.BINH_THUONG;
            
            for (User hrManager : hrManagers) {
                sendContractExpiryNotification(hrManager, contract, priority);
            }
        }
        
        log.info("Đã gửi thông báo cho {} hợp đồng sắp hết hạn", contractsExpiring30Days.size());
    }
    
    /**
     * Thông báo đơn nghỉ phép cần duyệt
     */
    @Async
    public void notifyLeaveRequestSubmitted(NghiPhep nghiPhep) {
        log.info("Gửi thông báo đơn nghỉ phép cần duyệt: {}", nghiPhep.getNghiphepId());
        
        // Tìm Project Manager để duyệt
        List<User> projectManagers = userRepository.findByRole(User.Role.MANAGER_PROJECT);
        
        for (User manager : projectManagers) {
            CreateThongBaoRequest request = new CreateThongBaoRequest();
            request.setLoai(LoaiThongBao.NGHI_PHEP_CHO_DUYET);
            request.setTieuDe("Đơn nghỉ phép cần duyệt");
            request.setNoiDung(String.format(
                "Nhân viên %s đã gửi đơn %s từ ngày %s đến %s (%d ngày). Lý do: %s",
                nghiPhep.getNhanVien().getHoTen(),
                nghiPhep.getLoaiPhep().name(),
                nghiPhep.getNgayBatDau().format(DATE_FORMATTER),
                nghiPhep.getNgayKetThuc().format(DATE_FORMATTER),
                nghiPhep.getSoNgay(),
                nghiPhep.getLyDo() != null ? nghiPhep.getLyDo() : "Không có"
            ));
            request.setNguoiNhanId(manager.getUserId());
            request.setUuTien(MucDoUuTien.CAO);
            request.setGuiEmail(true);
            request.setUrlLienKet("/hr/nghi-phep/" + nghiPhep.getNghiphepId());
            
            thongBaoService.createSystemNotification(request);
        }
    }
    
    /**
     * Thông báo đơn nghỉ phép đã được duyệt/từ chối
     */
    @Async
    public void notifyLeaveRequestProcessed(NghiPhep nghiPhep, boolean approved, String note) {
        log.info("Gửi thông báo đơn nghỉ phép đã xử lý: {} - {}", 
                 nghiPhep.getNghiphepId(), approved ? "Duyệt" : "Từ chối");
        
        User employee = nghiPhep.getNhanVien().getUser();
        if (employee == null) return;
        
        CreateThongBaoRequest request = new CreateThongBaoRequest();
        request.setLoai(approved ? LoaiThongBao.NGHI_PHEP_DA_DUYET : LoaiThongBao.NGHI_PHEP_TU_CHOI);
        request.setTieuDe(approved ? "Đơn nghỉ phép đã được duyệt" : "Đơn nghỉ phép bị từ chối");
        
        String content = String.format(
            "Đơn %s từ ngày %s đến %s của bạn đã được %s.",
            nghiPhep.getLoaiPhep().name(),
            nghiPhep.getNgayBatDau().format(DATE_FORMATTER),
            nghiPhep.getNgayKetThuc().format(DATE_FORMATTER),
            approved ? "duyệt" : "từ chối"
        );
        
        if (note != null && !note.trim().isEmpty()) {
            content += " Ghi chú: " + note;
        }
        
        request.setNoiDung(content);
        request.setNguoiNhanId(employee.getUserId());
        request.setUuTien(MucDoUuTien.CAO);
        request.setGuiEmail(true);
        request.setUrlLienKet("/hr/nghi-phep/" + nghiPhep.getNghiphepId());
        
        thongBaoService.createSystemNotification(request);
        
        // Gửi email riêng
        try {
            emailNotificationService.sendLeaveApprovedEmail(
                employee.getEmail(),
                nghiPhep.getNhanVien().getHoTen(),
                nghiPhep.getLoaiPhep().name(),
                nghiPhep.getNgayBatDau().format(DATE_FORMATTER),
                nghiPhep.getNgayKetThuc().format(DATE_FORMATTER)
            );
        } catch (Exception e) {
            log.error("Lỗi gửi email nghỉ phép: {}", e.getMessage());
        }
    }
    
    /**
     * Thông báo lương đã được duyệt
     */
    @Async
    public void notifySalaryApproved(BangLuong bangLuong) {
        log.info("Gửi thông báo lương đã duyệt: {}", bangLuong.getBangluongId());
        
        User employee = bangLuong.getNhanVien().getUser();
        if (employee == null) return;
        
        String thangNam = String.format("%02d/%d", bangLuong.getThang(), bangLuong.getNam());
        String soTien = CURRENCY_FORMATTER.format(bangLuong.getLuongThucNhan());
        
        CreateThongBaoRequest request = new CreateThongBaoRequest();
        request.setLoai(LoaiThongBao.LUONG_DA_DUYET);
        request.setTieuDe("Lương đã được duyệt");
        request.setNoiDung(String.format(
            "Lương tháng %s của bạn (%s) đã được duyệt và sẽ được chuyển khoản sớm nhất.",
            thangNam, soTien
        ));
        request.setNguoiNhanId(employee.getUserId());
        request.setUuTien(MucDoUuTien.BINH_THUONG);
        request.setGuiEmail(true);
        request.setUrlLienKet("/hr/bang-luong/" + bangLuong.getBangluongId());
        
        thongBaoService.createSystemNotification(request);
        
        // Gửi email riêng
        try {
            emailNotificationService.sendSalaryApprovedEmail(
                employee.getEmail(),
                bangLuong.getNhanVien().getHoTen(),
                thangNam,
                soTien
            );
        } catch (Exception e) {
            log.error("Lỗi gửi email lương: {}", e.getMessage());
        }
    }
    
    /**
     * Thông báo lương đã thanh toán
     */
    @Async
    public void notifySalaryPaid(BangLuong bangLuong) {
        log.info("Gửi thông báo lương đã thanh toán: {}", bangLuong.getBangluongId());
        
        User employee = bangLuong.getNhanVien().getUser();
        if (employee == null) return;
        
        String thangNam = String.format("%02d/%d", bangLuong.getThang(), bangLuong.getNam());
        String soTien = CURRENCY_FORMATTER.format(bangLuong.getLuongThucNhan());
        
        CreateThongBaoRequest request = new CreateThongBaoRequest();
        request.setLoai(LoaiThongBao.LUONG_DA_THANH_TOAN);
        request.setTieuDe("Lương đã được thanh toán");
        request.setNoiDung(String.format(
            "Lương tháng %s (%s) đã được chuyển khoản vào tài khoản của bạn.",
            thangNam, soTien
        ));
        request.setNguoiNhanId(employee.getUserId());
        request.setUuTien(MucDoUuTien.BINH_THUONG);
        request.setGuiEmail(true);
        
        thongBaoService.createSystemNotification(request);
    }
    
    /**
     * Thông báo đề xuất tăng lương từ Project Manager
     */
    @Async
    public void notifySalaryIncreaseProposal(Long employeeId, BigDecimal currentSalary, 
                                           BigDecimal proposedSalary, String reason, User proposedBy) {
        log.info("Gửi thông báo đề xuất tăng lương cho nhân viên {}", employeeId);
        
        // Gửi cho HR Manager
        List<User> hrManagers = userRepository.findByRole(User.Role.MANAGER_HR);
        NhanVien nhanVien = nhanVienRepository.findByUser_UserId(employeeId).orElse(null);
        
        if (nhanVien == null) return;
        
        String currentSalaryStr = CURRENCY_FORMATTER.format(currentSalary);
        String proposedSalaryStr = CURRENCY_FORMATTER.format(proposedSalary);
        
        for (User hrManager : hrManagers) {
            CreateThongBaoRequest request = new CreateThongBaoRequest();
            request.setLoai(LoaiThongBao.DE_XUAT_TANG_LUONG);
            request.setTieuDe("Đề xuất tăng lương");
            request.setNoiDung(String.format(
                "Project Manager %s đề xuất tăng lương cho nhân viên %s từ %s lên %s. Lý do: %s",
                proposedBy.getUsername(),
                nhanVien.getHoTen(),
                currentSalaryStr,
                proposedSalaryStr,
                reason
            ));
            request.setNguoiNhanId(hrManager.getUserId());
            request.setUuTien(MucDoUuTien.CAO);
            request.setGuiEmail(true);
            request.setUrlLienKet("/hr/nhan-vien/" + nhanVien.getNhanvienId());
            
            thongBaoService.createThongBao(request, proposedBy);
        }
        
        // Thông báo cho nhân viên
        if (nhanVien.getUser() != null) {
            CreateThongBaoRequest employeeRequest = new CreateThongBaoRequest();
            employeeRequest.setLoai(LoaiThongBao.DE_XUAT_TANG_LUONG);
            employeeRequest.setTieuDe("Đề xuất tăng lương");
            employeeRequest.setNoiDung(String.format(
                "Manager đã đề xuất tăng lương cho bạn từ %s lên %s. Đề xuất đang được xem xét.",
                currentSalaryStr, proposedSalaryStr
            ));
            employeeRequest.setNguoiNhanId(nhanVien.getUser().getUserId());
            employeeRequest.setUuTien(MucDoUuTien.BINH_THUONG);
            employeeRequest.setGuiEmail(false);
            
            thongBaoService.createThongBao(employeeRequest, proposedBy);
        }
    }
    
    /**
     * Thông báo chào mừng nhân viên mới
     */
    @Async
    public void notifyWelcomeNewEmployee(NhanVien nhanVien, String tempPassword) {
        log.info("Gửi thông báo chào mừng nhân viên mới: {}", nhanVien.getHoTen());
        
        User user = nhanVien.getUser();
        if (user == null || user.getEmail() == null) return;
        
        CreateThongBaoRequest request = new CreateThongBaoRequest();
        request.setLoai(LoaiThongBao.WELCOME_NEW_EMPLOYEE);
        request.setTieuDe("Chào mừng đến với công ty!");
        request.setNoiDung(String.format(
            "Chào mừng %s đến với công ty! Tài khoản của bạn đã được tạo. " +
            "Vui lòng đăng nhập và đổi mật khẩu lần đầu tiên.",
            nhanVien.getHoTen()
        ));
        request.setNguoiNhanId(user.getUserId());
        request.setUuTien(MucDoUuTien.CAO);
        request.setGuiEmail(true);
        request.setUrlLienKet("/profile");
        
        thongBaoService.createSystemNotification(request);
        
        // Gửi email chào mừng với thông tin đăng nhập
        try {
            emailNotificationService.sendWelcomeEmail(
                user.getEmail(),
                nhanVien.getHoTen(),
                user.getUsername(),
                tempPassword
            );
        } catch (Exception e) {
            log.error("Lỗi gửi email chào mừng: {}", e.getMessage());
        }
    }
    
    /**
     * Thông báo sinh nhật nhân viên (chạy hàng ngày lúc 9h sáng)
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void checkBirthdays() {
        log.info("Kiểm tra sinh nhật nhân viên");
        
        LocalDate today = LocalDate.now();
        List<NhanVien> birthdayEmployees = nhanVienRepository.findByBirthday(today.getMonthValue(), today.getDayOfMonth());
        
        if (birthdayEmployees.isEmpty()) return;
        
        // Gửi thông báo cho HR Manager
        List<User> hrManagers = userRepository.findByRole(User.Role.MANAGER_HR);
        
        for (NhanVien employee : birthdayEmployees) {
            for (User hrManager : hrManagers) {
                CreateThongBaoRequest request = new CreateThongBaoRequest();
                request.setLoai(LoaiThongBao.SINH_NHAT);
                request.setTieuDe("Sinh nhật nhân viên");
                request.setNoiDung(String.format(
                    "Hôm nay là sinh nhật của nhân viên %s. Hãy gửi lời chúc mừng!",
                    employee.getHoTen()
                ));
                request.setNguoiNhanId(hrManager.getUserId());
                request.setUuTien(MucDoUuTien.THAP);
                request.setGuiEmail(false);
                
                thongBaoService.createSystemNotification(request);
            }
            
            // Gửi thông báo sinh nhật cho chính nhân viên đó
            if (employee.getUser() != null) {
                CreateThongBaoRequest birthdayRequest = new CreateThongBaoRequest();
                birthdayRequest.setLoai(LoaiThongBao.SINH_NHAT);
                birthdayRequest.setTieuDe("Chúc mừng sinh nhật!");
                birthdayRequest.setNoiDung(String.format(
                    "Chúc mừng sinh nhật %s! Chúc bạn một ngày sinh nhật thật vui vẻ và hạnh phúc!",
                    employee.getHoTen()
                ));
                birthdayRequest.setNguoiNhanId(employee.getUser().getUserId());
                birthdayRequest.setUuTien(MucDoUuTien.BINH_THUONG);
                birthdayRequest.setGuiEmail(false);
                
                thongBaoService.createSystemNotification(birthdayRequest);
            }
        }
        
        log.info("Đã gửi thông báo sinh nhật cho {} nhân viên", birthdayEmployees.size());
    }
    
    private void sendContractExpiryNotification(User hrManager, HopDong contract, MucDoUuTien priority) {
        CreateThongBaoRequest request = new CreateThongBaoRequest();
        request.setLoai(LoaiThongBao.HOP_DONG_HET_HAN);
        request.setTieuDe("Hợp đồng sắp hết hạn");
        request.setNoiDung(String.format(
            "Hợp đồng %s của nhân viên %s sẽ hết hạn vào ngày %s. Vui lòng chuẩn bị gia hạn hoặc xử lý.",
            contract.getLoaiHopDong(),
            contract.getNhanVien().getHoTen(),
            contract.getNgayKetThuc().format(DATE_FORMATTER)
        ));
        request.setNguoiNhanId(hrManager.getUserId());
        request.setUuTien(priority);
        request.setGuiEmail(true);
        request.setUrlLienKet("/hr/hop-dong/" + contract.getHopdongId());
        
        thongBaoService.createSystemNotification(request);
        
        // Gửi email riêng cho hợp đồng ưu tiên cao
        if (priority == MucDoUuTien.CAO) {
            try {
                emailNotificationService.sendContractExpiryEmail(
                    hrManager.getEmail(),
                    contract.getNhanVien().getHoTen(),
                    contract.getLoaiHopDong().toString(),
                    contract.getNgayKetThuc().format(DATE_FORMATTER)
                );
            } catch (Exception e) {
                log.error("Lỗi gửi email hợp đồng hết hạn: {}", e.getMessage());
            }
        }
    }
}
