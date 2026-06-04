package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
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
import java.util.List;
import org.springframework.scheduling.annotation.Async;

@Service
@Slf4j
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    // Constructor with optional JavaMailSender to allow app to start without mail
    // config
    public EmailNotificationService(@org.springframework.lang.Nullable JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Value("${app.mail.from:noreply@dacn.com}")
    private String fromEmail;

    @Value("${app.mail.enabled:false}")
    private boolean emailEnabled;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    @Async("notificationExecutor")
    public void sendNotificationEmail(Notification notification) {
        if (!emailEnabled || mailSender == null) {
            log.info("Email không được bật hoặc chưa config, bỏ qua gửi email cho thông báo {}",
                    notification.getNotificationId());
            return;
        }

        try {
            User recipient = notification.getUser();
            if (recipient.getEmail() == null || recipient.getEmail().trim().isEmpty()) {
                log.warn("User {} has no email, skipping notification", recipient.getUserId());
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(recipient.getEmail());
            helper.setSubject(notification.getTitle());

            String htmlContent = buildEmailContent(notification);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Sent notification email {} to {}", notification.getNotificationId(), recipient.getEmail());

        } catch (MessagingException e) {
            log.error("Lỗi gửi email thông báo {}: {}", notification.getNotificationId(), e.getMessage());
            throw new RuntimeException("Không thể gửi email", e);
        }
    }

    @Async("notificationExecutor")
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

    @Async("notificationExecutor")
    public void sendContractExpiryEmail(String email, String employeeName, String contractType, String expiryDate) {
        String subject = "Thông báo: Hợp đồng sắp hết hạn";
        String content = String.format(
                "Kính gửi %s,\n\n" +
                        "Hợp đồng %s của bạn sẽ hết hạn vào ngày %s.\n" +
                        "Vui lòng liên hệ với phòng nhân sự để gia hạn hợp đồng.\n\n" +
                        "Trân trọng,\n" +
                        "Phòng Nhân sự",
                employeeName, contractType, expiryDate);

        sendSimpleEmail(email, subject, content);
    }

    @Async("notificationExecutor")
    public void sendLeaveApprovedEmail(String email, String employeeName, String leaveType, String startDate,
            String endDate) {
        String subject = "Đơn nghỉ phép đã được duyệt";
        String content = String.format(
                "Kính gửi %s,\n\n" +
                        "Đơn %s của bạn từ ngày %s đến %s đã được duyệt.\n\n" +
                        "Trân trọng,\n" +
                        "Phòng Nhân sự",
                employeeName, leaveType, startDate, endDate);

        sendSimpleEmail(email, subject, content);
    }

    @Async("notificationExecutor")
    public void sendSalaryApprovedEmail(String email, String employeeName, String period, String amount) {
        String subject = "Lương đã được duyệt";
        String content = String.format(
                "Kính gửi %s,\n\n" +
                        "Lương tháng %s của bạn với số tiền %s đã được duyệt và sẽ được chuyển khoản trong thời gian sớm nhất.\n\n"
                        +
                        "Trân trọng,\n" +
                        "Phòng Kế toán",
                employeeName, period, amount);

        sendSimpleEmail(email, subject, content);
    }

    @Async("notificationExecutor")
    public void sendWelcomeEmail(String email, String employeeName, String username, String tempPassword) {
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
                employeeName, username, tempPassword, baseUrl);

        sendSimpleEmail(email, subject, content);
    }

    @Async("notificationExecutor")
    public void sendProjectMemberAddedEmail(
            String email,
            String memberName,
            String projectKey,
            String projectName,
            Long projectId,
            String roleName,
            String startDateStr,
            String actorName
    ) {
        if (!emailEnabled || mailSender == null) {
            log.info("Email không được bật, bỏ qua gửi email thêm thành viên dự án đến {}", email);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Bạn đã được thêm vào dự án mới: " + projectName);

            String projectUrl = baseUrl + "/app/projects/" + projectId;

            StringBuilder html = new StringBuilder();
            html.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>");
            html.append("<style>");
            html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }");
            html.append(".header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 24px; text-align: center; }");
            html.append(".header h2 { margin: 0; font-size: 20px; }");
            html.append(".content { padding: 24px; }");
            html.append(".info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; margin: 14px 0; border-radius: 0 6px 6px 0; }");
            html.append(".info-box p { margin: 4px 0; font-size: 14px; }");
            html.append(".change-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; }");
            html.append(".btn { display: inline-block; padding: 10px 22px; background-color: #2563eb; color: white !important; text-decoration: none; border-radius: 6px; margin-top: 14px; font-size: 14px; }");
            html.append(".footer { background-color: #f8f9fa; padding: 12px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }");
            html.append("</style></head><body>");

            html.append("<div class='header'><h2>🎉 Bạn đã được thêm vào dự án mới!</h2></div>");
            html.append("<div class='content'>");
            html.append("<p>Kính gửi <strong>").append(memberName).append("</strong>,</p>");
            html.append("<p>Bạn đã được thêm vào dự án <strong>\"").append(projectName).append("\"</strong>.</p>");

            // Khung thông tin dự án
            html.append("<div class='info-box'>");
            html.append("<p><strong>Mã dự án:</strong> <span class='change-badge'>").append(projectKey).append("</span></p>");
            html.append("<p><strong>Tên dự án:</strong> ").append(projectName).append("</p>");
            html.append("<p><strong>Vai trò:</strong> ").append(roleName).append("</p>");
            html.append("<p><strong>Ngày bắt đầu:</strong> ").append(startDateStr).append("</p>");
            html.append("<p><strong>Thực hiện bởi:</strong> ").append(actorName).append("</p>");
            html.append("</div>");

            html.append("<p>Hãy truy cập dự án để xem thông tin chi tiết và bắt đầu làm việc.</p>");
            html.append("<p><a href='").append(projectUrl).append("' class='btn'>Xem dự án</a></p>");
            html.append("</div>");

            html.append("<div class='footer'>");
            html.append("<p>Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp.</p>");
            html.append("</div></body></html>");

            helper.setText(html.toString(), true);
            mailSender.send(message);
            log.info("Đã gửi email thông báo thêm vào dự án '{}' đến {}", projectName, email);

        } catch (MessagingException e) {
            log.error("Lỗi gửi email thêm vào dự án đến {}: {}", email, e.getMessage());
        }
    }

    @Async("notificationExecutor")
    public void sendIssueAssignedEmail(
            String email,
            String assigneeName,
            String issueTitle,
            String projectName,
            String issueKey,
            String actorName
    ) {
        if (!emailEnabled || mailSender == null) {
            log.info("Email không được bật, bỏ qua gửi email giao công việc đến {}", email);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Công việc mới được giao: " + issueTitle);

            String issueUrl = baseUrl + "/app/projects/issues/" + issueKey;

            StringBuilder html = new StringBuilder();
            html.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>");
            html.append("<style>");
            html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }");
            html.append(".header { background: linear-gradient(135deg, #16a34a, #4ade80); color: white; padding: 24px; text-align: center; }");
            html.append(".header h2 { margin: 0; font-size: 20px; }");
            html.append(".content { padding: 24px; }");
            html.append(".info-box { background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 16px; margin: 14px 0; border-radius: 0 6px 6px 0; }");
            html.append(".info-box p { margin: 4px 0; font-size: 14px; }");
            html.append(".change-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; }");
            html.append(".btn { display: inline-block; padding: 10px 22px; background-color: #16a34a; color: white !important; text-decoration: none; border-radius: 6px; margin-top: 14px; font-size: 14px; }");
            html.append(".footer { background-color: #f8f9fa; padding: 12px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }");
            html.append("</style></head><body>");

            html.append("<div class='header'><h2>📋 Bạn được giao công việc mới!</h2></div>");
            html.append("<div class='content'>");
            html.append("<p>Kính gửi <strong>").append(assigneeName).append("</strong>,</p>");
            html.append("<p>Bạn đã được giao một công việc mới trong dự án <strong>\"").append(projectName)
                    .append("\"</strong>.</p>");

            // Khung thông tin công việc
            html.append("<div class='info-box'>");
            html.append("<p><strong>Mã công việc:</strong> <span class='change-badge'>").append(issueKey).append("</span></p>");
            html.append("<p><strong>Tiêu đề:</strong> ").append(issueTitle).append("</p>");
            html.append("<p><strong>Dự án:</strong> ").append(projectName).append("</p>");
            html.append("<p><strong>Thực hiện bởi:</strong> ").append(actorName).append("</p>");
            html.append("</div>");

            html.append("<p>Hãy truy cập để xem chi tiết và bắt đầu làm việc.</p>");
            html.append("<p><a href='").append(issueUrl).append("' class='btn'>Xem công việc</a></p>");
            html.append("</div>");

            html.append("<div class='footer'>");
            html.append("<p>Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp.</p>");
            html.append("</div></body></html>");

            helper.setText(html.toString(), true);
            mailSender.send(message);
            log.info("Đã gửi email thông báo giao công việc '{}' đến {}", issueTitle, email);

        } catch (MessagingException e) {
            log.error("Lỗi gửi email giao công việc đến {}: {}", email, e.getMessage());
        }
    }

    @Async("notificationExecutor")
    public void sendPasswordResetEmail(String email, String username, String newPassword) {
        String subject = "Thông báo: Mật khẩu tài khoản đã được đặt lại";
        String content = String.format(
                "Kính gửi %s,\n\n" +
                        "Mật khẩu tài khoản của bạn đã được quản trị viên đặt lại.\n\n" +
                        "Thông tin đăng nhập mới:\n" +
                        "- Tên đăng nhập: %s\n" +
                        "- Mật khẩu mới: %s\n\n" +
                        "Vui lòng đổi mật khẩu ngay sau khi đăng nhập lại.\n" +
                        "Link đăng nhập: %s/login\n\n" +
                        "Trân trọng,\n" +
                        "Bộ phận Quản trị Hệ thống",
                username, username, newPassword, baseUrl);

        sendSimpleEmail(email, subject, content);
    }

    @Async("notificationExecutor")
    public void sendWorkspaceJoinApprovedEmail(String email, String fullName, String companyName) {
        if (!emailEnabled || mailSender == null) {
            log.info("Email không được bật, bỏ qua gửi email duyệt vào công ty đến {}", email);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Yêu cầu tham gia công ty đã được duyệt: " + companyName);

            String workspaceUrl = baseUrl + "/app";

            StringBuilder html = new StringBuilder();
            html.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>");
            html.append("<style>");
            html.append(
                    "body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }");
            html.append(".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }");
            html.append(".content { padding: 20px; }");
            html.append(
                    ".footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #666; }");
            html.append(
                    ".btn { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }");
            html.append("</style></head><body>");

            html.append("<div class='header'><h2>🎉 Bạn đã được duyệt vào công ty!</h2></div>");
            html.append("<div class='content'>");
            html.append("<p>Kính gửi <strong>").append(fullName).append("</strong>,</p>");
            html.append("<p>Yêu cầu tham gia công ty/workspace <strong>\"").append(companyName).append("\"</strong> của bạn đã được quản trị viên duyệt.</p>");
            html.append("<p>Bây giờ bạn đã có thể truy cập vào workspace và bắt đầu làm việc.</p>");
            html.append("<p><a href='").append(workspaceUrl).append("' class='btn'>Truy cập Workspace</a></p>");
            html.append("</div>");

            html.append("<div class='footer'>");
            html.append("<p>Email này được gửi tự động từ hệ thống DACN. Vui lòng không trả lời email này.</p>");
            html.append("</div></body></html>");

            helper.setText(html.toString(), true);
            mailSender.send(message);
            log.info("Đã gửi email thông báo duyệt vào công ty '{}' đến {}", companyName, email);

        } catch (MessagingException e) {
            log.error("Lỗi gửi email duyệt vào công ty đến {}: {}", email, e.getMessage());
        }
    }

    /**
     * Gửi email thông báo khi một Issue có thay đổi (cập nhật trạng thái, comment mới...).
     *
     * @param email        Địa chỉ email người nhận
     * @param recipientName Tên người nhận (dùng trong lời chào)
     * @param issueKey     Mã issue, VD: "ALPHA-5"
     * @param issueTitle   Tiêu đề issue
     * @param projectName  Tên dự án chứa issue
     * @param changeType   Loại thay đổi, VD: "Cập nhật trạng thái", "Bình luận mới"
     * @param changeDetail Mô tả chi tiết thay đổi, VD: "To Do → In Progress"
     * @param actorName    Tên người thực hiện thay đổi
     */
    @Async("notificationExecutor")
    public void sendIssueUpdatedEmail(
            String email,
            String recipientName,
            String issueKey,
            String issueTitle,
            String projectName,
            String changeType,
            String changeDetail,
            String actorName) {

        if (!emailEnabled || mailSender == null) {
            log.info("Email không được bật, bỏ qua thông báo cập nhật issue {} đến {}", issueKey, email);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("[" + issueKey + "] " + changeType + ": " + issueTitle);

            String issueUrl = baseUrl + "/app/projects/issues/" + issueKey;

            // ── Build HTML body ───────────────────────────────────────────────
            StringBuilder html = new StringBuilder();
            html.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>");
            html.append("<style>");
            html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }");
            html.append(".header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 24px; text-align: center; }");
            html.append(".header h2 { margin: 0; font-size: 20px; }");
            html.append(".content { padding: 24px; }");
            html.append(".info-box { background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 14px 16px; margin: 14px 0; border-radius: 0 6px 6px 0; }");
            html.append(".info-box p { margin: 4px 0; font-size: 14px; }");
            html.append(".change-badge { display: inline-block; background: #ede9fe; color: #5b21b6; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; }");
            html.append(".btn { display: inline-block; padding: 10px 22px; background-color: #6366f1; color: white !important; text-decoration: none; border-radius: 6px; margin-top: 14px; font-size: 14px; }");
            html.append(".footer { background-color: #f8f9fa; padding: 12px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }");
            html.append("</style></head><body>");

            html.append("<div class='header'><h2>🔔 Có cập nhật trên issue của bạn</h2></div>");
            html.append("<div class='content'>");
            html.append("<p>Kính gửi <strong>").append(recipientName).append("</strong>,</p>");
            html.append("<p>Issue bạn đang theo dõi trong dự án <strong>\"")
                    .append(projectName).append("\"</strong> vừa có cập nhật mới.</p>");

            // Khung thông tin issue
            html.append("<div class='info-box'>");
            html.append("<p><strong>Mã issue:</strong> <span class='change-badge'>").append(issueKey).append("</span></p>");
            html.append("<p><strong>Tiêu đề:</strong> ").append(issueTitle).append("</p>");
            html.append("<p><strong>Loại thay đổi:</strong> ").append(changeType).append("</p>");
            if (changeDetail != null && !changeDetail.isBlank()) {
                html.append("<p><strong>Chi tiết:</strong> ").append(changeDetail).append("</p>");
            }
            html.append("<p><strong>Thực hiện bởi:</strong> ").append(actorName).append("</p>");
            html.append("</div>");

            html.append("<p>Nhấn nút bên dưới để xem chi tiết và phản hồi.</p>");
            html.append("<p><a href='").append(issueUrl).append("' class='btn'>Xem Issue</a></p>");
            html.append("</div>");

            html.append("<div class='footer'>");
            html.append("<p>Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp.</p>");
            html.append("</div></body></html>");

            helper.setText(html.toString(), true);
            mailSender.send(message);
            log.info("Đã gửi email cập nhật issue '{}' (loại: {}) đến {}", issueKey, changeType, email);

        } catch (MessagingException e) {
            log.error("Lỗi gửi email cập nhật issue {} đến {}: {}", issueKey, email, e.getMessage());
            // Không ném exception để không ảnh hưởng đến luồng nghiệp vụ chính
        }
    }

    private String buildEmailContent(Notification notification) {
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
        html.append(
                ".priority-urgent { border-left: 4px solid #ff0000; padding-left: 10px; background-color: #fff5f5; }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");

        html.append("<div class='header'>");
        html.append("<h2>").append(notification.getTitle()).append("</h2>");
        html.append("</div>");

        String priorityClass = "";
        if (notification.getPriority() != null) {
            switch (notification.getPriority()) {
                case HIGH -> priorityClass = "priority-high";
                case URGENT -> priorityClass = "priority-urgent";
                default -> {
                } // Cấp độ khác không cần class đặc biệt
            }
        }

        html.append("<div class='content ").append(priorityClass).append("'>");
        html.append("<p>Kính gửi ").append(notification.getUser().getUsername()).append(",</p>");
        html.append("<p>").append(notification.getContent()).append("</p>");

        if (notification.getLink() != null && !notification.getLink().trim().isEmpty()) {
            html.append("<p><a href='").append(notification.getLink())
                    .append("' style='color: #007bff;'>Xem chi tiết</a></p>");
        }

        html.append("<p><small>Thời gian: ").append(notification.getCreatedAt().format(formatter))
                .append("</small></p>");
        html.append("</div>");

        html.append("<div class='footer'>");
        html.append("<p>Email này được gửi tự động từ hệ thống DACN. Vui lòng không trả lời email này.</p>");
        html.append("</div>");

        html.append("</body>");
        html.append("</html>");

        return html.toString();
    }

    /**
     * Gửi một email tổng hợp cho mỗi user khi sprint bắt đầu.
     * Mỗi email liệt kê toàn bộ issues được giao trong sprint đó — tránh spam nhiều email lẻ.
     *
     * @param user          Người nhận (assignee)
     * @param sprintName    Tên sprint
     * @param projectName   Tên dự án
     * @param issueKeys     Danh sách issue keys được giao cho user này trong sprint
     */
    @Async("notificationExecutor")
    public void sendSprintStartedBatchEmail(User user, String sprintName, String projectName, List<String> issueKeys) {
        if (!emailEnabled || mailSender == null) {
            log.info("Email không được bật, bỏ qua gửi email sprint bắt đầu đến {}", user.getEmail());
            return;
        }

        String email = user.getEmail();
        if (email == null || email.isBlank()) {
            log.warn("User '{}' không có email — bỏ qua thông báo sprint", user.getUsername());
            return;
        }

        String recipientName = (user.getFullName() != null && !user.getFullName().isBlank())
                ? user.getFullName()
                : user.getUsername();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("Sprint '" + sprintName + "' đã bắt đầu — " + issueKeys.size() + " công việc mới");

            StringBuilder html = new StringBuilder();
            html.append("<!DOCTYPE html><html><head><meta charset='UTF-8'>");
            html.append("<style>");
            html.append("body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }");
            html.append(".header { background-color: #007bff; color: white; padding: 20px; text-align: center; }");
            html.append(".content { padding: 20px; }");
            html.append(".footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #666; }");
            html.append(".issue-item { background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 10px; margin: 8px 0; border-radius: 4px; }");
            html.append(".issue-key { font-weight: bold; color: #007bff; }");
            html.append(".sprint-info { background-color: #e7f3ff; padding: 12px; border-radius: 5px; margin-bottom: 15px; }");
            html.append("</style></head><body>");

            html.append("<div class='header'><h2>🏃 Sprint '" + escapeHtml(sprintName) + "' đã bắt đầu!</h2></div>");
            html.append("<div class='content'>");
            html.append("<p>Kính gửi <strong>").append(escapeHtml(recipientName)).append("</strong>,</p>");
            html.append("<p>Sprint <strong>'").append(escapeHtml(sprintName))
                    .append("'</strong> của dự án <strong>'").append(escapeHtml(projectName))
                    .append("'</strong> vừa được bắt đầu. Bạn được giao <strong>")
                    .append(issueKeys.size()).append(" công việc</strong> trong sprint này:</p>");

            html.append("<div class='sprint-info'>");
            html.append("<p><strong>Sprint:</strong> ").append(escapeHtml(sprintName)).append("</p>");
            html.append("<p><strong>Dự án:</strong> ").append(escapeHtml(projectName)).append("</p>");
            html.append("<p><strong>Số công việc:</strong> ").append(issueKeys.size()).append("</p>");
            html.append("</div>");

            html.append("<h3>Các công việc được giao:</h3>");
            for (String issueKey : issueKeys) {
                html.append("<div class='issue-item'>");
                html.append("<span class='issue-key'>").append(escapeHtml(issueKey)).append("</span>");
                html.append("</div>");
            }

            html.append("<p>Hãy truy cập để xem chi tiết và bắt đầu làm việc.</p>");
            html.append("</div>");
            html.append("<div class='footer'>");
            html.append("<p>Email này được gửi tự động từ hệ thống DACN. Vui lòng không trả lời email này.</p>");
            html.append("</div></body></html>");

            helper.setText(html.toString(), true);
            mailSender.send(message);
            log.info("Đã gửi email sprint bắt đầu ({} issues) đến {}", issueKeys.size(), email);

        } catch (MessagingException e) {
            log.error("Lỗi gửi email sprint bắt đầu đến {}: {}", email, e.getMessage());
        }
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
