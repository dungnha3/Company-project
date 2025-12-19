package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.ThongBao;
import DoAn.BE.user.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;

// Service gửi email notification (hợp đồng, nghỉ phép, lương, chào mừng)
@Service
@Slf4j
public class EmailNotificationService {
    
    private final JavaMailSender mailSender;
    
    // Constructor with optional JavaMailSender to allow app to start without mail config
    public EmailNotificationService(@org.springframework.lang.Nullable JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }
    
    @Value("${app.mail.from:noreply@dacn.com}")
    private String fromEmail;
    
    @Value("${app.mail.enabled:false}")
    private boolean emailEnabled;
    
    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;
    
    // Gửi email thông báo
    public void sendNotificationEmail(ThongBao thongBao) {
        if (!emailEnabled || mailSender == null) {
            log.info("Email không được bật hoặc chưa config, bỏ qua gửi email cho thông báo {}", thongBao.getThongbaoId());
            return;
        }
        
        try {
            User nguoiNhan = thongBao.getNguoiNhan();
            if (nguoiNhan.getEmail() == null || nguoiNhan.getEmail().trim().isEmpty()) {
                log.warn("User {} không có email, không thể gửi thông báo", nguoiNhan.getUserId());
                return;
            }
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(nguoiNhan.getEmail());
            helper.setSubject(thongBao.getTieuDe());
            
            String htmlContent = buildEmailContent(thongBao);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            log.info("Đã gửi email thông báo {} đến {}", thongBao.getThongbaoId(), nguoiNhan.getEmail());
            
        } catch (MessagingException e) {
            log.error("Lỗi gửi email thông báo {}: {}", thongBao.getThongbaoId(), e.getMessage());
            throw new RuntimeException("Không thể gửi email", e);
        }
    }
    
    /**
     * Gửi email đơn giản
     */
    public void sendSimpleEmail(String to, String subject, String content) {
        if (!emailEnabled || mailSender == null) {
            log.info("Email không được bật hoặc chưa config, bỏ qua gửi email đến {}", to);
            return;
        }
        
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);
            
            mailSender.send(message);
            log.info("Đã gửi email đến {}", to);
            
        } catch (Exception e) {
            log.error("Lỗi gửi email đến {}: {}", to, e.getMessage());
            throw new RuntimeException("Không thể gửi email", e);
        }
    }
    
    /**
     * Gửi email hợp đồng hết hạn
     */
    public void sendContractExpiryEmail(String email, String tenNhanVien, String loaiHopDong, String ngayHetHan) {
        String subject = "Thông báo: Hợp đồng sắp hết hạn";
        String content = String.format(
            "Kính gửi %s,\n\n" +
            "Hợp đồng %s của bạn sẽ hết hạn vào ngày %s.\n" +
            "Vui lòng liên hệ với phòng nhân sự để gia hạn hợp đồng.\n\n" +
            "Trân trọng,\n" +
            "Phòng Nhân sự",
            tenNhanVien, loaiHopDong, ngayHetHan
        );
        
        sendSimpleEmail(email, subject, content);
    }
    
    /**
     * Gửi email nghỉ phép được duyệt
     */
    public void sendLeaveApprovedEmail(String email, String tenNhanVien, String loaiNghi, String ngayBatDau, String ngayKetThuc) {
        String subject = "Đơn nghỉ phép đã được duyệt";
        String content = String.format(
            "Kính gửi %s,\n\n" +
            "Đơn %s của bạn từ ngày %s đến %s đã được duyệt.\n\n" +
            "Trân trọng,\n" +
            "Phòng Nhân sự",
            tenNhanVien, loaiNghi, ngayBatDau, ngayKetThuc
        );
        
        sendSimpleEmail(email, subject, content);
    }
    
    /**
     * Gửi email lương đã duyệt
     */
    public void sendSalaryApprovedEmail(String email, String tenNhanVien, String thangNam, String soTien) {
        String subject = "Lương đã được duyệt";
        String content = String.format(
            "Kính gửi %s,\n\n" +
            "Lương tháng %s của bạn với số tiền %s đã được duyệt và sẽ được chuyển khoản trong thời gian sớm nhất.\n\n" +
            "Trân trọng,\n" +
            "Phòng Kế toán",
            tenNhanVien, thangNam, soTien
        );
        
        sendSimpleEmail(email, subject, content);
    }
    
    /**
     * Gửi email chào mừng nhân viên mới
     */
    public void sendWelcomeEmail(String email, String tenNhanVien, String username, String tempPassword) {
        String subject = "Chào mừng bạn đến với công ty";
        String content = String.format(
            "Kính gửi %s,\n\n" +
            "Chào mừng bạn đến với công ty!\n\n" +
            "Thông tin đăng nhập hệ thống:\n" +
            "- Tên đăng nhập: %s\n" +
            "- Mật khẩu tạm thời: %s\n\n" +
            "Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.\n" +
            "Link đăng nhập: %s/login\n\n" +
            "Trân trọng,\n" +
            "Phòng Nhân sự",
            tenNhanVien, username, tempPassword, baseUrl
        );
        
        sendSimpleEmail(email, subject, content);
    }
    
    private String buildEmailContent(ThongBao thongBao) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html>");
        html.append("<head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }");
        html.append(".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }");
        html.append(".content { padding: 20px; }");
        html.append(".footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; }");
        html.append(".priority-high { border-left: 4px solid #dc3545; padding-left: 10px; }");
        html.append(".priority-urgent { border-left: 4px solid #ff0000; padding-left: 10px; background-color: #fff5f5; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        
        html.append("<div class='header'>");
        html.append("<h2>").append(thongBao.getTieuDe()).append("</h2>");
        html.append("</div>");
        
        String priorityClass = "";
        if (thongBao.getUuTien() != null) {
            switch (thongBao.getUuTien()) {
                case CAO -> priorityClass = "priority-high";
                case KHAN_CAP -> priorityClass = "priority-urgent";
            }
        }
        
        html.append("<div class='content ").append(priorityClass).append("'>");
        html.append("<p>Kính gửi ").append(thongBao.getNguoiNhan().getUsername()).append(",</p>");
        html.append("<p>").append(thongBao.getNoiDung()).append("</p>");
        
        if (thongBao.getUrlLienKet() != null && !thongBao.getUrlLienKet().trim().isEmpty()) {
            html.append("<p><a href='").append(thongBao.getUrlLienKet()).append("' style='color: #007bff;'>Xem chi tiết</a></p>");
        }
        
        html.append("<p><small>Thời gian: ").append(thongBao.getNgayTao().format(formatter)).append("</small></p>");
        html.append("</div>");
        
        html.append("<div class='footer'>");
        html.append("<p>Email này được gửi tự động từ hệ thống DACN. Vui lòng không trả lời email này.</p>");
        html.append("</div>");
        
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }
}
