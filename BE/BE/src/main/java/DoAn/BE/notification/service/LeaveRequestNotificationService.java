package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// [Service thông báo nghỉ phép chi tiết] (Role: System)
@Service
@Transactional
@RequiredArgsConstructor
public class LeaveRequestNotificationService {

        private final NotificationService notificationService;

        // [Thông báo đơn nghỉ phép cần duyệt cho manager] (Role: System)
        public Notification createLeaveRequestSubmittedNotification(Long managerId, String employeeName,
                        String leaveType, String startDate, String endDate, int days) {
                return notificationService.send(managerId,
                                DoAn.BE.notification.entity.NotificationType.HR_LEAVE_REQUEST_CREATED,
                                "/hr/leave-requests/pending", employeeName, leaveType, startDate, endDate, days);
        }

        // [Thông báo đơn nghỉ phép được duyệt] (Role: System)
        public Notification createLeaveRequestApprovedNotification(Long employeeId, String leaveType,
                        String startDate, String endDate) {
                return notificationService.send(employeeId,
                                DoAn.BE.notification.entity.NotificationType.HR_LEAVE_APPROVED,
                                "/hr/leave-requests/my", leaveType, startDate, endDate);
        }

        // [Thông báo đơn nghỉ phép bị từ chối] (Role: System)
        public Notification createLeaveRequestRejectedNotification(Long employeeId, String leaveType,
                        String startDate, String endDate, String reason) {
                return notificationService.send(employeeId,
                                DoAn.BE.notification.entity.NotificationType.HR_LEAVE_REJECTED,
                                "/hr/leave-requests/my", leaveType, startDate, endDate,
                                reason != null ? reason : "Không có");
        }

        // [Thông báo hợp đồng sắp hết hạn cho HR] (Role: System)
        public Notification createContractExpiringNotification(Long hrId, String employeeName,
                        String expiryDate, int daysLeft) {
                return notificationService.send(hrId, DoAn.BE.notification.entity.NotificationType.HR_CONTRACT_EXPIRING,
                                "/hr/contracts/expiring", employeeName, expiryDate, daysLeft);
        }

        // [Thông báo chuyển phòng ban] (Role: System)
        public Notification createDepartmentChangedNotification(Long employeeId, String oldDepartment,
                        String newDepartment) {
                return notificationService.send(employeeId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                                "/hr/my-profile", oldDepartment, newDepartment);
        }

        // [Thông báo lương được duyệt] (Role: System)
        public Notification createSalaryApprovedNotification(Long employeeId, String month, String amount) {
                return notificationService.send(employeeId, DoAn.BE.notification.entity.NotificationType.HR_SALARY_PAID,
                                "/hr/salaries/my", month, amount);
        }
}
