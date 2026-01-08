package DoAn.BE.hrm.controller;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.service.FeatureFlagService;
import DoAn.BE.hrm.dto.SalaryIncreaseRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.service.EmployeeService;
import DoAn.BE.hrm.service.WorkflowNotificationService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

// [Controller for salary proposals] (Role: PM/HR)
@RestController
@RequestMapping("/api/hr/salary-proposal")
@RequiredArgsConstructor
public class SalaryProposalController {

    private final EmployeeService employeeService;
    private final WorkflowNotificationService workflowNotificationService;
    private final FeatureFlagService featureFlagService;
    private final AccessControlService accessControlService;

    // [Propose salary increase] (Role: PM/HR Manager)
    @PostMapping
    public ResponseEntity<Map<String, String>> proposeSalaryIncrease(
            @Valid @RequestBody SalaryIncreaseRequest request,
            @AuthenticationPrincipal User currentUser) {

        // [Check feature flag] (Role: System)
        featureFlagService.requireSalaryFeature();

        // [Check permission] (Role: PM/HR Manager)
        if (!accessControlService.isProjectManager() && !accessControlService.isHRManager()) {
            throw new ForbiddenException("Only Project Manager or HR Manager can propose salary increase");
        }

        // [Get employee info] (Role: Internal)
        Employee employee = employeeService.getEmployeeById(request.getEmployeeId(), currentUser);

        // [Get current salary] (Role: HR only - PM doesn't see amount in response
        // usually, but logical check)
        BigDecimal currentSalary = employee.getBaseSalary();

        // [Check if proposal is higher] (Role: Business Rule)
        if (currentSalary != null && request.getProposedSalary().compareTo(currentSalary) <= 0) {
            throw new BadRequestException("Proposed salary must be higher than current salary");
        }

        // [Send notification to HR] (Role: Notification)
        workflowNotificationService.notifySalaryIncreaseProposal(
                employee.getUser().getUserId(),
                currentSalary,
                request.getProposedSalary(),
                request.getReason(),
                currentUser);

        // [Create response] (Role: API)
        Map<String, String> response = new HashMap<>();
        response.put("message", "Salary increase proposal sent successfully");
        response.put("employeeName", employee.getFullName());
        response.put("proposedSalary", request.getProposedSalary().toString());

        // [PM cannot see current salary in response] (Role: Security)
        if (accessControlService.isHRManager() && currentSalary != null) {
            response.put("currentSalary", currentSalary.toString());
        }

        return ResponseEntity.ok(response);
    }
}
