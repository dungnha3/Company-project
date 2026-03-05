package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@Transactional
@RequiredArgsConstructor
public class AttendanceNotificationService {

    private final NotificationService notificationService;
    public Notification createCheckinLateNotification(Long userId, String time) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_LATE,
                "/hr/attendance", time);
    }
    public Notification createMissingAttendanceNotification(Long userId, String date) {
        return notificationService.send(userId,
                DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_FORGOT_CHECKOUT,
                "/hr/attendance", date);
    }
    public Notification createMonthlyAttendanceSummaryNotification(Long userId, String month, int totalDays,
            int lateDays, int absentDays) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_SUMMARY,
                "/hr/attendance/summary", month, totalDays, lateDays, absentDays);
    }
    public Notification createCheckinOutOfRangeNotification(Long userId, String distance) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_OUT_OF_RANGE,
                "/hr/attendance", distance);
    }
    public Notification createCheckoutReminderNotification(Long userId) {
        return notificationService.send(userId,
                DoAn.BE.notification.entity.NotificationType.HR_ATTENDANCE_FORGOT_CHECKOUT,
                "/hr/attendance");
    }
}
