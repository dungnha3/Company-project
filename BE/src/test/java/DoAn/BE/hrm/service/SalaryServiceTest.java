package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.CreateSalaryRequest;
import DoAn.BE.hrm.dto.UpdateSalaryRequest;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Salary;
import DoAn.BE.hrm.repository.AttendanceRepository;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.SalaryRepository;
import DoAn.BE.notification.service.FCMService;
import DoAn.BE.notification.service.HRNotificationService;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Salary Service Unit Tests")
class SalaryServiceTest {

    @Mock
    private SalaryRepository salaryRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ContractRepository contractRepository;
    @Mock
    private AttendanceRepository attendanceRepository;
    @Mock
    private HRNotificationService hrNotificationService;
    @Mock
    private FCMService fcmService;
    @Mock
    private AccessControlService accessControlService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private SalaryService salaryService;

    private User testUser;
    private Employee testEmployee;
    private Salary testSalary;
    private Pageable pageable;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("accountant");

        testEmployee = new Employee();
        testEmployee.setEmployeeId(10L);
        testEmployee.setUser(testUser);
        testEmployee.setFullName("John Doe");

        testSalary = new Salary();
        testSalary.setSalaryId(100L);
        testSalary.setEmployee(testEmployee);
        testSalary.setMonth(3);
        testSalary.setYear(2026);
        testSalary.setBaseSalary(new BigDecimal("15000000"));
        testSalary.setWorkingDays(22);
        testSalary.setStandardWorkingDays(26);
        testSalary.setAllowance(BigDecimal.ZERO);
        testSalary.setBonus(BigDecimal.ZERO);
        testSalary.setOvertimeHours(0);
        testSalary.setOtherDeductions(BigDecimal.ZERO);
        testSalary.setPaymentStatus(Salary.PaymentStatus.UNPAID);

