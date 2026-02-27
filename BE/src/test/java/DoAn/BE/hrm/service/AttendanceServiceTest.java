package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.company.service.CompanyService;
import DoAn.BE.hrm.dto.AttendanceRequest;
import DoAn.BE.hrm.entity.Attendance;
import DoAn.BE.hrm.entity.Attendance.AttendanceStatus;
import DoAn.BE.hrm.entity.Attendance.CheckInMethod;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.AttendanceRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Attendance Service Unit Tests")
class AttendanceServiceTest {

    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private CompanyService companyService;
    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private AttendanceService attendanceService;

    private User testUser;
    private Employee testEmployee;
    private Attendance testAttendance;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("john.doe");

        testEmployee = new Employee();
        testEmployee.setEmployeeId(10L);
        testEmployee.setUser(testUser);
        testEmployee.setFullName("John Doe");

        testAttendance = new Attendance();
        testAttendance.setAttendanceId(100L);
        testAttendance.setEmployee(testEmployee);
        testAttendance.setAttendanceDate(LocalDate.of(2026, 3, 1));
        testAttendance.setCheckInTime(LocalTime.of(8, 30));
        testAttendance.setStatus(AttendanceStatus.FULL_DAY);

    }
    // CREATE
    @Nested
    @DisplayName("Create Attendance")
    class CreateTests {

        @Test
        @DisplayName("Create manual attendance by HR Manager succeeds")
        void createAttendance_success() {
            doNothing().when(accessControlService).checkHrEditPermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

            AttendanceRequest request = new AttendanceRequest();
            request.setEmployeeId(10L);
            request.setAttendanceDate(LocalDate.of(2026, 3, 1));
            request.setCheckInTime(LocalTime.of(8, 0));
            request.setStatus(AttendanceStatus.FULL_DAY);

            Attendance result = attendanceService.createAttendance(request, testUser);

            assertNotNull(result);
            assertEquals(CheckInMethod.MANUAL, result.getCheckInMethod());
            verify(attendanceRepository).save(any(Attendance.class));
        }

        @Test
        @DisplayName("Create attendance by non-HR throws ForbiddenException")
        void createAttendance_forbidden() {
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrEditPermission();

            assertThrows(ForbiddenException.class,
                    () -> attendanceService.createAttendance(new AttendanceRequest(), testUser));
        }

        @Test
        @DisplayName("Create attendance with null employee ID throws BadRequestException")
        void createAttendance_nullEmployee() {
            doNothing().when(accessControlService).checkHrEditPermission();

            AttendanceRequest request = new AttendanceRequest();
            // employeeId is null

            assertThrows(BadRequestException.class,
                    () -> attendanceService.createAttendance(request, testUser));
        }

        @Test
        @DisplayName("Create attendance - employee not found throws ResourceNotFoundException")
        void createAttendance_employeeNotFound() {
            doNothing().when(accessControlService).checkHrEditPermission();
            when(employeeRepository.findById(999L)).thenReturn(Optional.empty());

            AttendanceRequest request = new AttendanceRequest();
            request.setEmployeeId(999L);

            assertThrows(ResourceNotFoundException.class,
                    () -> attendanceService.createAttendance(request, testUser));
        }
    }
    // READ
    @Nested
    @DisplayName("Read Attendance")
    class ReadTests {

        @Test
        @DisplayName("Get by ID as HR Manager succeeds")
        void getAttendanceById_hrManager() {
            when(attendanceRepository.findById(100L)).thenReturn(Optional.of(testAttendance));
            doNothing().when(accessControlService).checkHrViewPermission();

            Attendance result = attendanceService.getAttendanceById(100L, testUser);

            assertNotNull(result);
            assertEquals(100L, result.getAttendanceId());
        }

        @Test
        @DisplayName("Get by ID as owner succeeds")
        void getAttendanceById_owner() {
            when(attendanceRepository.findById(100L)).thenReturn(Optional.of(testAttendance));
            doThrow(new ForbiddenException("No view permission")).when(accessControlService).checkHrViewPermission();

            Attendance result = attendanceService.getAttendanceById(100L, testUser);

            assertNotNull(result);
        }

        @Test
        @DisplayName("Get by ID - non-owner without permission throws ForbiddenException")
        void getAttendanceById_forbidden() {
            User otherUser = new User();
            otherUser.setUserId(999L);

            when(attendanceRepository.findById(100L)).thenReturn(Optional.of(testAttendance));
            doThrow(new ForbiddenException("No view permission")).when(accessControlService).checkHrViewPermission();

            assertThrows(ForbiddenException.class,
                    () -> attendanceService.getAttendanceById(100L, otherUser));
        }

        @Test
        @DisplayName("Get by ID - not found throws ResourceNotFoundException")
        void getAttendanceById_notFound() {
            when(attendanceRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> attendanceService.getAttendanceById(999L, testUser));
        }

        @Test
        @DisplayName("Get all attendance - forbidden for non-HR")
        void getAllAttendance_forbidden() {
            doThrow(new ForbiddenException("No view permission")).when(accessControlService).checkHrViewPermission();

            assertThrows(ForbiddenException.class,
                    () -> attendanceService.getAllAttendance(testUser));
        }

        @Test
        @DisplayName("Get attendance by employee - null ID throws BadRequestException")
        void getAttendanceByEmployee_nullId() {
            assertThrows(BadRequestException.class,
                    () -> attendanceService.getAttendanceByEmployee(null, testUser));
        }

        @Test
        @DisplayName("Get attendance by employee and month returns list")
        void getAttendanceByEmployeeAndMonth_success() {
            when(attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDateBetween(
                    eq(10L), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(testAttendance));

            List<Attendance> result = attendanceService.getAttendanceByEmployeeAndMonth(10L, 3, 2026);

            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Get attendance by date range returns list")
        void getAttendanceByDateRange_success() {
            LocalDate start = LocalDate.of(2026, 3, 1);
            LocalDate end = LocalDate.of(2026, 3, 31);
            when(attendanceRepository.findByAttendanceDateBetween(start, end))
                    .thenReturn(List.of(testAttendance));

            List<Attendance> result = attendanceService.getAttendanceByDateRange(start, end);

            assertEquals(1, result.size());
        }
    }
    // UPDATE
    @Nested
    @DisplayName("Update Attendance")
    class UpdateTests {

        @Test
        @DisplayName("Update attendance by HR Manager succeeds")
        void updateAttendance_success() {
            doNothing().when(accessControlService).checkHrEditPermission();
            when(attendanceRepository.findById(100L)).thenReturn(Optional.of(testAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

            AttendanceRequest request = new AttendanceRequest();
            request.setNote("Updated note");

            Attendance result = attendanceService.updateAttendance(100L, request, testUser);

            assertEquals("Updated note", result.getNote());
        }

        @Test
        @DisplayName("Update attendance - non-HR throws ForbiddenException")
        void updateAttendance_forbidden() {
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrEditPermission();

            assertThrows(ForbiddenException.class,
                    () -> attendanceService.updateAttendance(100L, new AttendanceRequest(), testUser));
        }
    }
    // DELETE
    @Nested
    @DisplayName("Delete Attendance")
    class DeleteTests {

        @Test
        @DisplayName("Delete attendance by HR Manager succeeds")
        void deleteAttendance_success() {
            doNothing().when(accessControlService).checkHrEditPermission();
            when(attendanceRepository.findById(100L)).thenReturn(Optional.of(testAttendance));

            attendanceService.deleteAttendance(100L, testUser);

            verify(attendanceRepository).delete(testAttendance);
        }

        @Test
        @DisplayName("Delete attendance - non-HR throws ForbiddenException")
        void deleteAttendance_forbidden() {
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrEditPermission();

            assertThrows(ForbiddenException.class,
                    () -> attendanceService.deleteAttendance(100L, testUser));
        }
    }
    // CHECK-IN / CHECK-OUT
    @Nested
    @DisplayName("Check-in / Check-out")
    class CheckInOutTests {

        @Test
        @DisplayName("Check-in succeeds for first time today")
        void checkIn_success() {
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            doNothing().when(accessControlService).checkHrEditPermission();
            when(attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDate(eq(10L), any()))
                    .thenReturn(Collections.emptyList());
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

            Attendance result = attendanceService.checkIn(10L, LocalDate.now());

            assertNotNull(result);
            assertEquals(CheckInMethod.MANUAL, result.getCheckInMethod());
            assertNotNull(result.getCheckInTime());
        }

        @Test
        @DisplayName("Check-in fails if already checked in today")
        void checkIn_alreadyCheckedIn() {
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            doNothing().when(accessControlService).checkHrEditPermission();
            when(attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDate(eq(10L), any()))
                    .thenReturn(List.of(testAttendance));

            assertThrows(BadRequestException.class,
                    () -> attendanceService.checkIn(10L, LocalDate.now()));
        }

        @Test
        @DisplayName("Check-out succeeds")
        void checkOut_success() {
            testAttendance.setCheckOutTime(null); // not yet checked out
            when(attendanceRepository.findById(100L)).thenReturn(Optional.of(testAttendance));
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

            Attendance result = attendanceService.checkOut(100L);

            assertNotNull(result);
            assertNotNull(result.getCheckOutTime());
        }

        @Test
        @DisplayName("Check-out fails if already checked out")
        void checkOut_alreadyCheckedOut() {
            testAttendance.setCheckOutTime(LocalTime.of(17, 0));
            when(attendanceRepository.findById(100L)).thenReturn(Optional.of(testAttendance));

            assertThrows(BadRequestException.class,
                    () -> attendanceService.checkOut(100L));
        }
    }
    // STATISTICS
    @Nested
    @DisplayName("Statistics")
    class StatisticsTests {

        @Test
        @DisplayName("Count working days delegates to repository")
        void countWorkingDays_success() {
            when(attendanceRepository.countWorkingDaysByEmployeeAndMonth(eq(10L), any(), any()))
                    .thenReturn(22);

            int result = attendanceService.countWorkingDays(10L, 2026, 3);

            assertEquals(22, result);
        }

        @Test
        @DisplayName("Get total working hours delegates to repository")
        void getTotalWorkingHours_success() {
            when(attendanceRepository.sumWorkingHoursByEmployeeAndMonth(eq(10L), any(), any()))
                    .thenReturn(new BigDecimal("176.5"));

            BigDecimal result = attendanceService.getTotalWorkingHours(10L, 2026, 3);

            assertEquals(new BigDecimal("176.5"), result);
        }

        @Test
        @DisplayName("Count late days delegates to repository")
        void countLateDays_success() {
            when(attendanceRepository.countLateDaysByEmployeeAndMonth(eq(10L), any(), any()))
                    .thenReturn(3L);

            long result = attendanceService.countLateDays(10L, 2026, 3);

            assertEquals(3L, result);
        }

        @Test
        @DisplayName("Count early leave days delegates to repository")
        void countEarlyLeaveDays_success() {
            when(attendanceRepository.countEarlyLeaveDaysByEmployeeAndMonth(eq(10L), any(), any()))
                    .thenReturn(1L);

            long result = attendanceService.countEarlyLeaveDays(10L, 2026, 3);

            assertEquals(1L, result);
        }
    }
    // STATUS TODAY
    @Nested
    @DisplayName("Status Today")
    class StatusTodayTests {

        @Test
        @DisplayName("Not checked in today returns checkedIn=false")
        void getStatusToday_notCheckedIn() {
            when(attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDate(eq(10L), any()))
                    .thenReturn(Collections.emptyList());

            Map<String, Object> result = attendanceService.getAttendanceStatusToday(10L);

            assertEquals(false, result.get("checkedIn"));
            assertEquals(false, result.get("checkedOut"));
            assertEquals("Not Checked-in", result.get("message"));
        }

        @Test
        @DisplayName("Checked in but not out returns Working")
        void getStatusToday_working() {
            testAttendance.setCheckOutTime(null);
            when(attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDate(eq(10L), any()))
                    .thenReturn(List.of(testAttendance));

            Map<String, Object> result = attendanceService.getAttendanceStatusToday(10L);

            assertEquals(true, result.get("checkedIn"));
            assertEquals(false, result.get("checkedOut"));
            assertEquals("Working", result.get("message"));
        }

        @Test
        @DisplayName("Checked in and out returns Shift Completed")
        void getStatusToday_completed() {
            testAttendance.setCheckOutTime(LocalTime.of(17, 30));
            when(attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDate(eq(10L), any()))
                    .thenReturn(List.of(testAttendance));

            Map<String, Object> result = attendanceService.getAttendanceStatusToday(10L);

            assertEquals(true, result.get("checkedIn"));
            assertEquals(true, result.get("checkedOut"));
            assertEquals("Shift Completed", result.get("message"));
        }

        @Test
        @DisplayName("Null employee ID returns invalid response")
        void getStatusToday_null() {
            Map<String, Object> result = attendanceService.getAttendanceStatusToday(null);

            assertEquals(false, result.get("checkedIn"));
            assertEquals("Invalid ID", result.get("message"));
        }
    }
    // UTILITY
    @Nested
    @DisplayName("Utility")
    class UtilityTests {

        @Test
        @DisplayName("Get employee for user returns employee")
        void getEmployeeForUser_found() {
            when(employeeRepository.findByUser_UserId(1L)).thenReturn(Optional.of(testEmployee));

            Employee result = attendanceService.getEmployeeForUser(testUser);

            assertNotNull(result);
            assertEquals(10L, result.getEmployeeId());
        }

        @Test
        @DisplayName("Get employee for user returns null when not found")
        void getEmployeeForUser_notFound() {
            when(employeeRepository.findByUser_UserId(1L)).thenReturn(Optional.empty());

            Employee result = attendanceService.getEmployeeForUser(testUser);

            assertNull(result);
        }
    }
}
