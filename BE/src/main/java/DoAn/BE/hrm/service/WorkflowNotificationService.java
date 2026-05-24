package DoAn.BE.hrm.service;

import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.notification.entity.NotificationType;
import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.notification.service.NotificationService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowNotificationService {

    private final NotificationService notificationService;
    private final EmailNotificationService emailNotificationService;
    private final CompanyMemberRepository companyMemberRepository;
    private final EmployeeRepository employeeRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private List<User> getHRManagers() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return Collections.emptyList();
        return companyMemberRepository.findAdminsByCompany(companyId)
                .stream().map(CompanyMember::getUser).collect(Collectors.toList());
    }

    private List<User> getProjectManagers() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return Collections.emptyList();
        return companyMemberRepository.findAdminsByCompany(companyId)
                .stream().map(CompanyMember::getUser).collect(Collectors.toList());
    }

    @Async
    public void notifyLeaveRequestSubmitted(LeaveRequest leaveRequest) {
        log.info("Sending notification for submitted leave request: {}", leaveRequest.getLeaveRequestId());

        List<User> projectManagers = getProjectManagers();

        for (User manager : projectManagers) {
            notificationService.send(manager.getUserId(), NotificationType.HR_LEAVE_REQUEST_CREATED,
                    "/hr/leave-requests/" + leaveRequest.getLeaveRequestId(),
                    leaveRequest.getEmployee().getFullName(),
                    leaveRequest.getLeaveType().name(),
                    leaveRequest.getStartDate().format(DATE_FORMATTER),
                    leaveRequest.getEndDate().format(DATE_FORMATTER),
                    leaveRequest.getTotalDays());
        }
    }

    @Async
    public void notifyLeaveRequestProcessed(LeaveRequest leaveRequest, boolean approved, String note) {
        log.info("Sending notification for processed leave request: {} - {}",
                leaveRequest.getLeaveRequestId(), approved ? "Approved" : "Rejected");

        User employee = leaveRequest.getEmployee().getUser();
        if (employee == null)
            return;

        if (approved) {
            notificationService.send(employee.getUserId(), NotificationType.HR_LEAVE_APPROVED,
                    "/hr/leave-requests/" + leaveRequest.getLeaveRequestId(),
                    leaveRequest.getLeaveType().name(),
                    leaveRequest.getStartDate().format(DATE_FORMATTER),
                    leaveRequest.getEndDate().format(DATE_FORMATTER));
        } else {
            notificationService.send(employee.getUserId(), NotificationType.HR_LEAVE_REJECTED,
                    "/hr/leave-requests/" + leaveRequest.getLeaveRequestId(),
                    leaveRequest.getLeaveType().name(),
                    leaveRequest.getStartDate().format(DATE_FORMATTER),
                    leaveRequest.getEndDate().format(DATE_FORMATTER),
                    note != null ? note : "None");
        }

        try {
            emailNotificationService.sendLeaveApprovedEmail(
                    employee.getEmail(),
                    leaveRequest.getEmployee().getFullName(),
                    leaveRequest.getLeaveType().name(),
                    leaveRequest.getStartDate().format(DATE_FORMATTER),
                    leaveRequest.getEndDate().format(DATE_FORMATTER));
        } catch (Exception e) {
            log.error("Error sending leave email: {}", e.getMessage());
        }
    }

    @Async
    public void notifyWelcomeNewEmployee(Employee employee, String tempPassword) {
        log.info("Sending welcome notification for new employee: {}", employee.getFullName());

        User user = employee.getUser();
        if (user == null || user.getEmail() == null)
            return;

        notificationService.send(user.getUserId(), NotificationType.SYSTEM_ALERT,
                "/profile",
                "Chào mừng",
                String.format("Xin chào %s! Chào mừng bạn đến với hệ thống.", employee.getFullName()));

        try {
            emailNotificationService.sendWelcomeEmail(
                    user.getEmail(),
                    employee.getFullName(),
                    user.getUsername(),
                    tempPassword);
        } catch (Exception e) {
            log.error("Error sending welcome email: {}", e.getMessage());
        }
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void checkBirthdays() {
        log.info("Checking birthdays...");

        LocalDate today = LocalDate.now();
        List<Employee> birthdayEmployees = employeeRepository.findByBirthday(today.getMonthValue(),
                today.getDayOfMonth());

        if (birthdayEmployees.isEmpty())
            return;

        List<User> hrManagers = getHRManagers();

        for (Employee employee : birthdayEmployees) {
            for (User hrManager : hrManagers) {
                notificationService.send(hrManager.getUserId(), NotificationType.HR_BIRTHDAY,
                        "/hr/employees/" + employee.getEmployeeId(),
                        employee.getFullName());
            }
        }

        log.info("Sent birthday notifications for {} employees", birthdayEmployees.size());
    }
}
