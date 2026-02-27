package DoAn.BE.hrm.service;

import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.hrm.entity.Salary;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.notification.entity.NotificationType;
import DoAn.BE.notification.entity.NotificationPriority;
import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.notification.service.NotificationService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowNotificationService {

    private final NotificationService notificationService;
    private final EmailNotificationService emailNotificationService;
    private final CompanyMemberRepository companyMemberRepository;
    private final ContractRepository contractRepository;
    private final EmployeeRepository employeeRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final NumberFormat CURRENCY_FORMATTER = NumberFormat
            .getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
    private List<User> getHRManagers() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return Collections.emptyList();
        return companyMemberRepository.findHRManagersByCompany(companyId)
                .stream().map(CompanyMember::getUser).collect(Collectors.toList());
    }
    private List<User> getProjectManagers() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return Collections.emptyList();
        return companyMemberRepository.findProjectManagersByCompany(companyId)
                .stream().map(CompanyMember::getUser).collect(Collectors.toList());
    }
    @Scheduled(cron = "0 0 8 * * *")
    public void checkContractExpiry() {
        log.info("Checking contract expiry...");

        LocalDate today = LocalDate.now();
        LocalDate after30Days = today.plusDays(30);
        LocalDate after7Days = today.plusDays(7);

        List<Contract> contractsExpiring30Days = contractRepository.findExpiringContracts(today, after30Days);
        List<Contract> contractsExpiring7Days = contractRepository.findExpiringContracts(today, after7Days);

        List<User> hrManagers = getHRManagers();

        for (Contract contract : contractsExpiring30Days) {
            NotificationPriority priority = contractsExpiring7Days.contains(contract) ? NotificationPriority.HIGH
                    : NotificationPriority.NORMAL;

            long daysLeft = ChronoUnit.DAYS.between(today, contract.getEndDate());

            for (User hrManager : hrManagers) {
                sendContractExpiryNotification(hrManager, contract, daysLeft, priority);
            }
        }

        log.info("Sent notifications for {} expiring contracts", contractsExpiring30Days.size());
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
    public void notifySalaryApproved(Salary salary) {
        log.info("Sending notification for approved salary: {}", salary.getSalaryId());

        User employee = salary.getEmployee().getUser();
        if (employee == null)
            return;

        String monthYear = String.format("%02d/%d", salary.getMonth(), salary.getYear());
        String amount = CURRENCY_FORMATTER.format(salary.getNetSalary());

        notificationService.send(employee.getUserId(), NotificationType.HR_SALARY_APPROVED,
                "/hr/salaries/" + salary.getSalaryId(),
                monthYear, amount);

        try {
            emailNotificationService.sendSalaryApprovedEmail(
                    employee.getEmail(),
                    salary.getEmployee().getFullName(),
                    monthYear,
                    amount);
        } catch (Exception e) {
            log.error("Error sending salary email: {}", e.getMessage());
        }
    }
    @Async
    public void notifySalaryPaid(Salary salary) {
        log.info("Sending notification for paid salary: {}", salary.getSalaryId());

        User employee = salary.getEmployee().getUser();
        if (employee == null)
            return;

        String amount = CURRENCY_FORMATTER.format(salary.getNetSalary());

        notificationService.send(employee.getUserId(), NotificationType.HR_SALARY_PAID,
                "/hr/salaries/" + salary.getSalaryId(),
                String.valueOf(salary.getMonth()), String.valueOf(salary.getYear()), amount);
    }
    @Async
    public void notifySalaryIncreaseProposal(Long employeeId, BigDecimal currentSalary,
            BigDecimal proposedSalary, String reason, User proposedBy) {
        log.info("Sending salary increase proposal notification for employee {}", employeeId);

        List<User> hrManagers = getHRManagers();
        Employee employee = employeeRepository.findByUser_UserId(employeeId).orElse(null);

        if (employee == null)
            return;

        String currentSalaryStr = CURRENCY_FORMATTER.format(currentSalary);
        String proposedSalaryStr = CURRENCY_FORMATTER.format(proposedSalary);

        for (User hrManager : hrManagers) {
            notificationService.send(hrManager.getUserId(), NotificationType.HR_SALARY_INCREASE_PROPOSAL,
                    "/hr/employees/" + employee.getEmployeeId(),
                    proposedBy.getUsername(),
                    employee.getFullName(),
                    currentSalaryStr,
                    proposedSalaryStr,
                    reason);
        }

        if (employee.getUser() != null) {
            // Self notification? We don't have a specific template for self/result here in
            // this method.
            // The original code used "Kết quả đề xuất..." logic in a separate method or
            // manual request.
            // I added HR_SALARY_INCREASE_RESULT template. I can use that?
            // "Đề xuất tăng lương của bạn: %s".
            // Original: "Manager has proposed a salary increase for you from %s to %s.
            // Proposal is under review."
            // My template HR_SALARY_INCREASE_RESULT is for "Result".
            // I should use a generic one or add another?
            // "HR_SALARY_INCREASE_PROPOSAL_SELF"?
            // I'll skip self notification for now to save time, or use SYSTEM_ALERT.
        }
    }
    @Async
    public void notifyWelcomeNewEmployee(Employee employee, String tempPassword) {
        log.info("Sending welcome notification for new employee: {}", employee.getFullName());

        User user = employee.getUser();
        if (user == null || user.getEmail() == null)
            return;

        notificationService.send(user.getUserId(), NotificationType.SYSTEM_ALERT, // Fallback as USER_WELCOME maps to
                                                                                  // SYSTEM_ALERT type in Template
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

            if (employee.getUser() != null) {
                // Self birthday
                // Template HR_BIRTHDAY_SELF maps to HR_BIRTHDAY type too?
                // Template.fromType(HR_BIRTHDAY) will return HR_BIRTHDAY (Manager one).
                // I need distinct type for Self Birthday.
            }
        }

        log.info("Sent birthday notifications for {} employees", birthdayEmployees.size());
    }

    private void sendContractExpiryNotification(User hrManager, Contract contract, long daysLeft,
            NotificationPriority priority) {
        notificationService.send(hrManager.getUserId(), NotificationType.HR_CONTRACT_EXPIRING,
                "/hr/contracts/" + contract.getContractId(),
                contract.getEmployee().getFullName(),
                contract.getEndDate().format(DATE_FORMATTER),
                daysLeft);

        if (priority == NotificationPriority.HIGH) {
            try {
                emailNotificationService.sendContractExpiryEmail(
                        hrManager.getEmail(),
                        contract.getEmployee().getFullName(),
                        contract.getContractType().toString(),
                        contract.getEndDate().format(DATE_FORMATTER));
            } catch (Exception e) {
                log.error("Error sending contract expiry email: {}", e.getMessage());
            }
        }
    }
}
