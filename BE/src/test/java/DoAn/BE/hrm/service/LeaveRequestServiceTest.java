package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.service.FeatureFlagService;
import DoAn.BE.hrm.dto.LeaveRequestRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.LeaveRequest.LeaveStatus;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveRequest Service Unit Tests")
class LeaveRequestServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private FeatureFlagService featureFlagService;
    @Mock
    private AccessControlService accessControlService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private LeaveRequestService leaveRequestService;

    private User testUser;
    private Employee testEmployee;
    private LeaveRequest testLeaveRequest;
    private Pageable pageable;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("john.doe");

        testEmployee = new Employee();
        testEmployee.setEmployeeId(10L);
        testEmployee.setUser(testUser);

        testLeaveRequest = new LeaveRequest();
        testLeaveRequest.setLeaveRequestId(100L);
        testLeaveRequest.setEmployee(testEmployee);
        testLeaveRequest.setLeaveType(LeaveRequest.LeaveType.ANNUAL);
        testLeaveRequest.setStartDate(LocalDate.of(2026, 3, 1));
        testLeaveRequest.setEndDate(LocalDate.of(2026, 3, 5));
        testLeaveRequest.setReason("Family vacation");
        testLeaveRequest.setStatus(LeaveStatus.PENDING);

        pageable = PageRequest.of(0, 10);
    }
    // CREATE
    @Nested
    @DisplayName("Create Leave Request")
    class CreateTests {

        @Test
        @DisplayName("Create leave request successfully")
        void createLeaveRequest_success() {
            LeaveRequestRequest request = buildRequest(10L, LocalDate.of(2026, 3, 1),
                    LocalDate.of(2026, 3, 5), "Vacation");

            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(i -> i.getArgument(0));

            LeaveRequest result = leaveRequestService.createLeaveRequest(request, testUser);

            assertNotNull(result);
            assertEquals(LeaveStatus.PENDING, result.getStatus());
            assertEquals(testEmployee, result.getEmployee());
            verify(featureFlagService).requireLeaveFeature();
            verify(leaveRequestRepository).save(any(LeaveRequest.class));
            verify(eventPublisher).publishEvent(any());
        }

        @Test
        @DisplayName("Create leave request - employee not found throws ResourceNotFoundException")
        void createLeaveRequest_employeeNotFound() {
            LeaveRequestRequest request = buildRequest(999L, LocalDate.of(2026, 3, 1),
                    LocalDate.of(2026, 3, 5), "Vacation");

            when(employeeRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> leaveRequestService.createLeaveRequest(request, testUser));
            verify(leaveRequestRepository, never()).save(any());
        }

        @Test
        @DisplayName("Create leave request - end date before start date throws BadRequestException")
        void createLeaveRequest_invalidDateRange() {
            LeaveRequestRequest request = buildRequest(10L, LocalDate.of(2026, 3, 5),
                    LocalDate.of(2026, 3, 1), "Vacation");

            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));

            assertThrows(BadRequestException.class,
                    () -> leaveRequestService.createLeaveRequest(request, testUser));
            verify(leaveRequestRepository, never()).save(any());
        }
    }
    // READ
    @Nested
    @DisplayName("Read Leave Requests")
    class ReadTests {

        @Test
        @DisplayName("Get by ID - owner can view own request")
        void getLeaveRequestById_owner_success() {
            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveViewAllPermission();

            LeaveRequest result = leaveRequestService.getLeaveRequestById(100L, testUser);

            assertNotNull(result);
            assertEquals(100L, result.getLeaveRequestId());
        }

        @Test
        @DisplayName("Get by ID - HR manager can view any request")
        void getLeaveRequestById_hrManager_success() {
            User hrUser = new User();
            hrUser.setUserId(2L);

            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doNothing().when(accessControlService).checkLeaveViewAllPermission();

            LeaveRequest result = leaveRequestService.getLeaveRequestById(100L, hrUser);

            assertNotNull(result);
            assertEquals(100L, result.getLeaveRequestId());
        }

        @Test
        @DisplayName("Get by ID - non-owner without permission throws ForbiddenException")
        void getLeaveRequestById_forbidden() {
            User otherUser = new User();
            otherUser.setUserId(999L);

            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveViewAllPermission();

            assertThrows(ForbiddenException.class,
                    () -> leaveRequestService.getLeaveRequestById(100L, otherUser));
        }

        @Test
        @DisplayName("Get by ID - not found throws ResourceNotFoundException")
        void getLeaveRequestById_notFound() {
            when(leaveRequestRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> leaveRequestService.getLeaveRequestById(999L, testUser));
        }

        @Test
        @DisplayName("Get all paged - authorized user succeeds")
        void getAllLeaveRequestsPaged_success() {
            Page<LeaveRequest> page = new PageImpl<>(List.of(testLeaveRequest));
            doNothing().when(accessControlService).checkLeaveViewAllPermission();
            when(leaveRequestRepository.findAllRequests(pageable)).thenReturn(page);

            Page<LeaveRequest> result = leaveRequestService.getAllLeaveRequestsPaged(testUser, pageable);

            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("Get all paged - unauthorized throws ForbiddenException")
        void getAllLeaveRequestsPaged_forbidden() {
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveViewAllPermission();

            assertThrows(ForbiddenException.class,
                    () -> leaveRequestService.getAllLeaveRequestsPaged(testUser, pageable));
        }

        @Test
        @DisplayName("Get by employee paged returns page")
        void getLeaveRequestsByEmployeePaged_success() {
            Page<LeaveRequest> page = new PageImpl<>(List.of(testLeaveRequest));
            when(leaveRequestRepository.findByEmployee_EmployeeId(10L, pageable)).thenReturn(page);

            Page<LeaveRequest> result = leaveRequestService.getLeaveRequestsByEmployeePaged(10L, pageable);

            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("Get by status returns page")
        void getLeaveRequestsByStatus_success() {
            Page<LeaveRequest> page = new PageImpl<>(List.of(testLeaveRequest));
            when(leaveRequestRepository.findByStatus(LeaveStatus.PENDING, pageable)).thenReturn(page);

            Page<LeaveRequest> result = leaveRequestService.getLeaveRequestsByStatus(LeaveStatus.PENDING, pageable);

            assertEquals(1, result.getTotalElements());
        }

        @Test
        @DisplayName("Get by date range paged returns page")
        void getLeaveRequestsInDateRangePaged_success() {
            LocalDate start = LocalDate.of(2026, 3, 1);
            LocalDate end = LocalDate.of(2026, 3, 31);
            Page<LeaveRequest> page = new PageImpl<>(List.of(testLeaveRequest));
            when(leaveRequestRepository.findByStartDateBetween(start, end, pageable)).thenReturn(page);

            Page<LeaveRequest> result = leaveRequestService.getLeaveRequestsInDateRangePaged(start, end, pageable);

            assertEquals(1, result.getTotalElements());
        }
    }
    // UPDATE
    @Nested
    @DisplayName("Update Leave Request")
    class UpdateTests {

        @Test
        @DisplayName("Update pending request by owner succeeds")
        void updateLeaveRequest_success() {
            LeaveRequestRequest request = new LeaveRequestRequest();
            request.setReason("Updated reason");

            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveViewAllPermission();
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(i -> i.getArgument(0));

            LeaveRequest result = leaveRequestService.updateLeaveRequest(100L, request, testUser);

            assertEquals("Updated reason", result.getReason());
        }

        @Test
        @DisplayName("Update non-pending request throws BadRequestException")
        void updateLeaveRequest_notPending() {
            testLeaveRequest.setStatus(LeaveStatus.APPROVED);
            LeaveRequestRequest request = new LeaveRequestRequest();
            request.setReason("Updated");

            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveViewAllPermission();

            assertThrows(BadRequestException.class,
                    () -> leaveRequestService.updateLeaveRequest(100L, request, testUser));
        }

        @Test
        @DisplayName("Update by non-owner throws ForbiddenException")
        void updateLeaveRequest_notOwner() {
            User otherUser = new User();
            otherUser.setUserId(999L);
            LeaveRequestRequest request = new LeaveRequestRequest();

            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doNothing().when(accessControlService).checkLeaveViewAllPermission();

            assertThrows(ForbiddenException.class,
                    () -> leaveRequestService.updateLeaveRequest(100L, request, otherUser));
        }

        @Test
        @DisplayName("Update with different employeeId throws BadRequestException")
        void updateLeaveRequest_changeEmployee() {
            LeaveRequestRequest request = new LeaveRequestRequest();
            request.setEmployeeId(999L);

            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveViewAllPermission();

            assertThrows(BadRequestException.class,
                    () -> leaveRequestService.updateLeaveRequest(100L, request, testUser));
        }
    }
    // DELETE
    @Nested
    @DisplayName("Delete Leave Request")
    class DeleteTests {

        @Test
        @DisplayName("Delete pending request succeeds")
        void deleteLeaveRequest_success() {
            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveViewAllPermission();

            leaveRequestService.deleteLeaveRequest(100L, testUser);

            verify(leaveRequestRepository).delete(testLeaveRequest);
        }

        @Test
        @DisplayName("Delete non-pending request throws BadRequestException")
        void deleteLeaveRequest_notPending() {
            testLeaveRequest.setStatus(LeaveStatus.APPROVED);
            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveViewAllPermission();

            assertThrows(BadRequestException.class,
                    () -> leaveRequestService.deleteLeaveRequest(100L, testUser));
            verify(leaveRequestRepository, never()).delete(any());
        }
    }
    // APPROVAL WORKFLOW
    @Nested
    @DisplayName("Approval Workflow")
    class ApprovalTests {

        @Test
        @DisplayName("Approve leave request succeeds for authorized user")
        void approveLeaveRequest_success() {
            // checkLeaveApprovePermission() does not throw → allowed
            doNothing().when(accessControlService).checkLeaveApprovePermission();
            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(i -> i.getArgument(0));

            LeaveRequest result = leaveRequestService.approveLeaveRequest(100L, "Approved", testUser);

            assertNotNull(result);
            assertEquals(LeaveStatus.APPROVED, result.getStatus());
            assertEquals(testUser, result.getApprover());
            assertNotNull(result.getApprovedAt());
            assertEquals("Approved", result.getApprovalNote());
            verify(eventPublisher).publishEvent(any());
        }

        @Test
        @DisplayName("Approve without permission throws ForbiddenException")
        void approveLeaveRequest_noPermission() {
            doThrow(new ForbiddenException("No permission"))
                    .when(accessControlService).checkLeaveApprovePermission();

            assertThrows(ForbiddenException.class,
                    () -> leaveRequestService.approveLeaveRequest(100L, "note", testUser));
        }

        @Test
        @DisplayName("Approve non-pending request throws BadRequestException")
        void approveLeaveRequest_notPending() {
            testLeaveRequest.setStatus(LeaveStatus.APPROVED);
            doNothing().when(accessControlService).checkLeaveApprovePermission();
            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));

            assertThrows(BadRequestException.class,
                    () -> leaveRequestService.approveLeaveRequest(100L, "note", testUser));
        }

        @Test
        @DisplayName("Reject leave request succeeds for authorized user")
        void rejectLeaveRequest_success() {
            doNothing().when(accessControlService).checkLeaveApprovePermission();
            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(i -> i.getArgument(0));

            LeaveRequest result = leaveRequestService.rejectLeaveRequest(100L, "Rejected", testUser);

            assertNotNull(result);
            verify(eventPublisher).publishEvent(any());
        }

        @Test
        @DisplayName("Reject without permission throws ForbiddenException")
        void rejectLeaveRequest_forbidden() {
            doThrow(new ForbiddenException("")).when(accessControlService).checkLeaveApprovePermission();

            assertThrows(ForbiddenException.class,
                    () -> leaveRequestService.rejectLeaveRequest(100L, "note", testUser));
        }

        @Test
        @DisplayName("Reject non-pending request throws BadRequestException")
        void rejectLeaveRequest_notPending() {
            testLeaveRequest.setStatus(LeaveStatus.APPROVED);
            doNothing().when(accessControlService).checkLeaveApprovePermission();
            when(leaveRequestRepository.findById(100L)).thenReturn(Optional.of(testLeaveRequest));

            assertThrows(BadRequestException.class,
                    () -> leaveRequestService.rejectLeaveRequest(100L, "note", testUser));
        }
    }
    // STATISTICS
    @Nested
    @DisplayName("Statistics")
    class StatisticsTests {

        @Test
        @DisplayName("Get total leave days sums approved requests")
        void getTotalLeaveDays_success() {
            LeaveRequest lr1 = new LeaveRequest();
            lr1.setStartDate(LocalDate.of(2026, 1, 1));
            lr1.setEndDate(LocalDate.of(2026, 1, 3));
            lr1.setTotalDays(3); // 3 days (Jan 1-3)
            LeaveRequest lr2 = new LeaveRequest();
            lr2.setStartDate(LocalDate.of(2026, 2, 1));
            lr2.setEndDate(LocalDate.of(2026, 2, 2));
            lr2.setTotalDays(2); // 2 days (Feb 1-2)

            when(leaveRequestRepository.findApprovedByEmployeeAndYear(10L, 2026))
                    .thenReturn(List.of(lr1, lr2));

            int result = leaveRequestService.getTotalLeaveDays(10L, 2026);

            assertEquals(5, result);
            verify(leaveRequestRepository).findApprovedByEmployeeAndYear(10L, 2026);
        }

        @Test
        @DisplayName("isOnLeave delegates to repository")
        void isOnLeave_true() {
            when(leaveRequestRepository.isEmployeeOnLeave(10L, LocalDate.of(2026, 3, 1)))
                    .thenReturn(true);

            assertTrue(leaveRequestService.isOnLeave(10L, LocalDate.of(2026, 3, 1)));
        }

        @Test
        @DisplayName("isOnLeave returns false when not on leave")
        void isOnLeave_false() {
            when(leaveRequestRepository.isEmployeeOnLeave(10L, LocalDate.of(2026, 3, 1)))
                    .thenReturn(false);

            assertFalse(leaveRequestService.isOnLeave(10L, LocalDate.of(2026, 3, 1)));
        }
    }
    // HELPER
    private LeaveRequestRequest buildRequest(Long employeeId, LocalDate start, LocalDate end, String reason) {
        LeaveRequestRequest request = new LeaveRequestRequest();
        request.setEmployeeId(employeeId);
        request.setStartDate(start);
        request.setEndDate(end);
        request.setLeaveType(LeaveRequest.LeaveType.ANNUAL);
        request.setReason(reason);
        return request;
    }
}
