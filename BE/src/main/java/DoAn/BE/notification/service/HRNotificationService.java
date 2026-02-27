package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@Transactional
@RequiredArgsConstructor
public class HRNotificationService {

    private final NotificationService notificationService;
    public Notification createSalaryNotification(Long userId, String month, String year) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_SALARY_CREATED,
                "/hr/bang-luong", month, year);
    }
    public Notification createLeaveApprovedNotification(Long userId, String startDate, String endDate) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_LEAVE_APPROVED,
                "/hr/nghi-phep", startDate, endDate);
    }
    public Notification createLeaveRejectedNotification(Long userId, String startDate, String endDate, String reason) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_LEAVE_REJECTED,
                "/hr/nghi-phep", startDate, endDate, reason);
    }
    public Notification createNewLeaveRequestNotification(Long managerId, String employeeName) {
        return notificationService.send(managerId,
                DoAn.BE.notification.entity.NotificationType.HR_LEAVE_REQUEST_CREATED,
                "/hr/nghi-phep/pending", employeeName);
    }
    public Notification createContractExpiringNotification(Long userId, String employeeName, String expiryDate) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_CONTRACT_EXPIRING,
                "/hr/hop-dong", employeeName, expiryDate);
    }
    public Notification createSalaryPaidNotification(Long userId, String month, String year, String amount) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_SALARY_PAID,
                "/hr/bang-luong", month, year, amount);
    }
}