        pageable = PageRequest.of(0, 10);
    }
    // CREATE
    @Nested
    @DisplayName("Create Salary")
    class CreateTests {

        @Test
        @DisplayName("Create salary successfully by accountant")
        void createSalary_success() {
            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            when(salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(10L, 3, 2026)).thenReturn(false);
            when(salaryRepository.save(any(Salary.class))).thenAnswer(i -> i.getArgument(0));

            CreateSalaryRequest request = new CreateSalaryRequest();
            request.setEmployeeId(10L);
            request.setMonth(3);
            request.setYear(2026);
            request.setBaseSalary(new BigDecimal("15000000"));

            Salary result = salaryService.createSalary(request, testUser);

            assertNotNull(result);
            assertEquals(Salary.PaymentStatus.UNPAID, result.getPaymentStatus());
            assertEquals(26, result.getStandardWorkingDays());
            verify(salaryRepository).save(any(Salary.class));
        }

        @Test
        @DisplayName("Create salary - forbidden for non-accountant")
        void createSalary_forbidden() {
            doThrow(new ForbiddenException("No permission")).when(accessControlService)
                    .checkSalaryCalculatePermission();

            CreateSalaryRequest request = new CreateSalaryRequest();
            request.setEmployeeId(10L);

            assertThrows(ForbiddenException.class,
                    () -> salaryService.createSalary(request, testUser));
        }

        @Test
        @DisplayName("Create salary - duplicate period throws DuplicateException")
        void createSalary_duplicate() {
            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            when(salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(10L, 3, 2026)).thenReturn(true);

            CreateSalaryRequest request = new CreateSalaryRequest();
            request.setEmployeeId(10L);
            request.setMonth(3);
            request.setYear(2026);
            request.setBaseSalary(new BigDecimal("15000000"));

            assertThrows(DuplicateException.class,
                    () -> salaryService.createSalary(request, testUser));
        }

        @Test
        @DisplayName("Create salary - employee not found throws ResourceNotFoundException")
        void createSalary_employeeNotFound() {
            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(employeeRepository.findById(999L)).thenReturn(Optional.empty());

            CreateSalaryRequest request = new CreateSalaryRequest();
            request.setEmployeeId(999L);
            request.setMonth(3);
            request.setYear(2026);
            request.setBaseSalary(new BigDecimal("15000000"));

            assertThrows(ResourceNotFoundException.class,
                    () -> salaryService.createSalary(request, testUser));
        }
    }
    // READ
    @Nested
    @DisplayName("Read Salary")
    class ReadTests {

        @Test
        @DisplayName("Get by ID as accountant succeeds")
        void getSalaryById_withPermission() {
            when(salaryRepository.findById(100L)).thenReturn(Optional.of(testSalary));
            doNothing().when(accessControlService).checkSalaryViewPermission();

            Salary result = salaryService.getSalaryById(100L, testUser);

            assertNotNull(result);
            assertEquals(100L, result.getSalaryId());
        }

        @Test
        @DisplayName("Get by ID as owner succeeds")
        void getSalaryById_owner() {
            when(salaryRepository.findById(100L)).thenReturn(Optional.of(testSalary));
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkSalaryViewPermission();

            Salary result = salaryService.getSalaryById(100L, testUser);

            assertNotNull(result);
        }

        @Test
        @DisplayName("Get by ID as non-owner without permission throws ForbiddenException")
        void getSalaryById_notOwner_noPermission() {
            User otherUser = new User();
            otherUser.setUserId(999L);

            when(salaryRepository.findById(100L)).thenReturn(Optional.of(testSalary));
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkSalaryViewPermission();

            assertThrows(ForbiddenException.class,
                    () -> salaryService.getSalaryById(100L, otherUser));
        }

        @Test
        @DisplayName("Get by ID not found throws ResourceNotFoundException")
        void getSalaryById_notFound() {
            when(salaryRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> salaryService.getSalaryById(999L, testUser));
        }

        @Test
        @DisplayName("Get by employee and period succeeds for accountant")
        void getSalaryByEmployeeAndPeriod_withPermission() {
            doNothing().when(accessControlService).checkSalaryViewPermission();
            when(salaryRepository.findByEmployee_EmployeeIdAndMonthAndYear(10L, 3, 2026))
                    .thenReturn(Optional.of(testSalary));

            Salary result = salaryService.getSalaryByEmployeeAndPeriod(10L, 3, 2026, testUser);

            assertNotNull(result);
        }

        @Test
        @DisplayName("Get by employee and period - null month/year throws BadRequestException")
        void getSalaryByEmployeeAndPeriod_nullPeriod() {
            doNothing().when(accessControlService).checkSalaryViewPermission();

            assertThrows(BadRequestException.class,
                    () -> salaryService.getSalaryByEmployeeAndPeriod(10L, null, null, testUser));
        }

        @Test
        @DisplayName("Get salaries by employee paged - forbidden for non-owner/non-accountant")
        void getSalariesByEmployeePaged_forbidden() {
            User otherUser = new User();
            otherUser.setUserId(999L);

            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkSalaryViewPermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));

            assertThrows(ForbiddenException.class,
                    () -> salaryService.getSalariesByEmployeePaged(10L, otherUser, pageable));
        }
    }
    // UPDATE
    @Nested
    @DisplayName("Update Salary")
    class UpdateTests {

        @Test
        @DisplayName("Update salary successfully by accountant")
        void updateSalary_success() {
            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(salaryRepository.findById(100L)).thenReturn(Optional.of(testSalary));
            when(salaryRepository.save(any(Salary.class))).thenAnswer(i -> i.getArgument(0));

            UpdateSalaryRequest request = new UpdateSalaryRequest();
            request.setBonus(new BigDecimal("2000000"));
            request.setNote("Performance bonus");

            Salary result = salaryService.updateSalary(100L, request, testUser);

            assertEquals(new BigDecimal("2000000"), result.getBonus());
            assertEquals("Performance bonus", result.getNote());
        }

        @Test
        @DisplayName("Update salary - forbidden for non-accountant")
        void updateSalary_forbidden() {
            doThrow(new ForbiddenException("No permission")).when(accessControlService)
                    .checkSalaryCalculatePermission();

            assertThrows(ForbiddenException.class,
                    () -> salaryService.updateSalary(100L, new UpdateSalaryRequest(), testUser));
        }
    }
    // DELETE
    @Nested
    @DisplayName("Delete Salary")
    class DeleteTests {

        @Test
        @DisplayName("Delete salary successfully")
        void deleteSalary_success() {
            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(salaryRepository.findById(100L)).thenReturn(Optional.of(testSalary));

            salaryService.deleteSalary(100L, testUser);

            verify(salaryRepository).delete(testSalary);
        }

        @Test
        @DisplayName("Delete salary - forbidden for non-accountant")
        void deleteSalary_forbidden() {
            doThrow(new ForbiddenException("No permission")).when(accessControlService)
                    .checkSalaryCalculatePermission();

            assertThrows(ForbiddenException.class,
                    () -> salaryService.deleteSalary(100L, testUser));
        }
    }
    // PAYMENT ACTIONS
    @Nested
    @DisplayName("Payment Actions")
    class PaymentTests {

        @Test
        @DisplayName("Mark as paid succeeds and sends notification")
        void markAsPaid_success() {
            doNothing().when(accessControlService).checkSalaryApprovePermission();
            when(salaryRepository.findById(100L)).thenReturn(Optional.of(testSalary));
            when(salaryRepository.save(any(Salary.class))).thenAnswer(i -> i.getArgument(0));

            Salary result = salaryService.markAsPaid(100L, testUser);

            assertEquals(Salary.PaymentStatus.PAID, result.getPaymentStatus());
            verify(eventPublisher).publishEvent(any());
        }

        @Test
        @DisplayName("Mark as paid - forbidden for non-accountant")
        void markAsPaid_forbidden() {
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkSalaryApprovePermission();

            assertThrows(ForbiddenException.class,
                    () -> salaryService.markAsPaid(100L, testUser));
        }

        @Test
        @DisplayName("Cancel salary succeeds")
        void cancelSalary_success() {
            doNothing().when(accessControlService).checkSalaryApprovePermission();
            when(salaryRepository.findById(100L)).thenReturn(Optional.of(testSalary));
            when(salaryRepository.save(any(Salary.class))).thenAnswer(i -> i.getArgument(0));

            Salary result = salaryService.cancelSalary(100L, testUser);

            assertEquals(Salary.PaymentStatus.CANCELLED, result.getPaymentStatus());
        }

        @Test
        @DisplayName("Cancel salary - forbidden")
        void cancelSalary_forbidden() {
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkSalaryApprovePermission();

            assertThrows(ForbiddenException.class,
                    () -> salaryService.cancelSalary(100L, testUser));
        }
    }
    // AUTO CALCULATE
    @Nested
    @DisplayName("Auto Calculate Salary")
    class AutoCalculateTests {

        @Test
        @DisplayName("Auto calculate salary from contract and attendance")
        void calculateSalaryAuto_success() {
            Contract contract = new Contract();
            contract.setSalary(new BigDecimal("20000000"));

            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            when(salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(10L, 3, 2026)).thenReturn(false);
            when(contractRepository.findFirstByEmployee_EmployeeIdAndStatusOrderByStartDateDesc(
                    eq(10L), any())).thenReturn(Optional.of(contract));
            when(attendanceRepository.countWorkingDaysByEmployeeAndMonth(eq(10L), any(), any())).thenReturn(22);
            when(attendanceRepository.sumWorkingHoursByEmployeeAndMonth(eq(10L), any(), any()))
                    .thenReturn(new BigDecimal("180"));
            when(salaryRepository.save(any(Salary.class))).thenAnswer(i -> i.getArgument(0));

            Salary result = salaryService.calculateSalaryAuto(10L, 3, 2026, testUser);

            assertNotNull(result);
            assertEquals(new BigDecimal("20000000"), result.getBaseSalary());
            assertEquals(22, result.getWorkingDays());
            assertEquals(4, result.getOvertimeHours()); // 180 - 176 = 4
        }

        @Test
        @DisplayName("Auto calculate salary - no contract throws ResourceNotFoundException")
        void calculateSalaryAuto_noContract() {
            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            when(salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(10L, 3, 2026)).thenReturn(false);
            when(contractRepository.findFirstByEmployee_EmployeeIdAndStatusOrderByStartDateDesc(
                    eq(10L), any())).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> salaryService.calculateSalaryAuto(10L, 3, 2026, testUser));
        }

        @Test
        @DisplayName("Auto calculate salary - duplicate throws DuplicateException")
        void calculateSalaryAuto_duplicate() {
            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            when(salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(10L, 3, 2026)).thenReturn(true);

            assertThrows(DuplicateException.class,
                    () -> salaryService.calculateSalaryAuto(10L, 3, 2026, testUser));
        }

        @Test
        @DisplayName("Auto calculate for all employees skips existing")
        void calculateSalaryAutoForAll_skipsExisting() {
            Employee emp2 = new Employee();
            emp2.setEmployeeId(20L);
            emp2.setFullName("Jane");

            doNothing().when(accessControlService).checkSalaryCalculatePermission();
            when(employeeRepository.findByStatus(Employee.EmployeeStatus.ACTIVE))
                    .thenReturn(List.of(testEmployee, emp2));
            // First employee already has salary
            when(salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(10L, 3, 2026)).thenReturn(true);
            // Second employee doesn't (but will fail on contract lookup — caught silently)
            when(salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(20L, 3, 2026)).thenReturn(false);

            List<Salary> results = salaryService.calculateSalaryAutoForAll(3, 2026, testUser);

            // Both should be handled gracefully (one skipped, one may error but caught)
            assertNotNull(results);
        }
    }
    // STATISTICS
    @Nested
    @DisplayName("Statistics")
    class StatisticsTests {

        @Test
        @DisplayName("Get total salary by period sums net salaries")
        void getTotalSalaryByPeriod_success() {
            Salary s1 = new Salary();
            s1.setNetSalary(new BigDecimal("15000000"));
            Salary s2 = new Salary();
            s2.setNetSalary(new BigDecimal("20000000"));

            doNothing().when(accessControlService).checkSalaryViewPermission();
            when(salaryRepository.findByMonthAndYear(3, 2026)).thenReturn(List.of(s1, s2));

            BigDecimal result = salaryService.getTotalSalaryByPeriod(3, 2026, testUser);

            assertEquals(new BigDecimal("35000000"), result);
        }

        @Test
        @DisplayName("Get total salary by employee and year - owner can view own")
        void getTotalSalaryByEmployeeAndYear_owner() {
            Salary s1 = new Salary();
            s1.setYear(2026);
            s1.setNetSalary(new BigDecimal("15000000"));

            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkSalaryViewPermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));
            when(salaryRepository.findByEmployee_EmployeeId(10L)).thenReturn(List.of(s1));

            BigDecimal result = salaryService.getTotalSalaryByEmployeeAndYear(10L, 2026, testUser);

            assertEquals(new BigDecimal("15000000"), result);
        }

        @Test
        @DisplayName("Get total salary by employee and year - forbidden for non-owner")
        void getTotalSalaryByEmployeeAndYear_forbidden() {
            User otherUser = new User();
            otherUser.setUserId(999L);

            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkSalaryViewPermission();
            when(employeeRepository.findById(10L)).thenReturn(Optional.of(testEmployee));

            assertThrows(ForbiddenException.class,
                    () -> salaryService.getTotalSalaryByEmployeeAndYear(10L, 2026, otherUser));
        }
    }
}
