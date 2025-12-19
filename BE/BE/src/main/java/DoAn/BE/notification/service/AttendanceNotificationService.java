package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service quản lý thông báo chấm công/attendance
 */
@Service
@Transactional
@RequiredArgsConstructor
public class AttendanceNotificationService {
    
    private final NotificationService notificationService;
    
    /**
     * Notification khi check-in thành công
     */
    public Notification createCheckinSuccessNotification(Long userId, String time, String method) {
        String title = "✅ Check-in thành công";
        String content = "Bạn đã check-in lúc " + time + " (" + method + ")";
        String link = "/hr/attendance";
        return notificationService.createNotification(userId, "ATTENDANCE_CHECKIN_SUCCESS", title, content, link);
    }
    
    /**
     * Notification khi check-in trễ
     */
    public Notification createCheckinLateNotification(Long userId, String time) {
        String title = "⚠️ Check-in trễ";
        String content = "Bạn đã check-in trễ lúc " + time + ". Vui lòng chú ý giờ giấc!";
        String link = "/hr/attendance";
        return notificationService.createNotification(userId, "ATTENDANCE_CHECKIN_LATE", title, content, link);
    }
    
    /**
     * Notification khi checkout thành công
     */
    public Notification createCheckoutSuccessNotification(Long userId, String time, String hoursWorked) {
        String title = "✅ Check-out thành công";
        String content = "Bạn đã check-out lúc " + time + ". Tổng giờ làm: " + hoursWorked + "h";
        String link = "/hr/attendance";
        return notificationService.createNotification(userId, "ATTENDANCE_CHECKOUT_SUCCESS", title, content, link);
    }
    
    /**
     * Notification khi quên check-in/checkout
     */
    public Notification createMissingAttendanceNotification(Long userId, String date) {
        String title = "⚠️ Chưa chấm công";
        String content = "Bạn chưa chấm công ngày " + date + ". Vui lòng cập nhật!";
        String link = "/hr/attendance";
        return notificationService.createNotification(userId, "ATTENDANCE_MISSING", title, content, link);
    }
    
    /**
     * Notification tổng kết tháng
     */
    public Notification createMonthlyAttendanceSummaryNotification(Long userId, String month, int totalDays, int lateDays, int absentDays) {
        String title = "📊 Tổng kết chấm công tháng " + month;
        String content = String.format(
            "Tổng: %d ngày | Đi trễ: %d ngày | Vắng: %d ngày",
            totalDays, lateDays, absentDays
        );
        String link = "/hr/attendance/summary";
        return notificationService.createNotification(userId, "ATTENDANCE_MONTHLY_SUMMARY", title, content, link);
    }
    
    /**
     * Notification khi check-in ngoài phạm vi cho phép
     */
    public Notification createCheckinOutOfRangeNotification(Long userId, String distance) {
        String title = "⚠️ Check-in ngoài khu vực";
        String content = "Bạn đang check-in cách công ty " + distance + "m. Cần phê duyệt từ quản lý.";
        String link = "/hr/attendance";
        return notificationService.createNotification(userId, "ATTENDANCE_OUT_OF_RANGE", title, content, link);
    }
    
    /**
     * Notification nhắc check-out cuối ngày
     */
    public Notification createCheckoutReminderNotification(Long userId) {
        String title = "🔔 Nhắc check-out";
        String content = "Bạn chưa check-out hôm nay. Vui lòng check-out trước khi về!";
        String link = "/hr/attendance";
        return notificationService.createNotification(userId, "ATTENDANCE_CHECKOUT_REMINDER", title, content, link);
    }
}
