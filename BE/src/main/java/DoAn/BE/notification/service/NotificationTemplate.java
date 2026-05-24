package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.NotificationType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NotificationTemplate {

    // SYSTEM
    SYSTEM_ALERT(NotificationType.SYSTEM_ALERT, "Hệ thống", "%s"),
    INFO(NotificationType.SYSTEM_ALERT, "%s", "%s"), // Generic info

    // AUTH
    AUTH_LOGIN_NEW_DEVICE(NotificationType.AUTH_LOGIN_NEW_DEVICE, "Đăng nhập mới",
            "Tài khoản của bạn vừa đăng nhập từ thiết bị mới lúc %s"),
    AUTH_PASSWORD_CHANGED(NotificationType.AUTH_PASSWORD_CHANGED, "Đổi mật khẩu",
            "Mật khẩu của bạn đã được thay đổi thành công"),
    AUTH_LOGIN_SUCCESS(NotificationType.AUTH_LOGIN_NEW_DEVICE, "Đăng nhập thành công", "Đăng nhập từ IP: %s"),
    AUTH_SECURITY_ALERT(NotificationType.AUTH_LOGIN_NEW_DEVICE, "Cảnh báo bảo mật", "%s"),
    AUTH_ACCOUNT_LOCKED(NotificationType.AUTH_LOGIN_NEW_DEVICE, "Tài khoản bị khóa",
            "Tài khoản bị khóa %s phút do đăng nhập sai nhiều lần"),
    AUTH_PASSWORD_RESET_REQUEST(NotificationType.AUTH_PASSWORD_CHANGED, "Yêu cầu đặt lại mật khẩu",
            "Bạn đã yêu cầu đặt lại mật khẩu. %s"),

    // USER
    USER_WELCOME(NotificationType.SYSTEM_ALERT, "Chào mừng", "Xin chào %s! Chào mừng bạn đến với hệ thống."),
    USER_ACTIVATED(NotificationType.SYSTEM_ALERT, "Tài khoản kích hoạt", "Tài khoản của bạn đã được kích hoạt."),
    USER_DEACTIVATED(NotificationType.SYSTEM_ALERT, "Tài khoản vô hiệu hóa", "Tài khoản bị vô hiệu hóa. Lý do: %s"),

    // HR - ATTENDANCE
    HR_ATTENDANCE_CHECKIN_SUCCESS(NotificationType.HR_ATTENDANCE_CHECKIN, "Check-in thành công",
            "Check-in lúc %s (%s)"),
    HR_ATTENDANCE_CHECKOUT_SUCCESS(NotificationType.HR_ATTENDANCE_CHECKOUT, "Check-out thành công",
            "Check-out lúc %s. Tổng giờ: %sh"),
    HR_ATTENDANCE_LATE(NotificationType.HR_ATTENDANCE_LATE, "Đi muộn", "Bạn đã check-in muộn lúc %s"),
    HR_ATTENDANCE_FORGOT_CHECKOUT(NotificationType.HR_ATTENDANCE_FORGOT_CHECKOUT, "Quên checkout",
            "Hệ thống không ghi nhận checkout ngày %s"),
    HR_ATTENDANCE_MISSING(NotificationType.HR_ATTENDANCE_MISSING, "Chưa chấm công",
            "Bạn chưa chấm công ngày %s"),
    HR_ATTENDANCE_OUT_OF_RANGE(NotificationType.HR_ATTENDANCE_OUT_OF_RANGE, "Check-in ngoài khu vực",
            "Cách công ty %sm. Cần duyệt."),
    HR_ATTENDANCE_SUMMARY(NotificationType.HR_ATTENDANCE_SUMMARY, "Tổng kết chấm công %s",
            "Tổng: %d | Trễ: %d | Vắng: %d"),
    HR_ATTENDANCE_REMINDER(NotificationType.HR_ATTENDANCE_REMINDER, "Nhắc nhở chấm công",
            "Bạn chưa check-out hôm nay!"),


    // HR - LEAVE & CONTRACT
    HR_LEAVE_REQUEST_SUBMITTED(NotificationType.HR_LEAVE_REQUEST_CREATED, "📋 Đơn nghỉ phép cần duyệt",
            "%s đã gửi đơn %s từ %s đến %s (%d ngày)"),
    HR_LEAVE_REQUEST_APPROVED(NotificationType.HR_LEAVE_APPROVED, "✅ Đơn nghỉ phép đã được duyệt",
            "Đơn %s từ %s đến %s của bạn đã được duyệt"),
    HR_LEAVE_REQUEST_REJECTED(NotificationType.HR_LEAVE_REJECTED, "❌ Đơn nghỉ phép bị từ chối",
            "Đơn %s từ %s đến %s của bạn đã bị từ chối. Lý do: %s"),
    HR_DEPARTMENT_CHANGED(NotificationType.SYSTEM_ALERT, "🏢 Thay đổi phòng ban",
            "Bạn đã được chuyển từ phòng %s sang phòng %s"),
    HR_SALARY_APPROVED(NotificationType.HR_SALARY_APPROVED, "💰 Lương đã được duyệt",
            "Lương tháng %s (%s) đã được duyệt và sẽ được chuyển khoản sớm"),
    HR_SALARY_CREATED(NotificationType.HR_SALARY_CREATED, "Bảng lương mới", "Bảng lương tháng %s/%s đã được tạo"),
    HR_SALARY_PAID(NotificationType.HR_SALARY_PAID, "Lương đã thanh toán", "Lương tháng %s/%s (%s VNĐ) đã được chuyển"),
    HR_CONTRACT_EXPIRING(NotificationType.HR_CONTRACT_EXPIRING, "⚠️ Hợp đồng sắp hết hạn",
            "Hợp đồng của %s sẽ hết hạn vào %s (còn %d ngày)"),
    HR_BIRTHDAY(NotificationType.HR_BIRTHDAY, "🎂 Sinh nhật nhân viên",
            "Hôm nay là sinh nhật của %s. Đừng quên gửi lời chúc!"),
    HR_BIRTHDAY_SELF(NotificationType.HR_BIRTHDAY_SELF, "🎉 Chúc mừng sinh nhật",
            "Chúc mừng sinh nhật %s! Chúc bạn có một ngày sinh nhật tuyệt vời!"),
    HR_SALARY_INCREASE_PROPOSAL(NotificationType.HR_SALARY_INCREASE_PROPOSAL, "💸 Đề xuất tăng lương",
            "Quản lý %s đề xuất tăng lương cho %s: %s -> %s. Lý do: %s"),
    HR_SALARY_INCREASE_RESULT(NotificationType.HR_SALARY_INCREASE_RESULT, "Kết quả đề xuất tăng lương",
            "Đề xuất tăng lương của bạn: %s"),

    // PROJECT
    PROJECT_ASSIGNED(NotificationType.PROJECT_ASSIGNED, "Dự án mới", "Bạn đã được phân công vào dự án %s"),
    PROJECT_MEMBER_ADDED(NotificationType.PROJECT_ASSIGNED, "Được thêm vào dự án", "Bạn đã được thêm vào dự án \"%s\""),
    PROJECT_MEMBER_REMOVED(NotificationType.PROJECT_UPDATE, "Bị xóa khỏi dự án", "Bạn đã bị xóa khỏi dự án \"%s\""),
    PROJECT_STATUS_CHANGED(NotificationType.PROJECT_UPDATE, "Trạng thái dự án thay đổi",
            "Dự án \"%s\" đã chuyển sang trạng thái: %s"),
    PROJECT_COMPLETED(NotificationType.PROJECT_UPDATE, "Dự án hoàn thành", "🎉 Chúc mừng! Dự án \"%s\" đã hoàn thành!"),
    PROJECT_ARCHIVED(NotificationType.PROJECT_UPDATE, "Dự án đã đóng",
            "Dự án \"%s\" đã được đóng và chuyển sang chế độ chỉ đọc"),
    PROJECT_ROLE_CHANGED(NotificationType.PROJECT_UPDATE, "Vai trò trong dự án thay đổi",
            "Vai trò của bạn trong dự án \"%s\" đã thay đổi thành: %s"),
    TASK_ASSIGNED(NotificationType.TASK_ASSIGNED, "Công việc mới", "Bạn được giao việc: %s"),
    TASK_DUE_SOON(NotificationType.TASK_DUE_SOON, "Sắp đến hạn", "Công việc %s sẽ hết hạn vào %s");


    private final NotificationType type;
    private final String titlePattern;
    private final String contentPattern;

    public String formatTitle(Object... args) {
        // Some titles might want args too, but for now mostly static or simple
        return titlePattern;
    }

    public String formatContent(Object... args) {
        try {
            return String.format(contentPattern, args);
        } catch (Exception e) {
            return contentPattern; // Fallback if formatting fails
        }
    }

    public static NotificationTemplate fromType(NotificationType type) {
        for (NotificationTemplate template : values()) {
            if (template.getType() == type) {
                return template;
            }
        }
        return SYSTEM_ALERT;
    }
}
