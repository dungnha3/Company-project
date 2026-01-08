package DoAn.BE.hrm.service;

import java.time.LocalDate;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.FeatureFlagService;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.LeaveRequestRequest;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.LeaveRequest.LeaveStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.notification.service.HRNotificationService;
import DoAn.BE.notification.service.FCMService;
import DoAn.BE.user.entity.User;
import jakarta.transaction.Transactional;

import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final HRNotificationService hrNotificationService;
    private final FCMService fcmService;
    private final FeatureFlagService featureFlagService;
    private final AccessControlService accessControlService;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository,
            EmployeeRepository employeeRepository,
            HRNotificationService hrNotificationService,
            FCMService fcmService,
            FeatureFlagService featureFlagService,
            AccessControlService accessControlService) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.employeeRepository = employeeRepository;
        this.hrNotificationService = hrNotificationService;
        this.fcmService = fcmService;
        this.featureFlagService = featureFlagService;
        this.accessControlService = accessControlService;
    }

    public LeaveRequest createLeaveRequest(LeaveRequestRequest request, User currentUser) {
        featureFlagService.requireLeaveFeature();

        log.info("User {} creating leave request for employee ID: {}", currentUser.getUsername(),
                request.getEmployeeId());
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setEmployee(employee);
        leaveRequest.setLeaveType(request.getLeaveType());
        leaveRequest.setStartDate(request.getStartDate());
        leaveRequest.setEndDate(request.getEndDate());
        leaveRequest.setReason(request.getReason());
        leaveRequest.setStatus(LeaveRequest.LeaveStatus.PENDING);

        return leaveRequestRepository.save(leaveRequest);
    }

    public LeaveRequest getLeaveRequestById(Long id, User currentUser) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Leave request not found"));

        if (accessControlService.canViewLeave(currentUser)) {
            return leaveRequest;
        }

        if (!leaveRequest.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You do not have permission to view this leave request");
        }

        return leaveRequest;
    }

    public LeaveRequest getLeaveRequestById(Long id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Leave request not found"));
    }

    public List<LeaveRequest> getAllLeaveRequests(User currentUser) {
        if (!accessControlService.canViewLeave(currentUser)) {
            throw new ForbiddenException("You do not have permission to view leave requests");
        }
        return leaveRequestRepository.findAll();
    }

    public List<LeaveRequest> getAllLeaveRequests() {
        return leaveRequestRepository.findAll();
    }

    public LeaveRequest updateLeaveRequest(Long id, LeaveRequestRequest request, User currentUser) {
        LeaveRequest leaveRequest = getLeaveRequestById(id, currentUser);

        if (!leaveRequest.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You can only update your own leave requests");
        }

        log.info("User {} updating leave request ID: {}", currentUser.getUsername(), id);

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Can only update pending requests");
        }

        if (request.getEmployeeId() != null &&
                !request.getEmployeeId().equals(leaveRequest.getEmployee().getEmployeeId())) {
            throw new BadRequestException("Cannot change employee");
        }

        if (request.getLeaveType() != null) {
            leaveRequest.setLeaveType(request.getLeaveType());
        }
        if (request.getStartDate() != null) {
            leaveRequest.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            leaveRequest.setEndDate(request.getEndDate());
        }
        if (request.getReason() != null) {
            leaveRequest.setReason(request.getReason());
        }

        if (leaveRequest.getEndDate().isBefore(leaveRequest.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        return leaveRequestRepository.save(leaveRequest);
    }

    public void deleteLeaveRequest(Long id) {
        LeaveRequest leaveRequest = getLeaveRequestById(id);

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Can only delete pending requests");
        }

        leaveRequestRepository.delete(leaveRequest);
    }

    public List<LeaveRequest> getLeaveRequestsByEmployee(Long employeeId) {
        return leaveRequestRepository.findByEmployee_EmployeeId(employeeId);
    }

    public List<LeaveRequest> getLeaveRequestsInDateRange(LocalDate startDate, LocalDate endDate) {
        return leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(endDate, startDate);
    }

    public LeaveRequest approvePM(Long id, String note, User currentUser) {
        if (!accessControlService.isProjectManager()) {
            throw new ForbiddenException("Only Project Manager can approve based on project schedule");
        }

        log.info("PM {} approving leave request ID: {}", currentUser.getUsername(), id);
        LeaveRequest leaveRequest = getLeaveRequestById(id);

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Request is not pending or already processed");
        }

        leaveRequest.approvePM(currentUser, note);
        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        log.info("✅ PM approved leave request, waiting for Accounting");

        return saved;
    }

    public LeaveRequest approveAccounting(Long id, String note, User currentUser) {
        if (!accessControlService.isAccountingManager()) {
            throw new ForbiddenException("Only Accounting Manager can approve based on leave balance/salary");
        }

        log.info("Accounting {} approving leave request ID: {}", currentUser.getUsername(), id);
        LeaveRequest leaveRequest = getLeaveRequestById(id);

        if (leaveRequest.getStatus() != LeaveStatus.PM_APPROVED) {
            throw new BadRequestException("Request needs PM approval first or is already processed");
        }

        leaveRequest.approveAccounting(currentUser, note);
        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        log.info("✅ Accounting approved leave request - Completed 2-step approval");

        try {
            User employeeUser = leaveRequest.getEmployee().getUser();
            if (employeeUser != null) {
                hrNotificationService.createLeaveApprovedNotification(
                        employeeUser.getUserId(),
                        leaveRequest.getStartDate().toString(),
                        leaveRequest.getEndDate().toString());

                if (employeeUser.getFcmToken() != null) {
                    Map<String, String> data = new HashMap<>();
                    data.put("type", "LEAVE_APPROVED");
                    data.put("link", "/leave-request");
                    fcmService.sendToDevice(
                            employeeUser.getFcmToken(),
                            "✅ Leave Request Approved",
                            "Your leave from " + leaveRequest.getStartDate() + " to " + leaveRequest.getEndDate()
                                    + " has been approved.",
                            data);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send notification: {}", e.getMessage());
        }

        return saved;
    }

    @Deprecated
    public LeaveRequest approveLeaveRequest(Long id, String note, User currentUser) {
        if (!accessControlService.canApproveLeave(currentUser)) {
            throw new ForbiddenException("You do not have permission to approve leave requests");
        }

        log.info("Approving leave request ID: {} by user: {}", id, currentUser.getUsername());
        LeaveRequest leaveRequest = getLeaveRequestById(id);

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Request is already processed");
        }

        leaveRequest.approve(currentUser, note);
        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        try {
            User employeeUser = leaveRequest.getEmployee().getUser();
            if (employeeUser != null) {
                hrNotificationService.createLeaveApprovedNotification(
                        employeeUser.getUserId(),
                        leaveRequest.getStartDate().toString(),
                        leaveRequest.getEndDate().toString());

                if (employeeUser.getFcmToken() != null) {
                    Map<String, String> data = new HashMap<>();
                    data.put("type", "LEAVE_APPROVED");
                    data.put("link", "/leave-request");
                    fcmService.sendToDevice(
                            employeeUser.getFcmToken(),
                            "✅ Leave Request Approved",
                            "Your leave from " + leaveRequest.getStartDate() + " to " + leaveRequest.getEndDate()
                                    + " has been approved.",
                            data);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send notification: {}", e.getMessage());
        }

        return saved;
    }

    public LeaveRequest rejectLeaveRequest(Long id, String note, User currentUser) {
        if (!accessControlService.canApproveLeave(currentUser)) {
            throw new ForbiddenException("You do not have permission to reject leave requests");
        }

        log.info("Rejecting leave request ID: {} by user: {}", id, currentUser.getUsername());
        LeaveRequest leaveRequest = getLeaveRequestById(id);

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Request is already processed");
        }

        leaveRequest.reject(currentUser, note);
        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        try {
            User employeeUser = leaveRequest.getEmployee().getUser();
            if (employeeUser != null) {
                String reason = note != null ? note : "No specific reason";
                hrNotificationService.createLeaveRejectedNotification(
                        employeeUser.getUserId(),
                        leaveRequest.getStartDate().toString(),
                        leaveRequest.getEndDate().toString(),
                        reason);

                if (employeeUser.getFcmToken() != null) {
                    Map<String, String> data = new HashMap<>();
                    data.put("type", "LEAVE_REJECTED");
                    data.put("link", "/leave-request");
                    fcmService.sendToDevice(
                            employeeUser.getFcmToken(),
                            "❌ Leave Request Rejected",
                            "Your leave from " + leaveRequest.getStartDate() + " to " + leaveRequest.getEndDate()
                                    + " was rejected. Reason: " + reason,
                            data);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send notification: {}", e.getMessage());
        }

        return saved;
    }

    public List<LeaveRequest> getPendingLeaveRequests() {
        return leaveRequestRepository.findByStatus(LeaveStatus.PENDING);
    }

    public List<LeaveRequest> getApprovedLeaveRequests() {
        return leaveRequestRepository.findByStatus(LeaveStatus.APPROVED);
    }

    public List<LeaveRequest> getRejectedLeaveRequests() {
        return leaveRequestRepository.findByStatus(LeaveStatus.REJECTED);
    }

    public int getTotalLeaveDays(Long employeeId, int year) {
        List<LeaveRequest> leaveRequests = leaveRequestRepository.findApprovedByEmployeeAndYear(employeeId, year);
        return leaveRequests.stream()
                .mapToInt(LeaveRequest::getTotalDays)
                .sum();
    }

    public boolean isOnLeave(Long employeeId, LocalDate date) {
        return leaveRequestRepository.isEmployeeOnLeave(employeeId, date);
    }
}
