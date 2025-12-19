package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Service quản lý thông báo HR (lương, nghỉ phép, hợp đồng)
@Service
@Transactional
@RequiredArgsConstructor
public class HRNotificationService {

    private final NotificationService notificationService;
    
    /**
     * Tạo notification cho bảng lương mới
     */
    public Notification createSalaryNotification(Long userId, String month, String year) {
        String title = "Bảng lương mới";
        String content = "Bảng lương tháng " + month + "/" + year + " đã được tạo";
        String link = "/hr/bang-luong";
        return notificationService.createNotification(userId, "HR_SALARY", title, content, link);
    }

    /**
     * Tạo notification khi đơn nghỉ phép được phê duyệt
     */
    public Notification createLeaveApprovedNotification(Long userId, String startDate, String endDate) {
        String title = "Đơn nghỉ phép được duyệt";
        String content = "Đơn nghỉ phép từ " + startDate + " đến " + endDate + " đã được phê duyệt";
        String link = "/hr/nghi-phep";
        return notificationService.createNotification(userId, "HR_LEAVE_APPROVED", title, content, link);
    }

    /**
     * Tạo notification khi đơn nghỉ phép bị từ chối
     */
    public Notification createLeaveRejectedNotification(Long userId, String startDate, String endDate, String reason) {
        String title = "Đơn nghỉ phép bị từ chối";
        String content = "Đơn nghỉ phép từ " + startDate + " đến " + endDate + " đã bị từ chối. Lý do: " + reason;
        String link = "/hr/nghi-phep";
        return notificationService.createNotification(userId, "HR_LEAVE_REJECTED", title, content, link);
    }

    /**
     * Tạo notification cho người quản lý khi có đơn nghỉ phép mới
     */
    public Notification createNewLeaveRequestNotification(Long managerId, String employeeName) {
        String title = "Đơn nghỉ phép mới";
        String content = employeeName + " đã gửi đơn xin nghỉ phép";
        String link = "/hr/nghi-phep/pending";
        return notificationService.createNotification(managerId, "HR_LEAVE_REQUEST", title, content, link);
    }

    /**
     * Tạo notification khi hợp đồng sắp hết hạn
     */
    public Notification createContractExpiringNotification(Long userId, String employeeName, String expiryDate) {
        String title = "Hợp đồng sắp hết hạn";
        String content = "Hợp đồng của " + employeeName + " sẽ hết hạn vào " + expiryDate;
        String link = "/hr/hop-dong";
        return notificationService.createNotification(userId, "HR_CONTRACT_EXPIRING", title, content, link);
    }

    /**
     * Tạo notification khi bảng lương được thanh toán
     */
    public Notification createSalaryPaidNotification(Long userId, String month, String year, String amount) {
        String title = "Lương đã được thanh toán";
        String content = "Lương tháng " + month + "/" + year + " (" + amount + " VNĐ) đã được thanh toán";
        String link = "/hr/bang-luong";
        return notificationService.createNotification(userId, "HR_SALARY_PAID", title, content, link);
    }
    
    /**
     * Tạo notification cho Admin khi có yêu cầu thay đổi role
     */
    public Notification createRoleChangeRequestNotification(Long adminId, String hrManagerName, 
                                                          String targetUsername, String currentRole, String requestedRole) {
        String title = "Yêu cầu thay đổi quyền";
        String content = String.format("HR Manager %s yêu cầu thay đổi quyền của %s từ %s thành %s", 
                                     hrManagerName, targetUsername, currentRole, requestedRole);
        String link = "/admin/role-requests";
        return notificationService.createNotification(adminId, "ROLE_CHANGE_REQUEST", title, content, link);
    }

    /**
     * Tạo notification khi yêu cầu thay đổi role được duyệt
     */
    public Notification createRoleChangeApprovedNotification(Long userId, String oldRole, String newRole) {
        String title = "Quyền đã được thay đổi";
        String content = String.format("Quyền của bạn đã được thay đổi từ %s thành %s", oldRole, newRole);
        String link = "/profile";
        return notificationService.createNotification(userId, "ROLE_CHANGE_APPROVED", title, content, link);
    }

    /**
     * Tạo notification cho HR Manager khi yêu cầu được xử lý
     */
    public Notification createRoleChangeProcessedNotification(Long hrManagerId, String targetUsername, 
                                                            String status, String adminNote) {
        String title = "Yêu cầu thay đổi quyền đã được xử lý";
        String content = String.format("Yêu cầu thay đổi quyền của %s đã được %s. %s", 
                                     targetUsername, status, adminNote != null ? "Ghi chú: " + adminNote : "");
        String link = "/hr/role-requests";
        return notificationService.createNotification(hrManagerId, "ROLE_CHANGE_PROCESSED", title, content, link);
    }
}
