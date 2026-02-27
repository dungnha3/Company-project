package DoAn.BE.hrm.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.FeatureFlagService;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.LeaveRequestRequest;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.LeaveRequest.LeaveStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.user.entity.User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;

import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final FeatureFlagService featureFlagService;
    private final AccessControlService accessControlService;
    private final ApplicationEventPublisher eventPublisher;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository,
            EmployeeRepository employeeRepository,
            FeatureFlagService featureFlagService,
            AccessControlService accessControlService,
            ApplicationEventPublisher eventPublisher) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.employeeRepository = employeeRepository;
        this.featureFlagService = featureFlagService;
        this.accessControlService = accessControlService;
        this.eventPublisher = eventPublisher;
    }

    public LeaveRequest createLeaveRequest(LeaveRequestRequest request, User currentUser) {
        featureFlagService.requireLeaveFeature();

        log.info("User {} creating leave request for employee ID: {}", currentUser.getUsername(),
                request.getEmployeeId());
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

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

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        // 🔗 Dispatch webhook event
        eventPublisher
                .publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.LEAVE_REQUESTED,
                        saved, currentUser.getUserId(), "Leave Requested: " + saved.getLeaveType()));

        return saved;
    }

    public LeaveRequest getLeaveRequestById(Long id, User currentUser) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));

        boolean hasPermission;
        try {
            accessControlService.checkLeaveViewAllPermission();
            hasPermission = true;
        } catch (ForbiddenException e) {
            hasPermission = false;
        }

        if (!hasPermission && !leaveRequest.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You do not have permission to view this leave request");
        }

        return leaveRequest;
    }

    private LeaveRequest getLeaveRequestById(Long id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
    }

    public org.springframework.data.domain.Page<LeaveRequest> getAllLeaveRequestsPaged(User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        accessControlService.checkLeaveViewAllPermission();
        return leaveRequestRepository.findAllRequests(pageable);
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

    public void deleteLeaveRequest(Long id, User currentUser) {
        LeaveRequest leaveRequest = getLeaveRequestById(id, currentUser);

        // Ownership check: only the owner or someone with HR permission can delete
        boolean hasPermission;
        try {
            accessControlService.checkLeaveApprovePermission();
            hasPermission = true;
        } catch (ForbiddenException e) {
            hasPermission = false;
        }

        if (!hasPermission && !leaveRequest.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You can only delete your own leave requests");
        }

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Can only delete pending requests");
        }

        leaveRequestRepository.delete(leaveRequest);
    }

    public org.springframework.data.domain.Page<LeaveRequest> getLeaveRequestsByEmployeePaged(Long employeeId,
            org.springframework.data.domain.Pageable pageable) {
        return leaveRequestRepository.findByEmployee_EmployeeId(employeeId, pageable);
    }

    public org.springframework.data.domain.Page<LeaveRequest> getLeaveRequestsInDateRangePaged(LocalDate startDate,
            LocalDate endDate, org.springframework.data.domain.Pageable pageable) {
        return leaveRequestRepository.findByStartDateBetween(startDate, endDate, pageable);
    }

    public LeaveRequest approveLeaveRequest(Long id, String note, User currentUser) {
        accessControlService.checkLeaveApprovePermission();

        log.info("User {} approving leave request ID: {}", currentUser.getUsername(), id);
        LeaveRequest leaveRequest = getLeaveRequestById(id);

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Request is not pending or already processed");
        }

        leaveRequest.approve(currentUser, note);
        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        log.info("✅ Leave request approved by {}", currentUser.getUsername());

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.LEAVE_APPROVED,
                saved, currentUser.getUserId(), "Leave Approved: " + saved.getLeaveType()));

        return saved;
    }

    public LeaveRequest rejectLeaveRequest(Long id, String note, User currentUser) {
        accessControlService.checkLeaveApprovePermission();

        log.info("Rejecting leave request ID: {} by user: {}", id, currentUser.getUsername());
        LeaveRequest leaveRequest = getLeaveRequestById(id);

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Request is already processed");
        }

        leaveRequest.reject(currentUser, note);
        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        // Notifications handled by InternalNotificationListener via HrmEvent

        // Publish Event (Assuming LEAVE_REJECTED type exists)
        eventPublisher.publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.LEAVE_REJECTED,
                saved, currentUser.getUserId(), "Leave Rejected: " + (note != null ? note : "")));

        return saved;
    }

    public org.springframework.data.domain.Page<LeaveRequest> getLeaveRequestsByStatus(
            LeaveStatus status, org.springframework.data.domain.Pageable pageable) {
        return leaveRequestRepository.findByStatus(status, pageable);
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
