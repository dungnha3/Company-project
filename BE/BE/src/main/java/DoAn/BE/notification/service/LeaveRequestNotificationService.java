package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service quản lý thông báo HR (Leave Request, Contract, Department)
 */
@Service
@Transactional
@RequiredArgsConstructor
public class LeaveRequestNotificationService {
    
    private final NotificationService notificationService;
    
    /**
     * Notification khi đơn nghỉ phép được submit
     */
    public Notification createLeaveRequestSubmittedNotification(Long managerId, String employeeName, String leaveType, String startDate, String endDate, int days) {
        String title = "📋 Đơn nghỉ phép cần duyệt";
        String content = String.format(
            "%s đã gửi đơn %s từ %s đến %s (%d ngày)",
            employeeName, leaveType, startDate, endDate, days
        );
        String link = "/hr/leave-requests/pending";
        return notificationService.createNotification(managerId, "LEAVE_REQUEST_SUBMITTED", title, content, link);
    }
    
    /**
     * Notification khi đơn nghỉ phép được duyệt
     */
    public Notification createLeaveRequestApprovedNotification(Long employeeId, String leaveType, String startDate, String endDate) {
        String title = "✅ Đơn nghỉ phép đã được duyệt";
        String content = String.format(
            "Đơn %s từ %s đến %s của bạn đã được duyệt",
            leaveType, startDate, endDate
        );
        String link = "/hr/leave-requests/my";
        return notificationService.createNotification(employeeId, "LEAVE_REQUEST_APPROVED", title, content, link);
    }
    
    /**
     * Notification khi đơn nghỉ phép bị từ chối
     */
    public Notification createLeaveRequestRejectedNotification(Long employeeId, String leaveType, String startDate, String endDate, String reason) {
        String title = "❌ Đơn nghỉ phép bị từ chối";
        String content = String.format(
            "Đơn %s từ %s đến %s của bạn đã bị từ chối. Lý do: %s",
            leaveType, startDate, endDate, reason != null ? reason : "Không có"
        );
        String link = "/hr/leave-requests/my";
        return notificationService.createNotification(employeeId, "LEAVE_REQUEST_REJECTED", title, content, link);
    }
    
    /**
     * Notification khi hợp đồng sắp hết hạn (cho HR)
     */
    public Notification createContractExpiringNotification(Long hrId, String employeeName, String expiryDate, int daysLeft) {
        String title = "⚠️ Hợp đồng sắp hết hạn";
        String content = String.format(
            "Hợp đồng của %s sẽ hết hạn vào %s (còn %d ngày)",
            employeeName, expiryDate, daysLeft
        );
        String link = "/hr/contracts/expiring";
        return notificationService.createNotification(hrId, "CONTRACT_EXPIRING", title, content, link);
    }
    
    /**
     * Notification khi nhân viên được chuyển phòng ban
     */
    public Notification createDepartmentChangedNotification(Long employeeId, String oldDepartment, String newDepartment) {
        String title = "🏢 Thay đổi phòng ban";
        String content = String.format(
            "Bạn đã được chuyển từ phòng %s sang phòng %s",
            oldDepartment, newDepartment
        );
        String link = "/hr/my-profile";
        return notificationService.createNotification(employeeId, "DEPARTMENT_CHANGED", title, content, link);
    }
    
    /**
     * Notification khi lương được duyệt
     */
    public Notification createSalaryApprovedNotification(Long employeeId, String month, String amount) {
        String title = "💰 Lương đã được duyệt";
        String content = String.format(
            "Lương tháng %s (%s) đã được duyệt và sẽ được chuyển khoản sớm",
            month, amount
        );
        String link = "/hr/salaries/my";
        return notificationService.createNotification(employeeId, "SALARY_APPROVED", title, content, link);
    }
}
