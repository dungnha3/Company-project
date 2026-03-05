package DoAn.BE.hrm.service;

import DoAn.BE.common.event.UserCreatedEvent;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@Slf4j
@RequiredArgsConstructor
public class HrmUserListener {

    private final EmployeeRepository employeeRepository;

    @Async
    @EventListener
    public void handleUserCreated(UserCreatedEvent event) {
        DoAn.BE.user.entity.User user = event.getUser();

        // Check if user already has Employee profile in this company
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId != null) {
            if (employeeRepository.findByUser_UserIdAndCompany_CompanyId(user.getUserId(), companyId).isPresent()) {
                return;
            }
        } else {
            if (employeeRepository.findByUser_UserId(user.getUserId()).isPresent()) {
                return;
            }
        }

        try {
            log.info("[HRM] Detecting new user: {}. Auto-creating Employee profile...", user.getUsername());

            Employee employee = new Employee();
            employee.setUser(user);
            employee.setFullName(extractFullNameFromUsername(user.getUsername()));
            employee.setDateOfBirth(LocalDate.of(1990, 1, 1)); // Default
            employee.setGender(Employee.Gender.OTHER); // Default
            employee.setHireDate(LocalDate.now());
            employee.setStatus(Employee.EmployeeStatus.ACTIVE);
            // company_id is auto-set by TenantScopedEntity.prePersistTenant()
            // Department & Position will be updated later by HR

            employeeRepository.save(employee);
            log.info("[HRM] Created Employee profile for user: {}", user.getUsername());
        } catch (Exception e) {
            log.error("[HRM] Failed to create Employee profile for user {}: {}", user.getUsername(), e.getMessage());
        }
    }

    private String extractFullNameFromUsername(String username) {
        if (username == null || username.isEmpty()) {
            return "Unknown";
        }
        String cleanName = username
                .replaceFirst("^(admin|hr|acc|pm|emp)_?", "")
                .replace("_", " ");

        if (cleanName.isEmpty())
            return username;

        String[] words = cleanName.split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (!word.isEmpty()) {
                result.append(Character.toUpperCase(word.charAt(0)))
                        .append(word.substring(1).toLowerCase())
                        .append(" ");
            }
        }
        return result.toString().trim();
    }
}
