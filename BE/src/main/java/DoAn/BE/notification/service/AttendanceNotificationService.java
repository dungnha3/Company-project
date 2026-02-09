package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// [Service thông báo chấm công - check-in/check-out alerts] (Role: System)
@Service
@Transactional
@RequiredArgsConstructor
public class AttendanceNotificationService {

    private final NotificationService notificationService;

    // [Thông báo check-in thành công] (Role: System)

    // [Thông báo check-in trễ] (Role: System)
    public Notification createCheckinLateNotification(Long userId, String time) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_LATE,
                "/hr/attendance", time);
    }

    // [Thông báo checkout thành công] (Role: System)

    // [Thông báo quên chấm công] (Role: System)
    public Notification createMissingAttendanceNotification(Long userId, String date) {
        return notificationService.send(userId,
                DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_FORGOT_CHECKOUT,
                "/hr/attendance", date);
    }

    // [Thông báo tổng kết chấm công tháng] (Role: System)
    public Notification createMonthlyAttendanceSummaryNotification(Long userId, String month, int totalDays,
            int lateDays, int absentDays) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_SUMMARY,
                "/hr/attendance/summary", month, totalDays, lateDays, absentDays);
    }

    // [Thông báo check-in ngoài khu vực] (Role: System)
    public Notification createCheckinOutOfRangeNotification(Long userId, String distance) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_OUT_OF_RANGE,
                "/hr/attendance", distance);
    }

    // [Thông báo nhắc checkout] (Role: System)
    public Notification createCheckoutReminderNotification(Long userId) {
        return notificationService.send(userId,
                DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_FORGOT_CHECKOUT,
                "/hr/attendance");
    }
}
