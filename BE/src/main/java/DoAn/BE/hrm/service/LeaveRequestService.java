package DoAn.BE.hrm.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.LeaveRequestRequest;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.LeaveRequest.LeaveStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.entity.Issue;
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
        private final AccessControlService accessControlService;
    private final ApplicationEventPublisher eventPublisher;
    private final IssueRepository issueRepository;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository,
            EmployeeRepository employeeRepository,
            AccessControlService accessControlService,
            ApplicationEventPublisher eventPublisher,
            IssueRepository issueRepository) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.employeeRepository = employeeRepository;
        this.accessControlService = accessControlService;
        this.eventPublisher = eventPublisher;
        this.issueRepository = issueRepository;
    }

    public LeaveRequest createLeaveRequest(LeaveRequestRequest request, User currentUser) {
        log.info("User {} creating leave request", currentUser.getUsername());

        // Auto-resolve employeeId from currentUser if not provided
        Long employeeId = request.getEmployeeId();
        if (employeeId == null) {
            Employee currentEmployee = employeeRepository.findByUser_UserId(currentUser.getUserId())
                    .orElseThrow(() -> new BadRequestException("Bạn chưa có hồ sơ nhân viên. Liên hệ HR để được tạo."));
            employeeId = currentEmployee.getEmployeeId();
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        if (employee.getUser() == null || !employee.getUser().getUserId().equals(currentUser.getUserId())) {
            // Check if user has HR leave approval permission (managers can create for
            // others)
            try {
                accessControlService.checkLeaveApprovePermission();
            } catch (ForbiddenException e) {
                throw new ForbiddenException("You can only create leave requests for yourself");
            }
        }

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        if (request.getLeaveType() == LeaveRequest.LeaveType.ANNUAL) {
            int currentYear = LocalDate.now().getYear();
            int usedDays = getTotalLeaveDays(employee.getEmployeeId(), currentYear);
            long requestedDays = java.time.temporal.ChronoUnit.DAYS.between(request.getStartDate(),
                    request.getEndDate()) + 1;
            if (usedDays + requestedDays > 12) {
                throw new BadRequestException(
                        "Requested leave days exceed annual leave quota (12 days/year). Used: " + usedDays);
            }
        }

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setEmployee(employee);
        leaveRequest.setLeaveType(request.getLeaveType());
        leaveRequest.setStartDate(request.getStartDate());
        leaveRequest.setEndDate(request.getEndDate());
        leaveRequest.setReason(request.getReason());
        leaveRequest.setStatus(LeaveRequest.LeaveStatus.PENDING);
        // Optional project link
        leaveRequest.setProjectId(request.getProjectId());
        leaveRequest.setProjectName(request.getProjectName());

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

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
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null)
            return org.springframework.data.domain.Page.empty(pageable);
        return leaveRequestRepository.findByCompanyId(companyId, pageable);
    }

    public LeaveRequest updateLeaveRequest(Long id, LeaveRequestRequest request, User currentUser) {
        LeaveRequest leaveRequest = getLeaveRequestById(id, currentUser);

        boolean hasPermission;
        try {
            accessControlService.checkLeaveApprovePermission();
            hasPermission = true;
        } catch (ForbiddenException e) {
            hasPermission = false;
        }

        if (!hasPermission && !leaveRequest.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
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
            User currentUser, org.springframework.data.domain.Pageable pageable) {
        if (!accessControlService.hasPermission("LEAVE.VIEW_ALL")) {
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
            if (employee.getUser() == null || !employee.getUser().getUserId().equals(currentUser.getUserId())) {
                throw new ForbiddenException("You can only view your own leave requests");
            }
        }
        return leaveRequestRepository.findByEmployee_EmployeeId(employeeId, pageable);
    }

    public org.springframework.data.domain.Page<LeaveRequest> getLeaveRequestsInDateRangePaged(LocalDate startDate,
            LocalDate endDate, org.springframework.data.domain.Pageable pageable) {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            throw new ForbiddenException("Không xác định được công ty");
        }
        return leaveRequestRepository.findByStartDateBetweenAndEmployee_CompanyId(startDate, endDate, companyId,
                pageable);
    }

    public LeaveRequest approveLeaveRequest(Long id, String note, User currentUser) {
        accessControlService.checkLeaveApprovePermission();

        log.info("User {} approving leave request ID: {}", currentUser.getUsername(), id);
        LeaveRequest leaveRequest = getLeaveRequestById(id);


        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("Request is not pending or already processed");
        }

        if (leaveRequest.getLeaveType() == LeaveRequest.LeaveType.ANNUAL) {
            int currentYear = LocalDate.now().getYear();
            int usedDays = getTotalLeaveDays(leaveRequest.getEmployee().getEmployeeId(), currentYear);
            if (usedDays + leaveRequest.getTotalDays() > 12) {
                throw new BadRequestException(
                        "Cannot approve: exceeds annual leave quota of 12 days. Used: " + usedDays);
            }
        }

        leaveRequest.approve(currentUser, note);
        
        if (leaveRequest.getLeaveType() == LeaveRequest.LeaveType.ANNUAL) {
            Employee emp = leaveRequest.getEmployee();
            if (emp.getLeaveBalance() != null) {
                emp.setLeaveBalance(emp.getLeaveBalance() - leaveRequest.getTotalDays());
                employeeRepository.save(emp);
            }
        }
        
        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        log.info("Leave request approved by {}", currentUser.getUsername());

        // AUTO-SHIFT DEADLINES FOR OPEN ISSUES
        if (leaveRequest.getEmployee().getUser() != null) {
            Long userId = leaveRequest.getEmployee().getUser().getUserId();
            long daysToShift = java.time.temporal.ChronoUnit.DAYS.between(leaveRequest.getStartDate(), leaveRequest.getEndDate()) + 1;
            
            List<Issue> activeIssues = issueRepository.findByAssignee_UserId(userId);
            for (Issue issue : activeIssues) {
                if (!issue.isDone() && issue.getDueDate() != null) {
                    // If deadline falls inside leave OR after leave (because leave delayed their work)
                    if (!issue.getDueDate().isBefore(leaveRequest.getStartDate())) {
                        issue.setDueDate(issue.getDueDate().plusDays(daysToShift));
                        issueRepository.save(issue);
                        log.info("Auto-shifted deadline for issue {} by {} days due to leave", issue.getIssueKey(), daysToShift);
                    }
                }
            }
        }

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
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            return org.springframework.data.domain.Page.empty(pageable);
        }
        return leaveRequestRepository.findByStatusAndCompanyId(status, companyId, pageable);
    }

    public Employee findEmployeeByUserId(Long userId) {
        return employeeRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ nhân viên của bạn"));
    }

    public int getTotalLeaveDays(Long employeeId, int year) {
        List<LeaveRequest> leaveRequests = leaveRequestRepository.findApprovedByEmployeeAndYear(employeeId, year);
        return leaveRequests.stream()
                .filter(lr -> lr.getLeaveType() == LeaveRequest.LeaveType.ANNUAL)
                .mapToInt(LeaveRequest::getTotalDays)
                .sum();
    }

    public boolean isOnLeave(Long employeeId, LocalDate date) {
        return leaveRequestRepository.isEmployeeOnLeave(employeeId, date);
    }

    /**
     * Lấy danh sách nghỉ phép đã duyệt trong khoảng thời gian
     * Dùng cho Calendar — hiển thị availability của team members.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.List<LeaveRequest> getTeamCalendarLeaves(LocalDate startDate, LocalDate endDate) {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) return java.util.Collections.emptyList();
        return leaveRequestRepository.findApprovedInDateRangeByCompany(startDate, endDate, companyId);
    }
}
