package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// [Service thông báo HR - lương, nghỉ phép, hợp đồng] (Role: System)
@Service
@Transactional
@RequiredArgsConstructor
public class HRNotificationService {

    private final NotificationService notificationService;

    // [Thông báo bảng lương mới] (Role: System)
    public Notification createSalaryNotification(Long userId, String month, String year) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_SALARY_CREATED,
                "/hr/bang-luong", month, year);
    }

    // [Thông báo đơn nghỉ phép được duyệt] (Role: System)
    public Notification createLeaveApprovedNotification(Long userId, String startDate, String endDate) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_LEAVE_APPROVED,
                "/hr/nghi-phep", startDate, endDate);
    }

    // [Thông báo đơn nghỉ phép bị từ chối] (Role: System)
    public Notification createLeaveRejectedNotification(Long userId, String startDate, String endDate, String reason) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_LEAVE_REJECTED,
                "/hr/nghi-phep", startDate, endDate, reason);
    }

    // [Thông báo có đơn nghỉ phép mới cho quản lý] (Role: System)
    public Notification createNewLeaveRequestNotification(Long managerId, String employeeName) {
        return notificationService.send(managerId,
                DoAn.BE.notification.entity.NotificationType.HR_LEAVE_REQUEST_CREATED,
                "/hr/nghi-phep/pending", employeeName);
    }

    // [Thông báo hợp đồng sắp hết hạn] (Role: System)
    public Notification createContractExpiringNotification(Long userId, String employeeName, String expiryDate) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_CONTRACT_EXPIRING,
                "/hr/hop-dong", employeeName, expiryDate);
    }

    // [Thông báo lương đã thanh toán] (Role: System)
    public Notification createSalaryPaidNotification(Long userId, String month, String year, String amount) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.HR_SALARY_PAID,
                "/hr/bang-luong", month, year, amount);
    }
}
