package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.EmployeeRequest;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;
import DoAn.BE.hrm.entity.Position;
import DoAn.BE.hrm.repository.DepartmentRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.PositionRepository;
import DoAn.BE.user.entity.User;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// Unit tests for EmployeeService — HR employee management layer.
// Tests CRUD, access control, and input validation.
// /
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private PositionRepository positionRepository;
    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private EmployeeService employeeService;

    private User testUser;
    private User hrManager;
    private Employee testEmployee;
    private Department testDept;
    private Position testPos;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("employee1");
        testUser.setEmail("emp1@dacn.com");

        hrManager = new User();
        hrManager.setUserId(2L);
        hrManager.setUsername("hr_manager");

        testDept = new Department();
        testDept.setDepartmentId(10L);
        testDept.setName("Engineering");

        testPos = new Position();
        testPos.setPositionId(20L);
        testPos.setName("Developer");

        testEmployee = new Employee();
        testEmployee.setEmployeeId(100L);
        testEmployee.setUser(testUser);
        testEmployee.setFullName("Nguyen Van A");
        testEmployee.setDateOfBirth(LocalDate.of(1995, 1, 15));
        testEmployee.setGender(Employee.Gender.MALE);
        testEmployee.setHireDate(LocalDate.of(2023, 6, 1));
        testEmployee.setStatus(EmployeeStatus.ACTIVE);
        testEmployee.setDepartment(testDept);
        testEmployee.setPosition(testPos);
        testEmployee.setBaseSalary(new BigDecimal("15000000"));
    }
    // GET EMPLOYEE TESTS
    @Nested
    @DisplayName("Get Employee By ID")
    class GetEmployeeTests {

        @Test
        @DisplayName("HR Manager can view any employee profile")
        void getById_asHR_returnsEmployee() {
            when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
            doNothing().when(accessControlService).checkHrViewPermission();

            Employee result = employeeService.getEmployeeById(100L, hrManager);

            assertEquals(100L, result.getEmployeeId());
            assertEquals("Nguyen Van A", result.getFullName());
        }

        @Test
        @DisplayName("Employee can view own profile")
        void getById_asSelf_returnsEmployee() {
            when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrViewPermission();

            Employee result = employeeService.getEmployeeById(100L, testUser);

            assertEquals(100L, result.getEmployeeId());
        }

        @Test
        @DisplayName("Cannot view another employee's profile without HR role")
        void getById_asOtherUser_throwsForbidden() {
            User otherUser = new User();
            otherUser.setUserId(999L);

            when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
            doThrow(new ForbiddenException("No permission")).when(accessControlService).checkHrViewPermission();

            assertThrows(ForbiddenException.class, () -> employeeService.getEmployeeById(100L, otherUser));
        }

        @Test
        @DisplayName("Get non-existent employee throws ResourceNotFound")
        void getById_notFound_throwsResourceNotFound() {
            when(employeeRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> employeeService.getEmployeeById(999L, hrManager));
        }

        @Test
        @DisplayName("Null ID throws BadRequest")
        void getById_nullId_throwsBadRequest() {
            assertThrows(BadRequestException.class, () -> employeeService.getEmployeeById(null, hrManager));
        }
    }
    // UPDATE EMPLOYEE TESTS
    @Nested
    @DisplayName("Update Employee")
    class UpdateEmployeeTests {

        @Test
        @DisplayName("Update employee name and department")
        void update_success() {
            EmployeeRequest request = new EmployeeRequest();
            request.setFullName("Updated Name");
            request.setDepartmentId(10L);

            doNothing().when(accessControlService).checkHrEditPermission();
            when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
            when(departmentRepository.findById(10L)).thenReturn(Optional.of(testDept));
            when(employeeRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            Employee result = employeeService.updateEmployee(100L, request, hrManager);

            assertEquals("Updated Name", result.getFullName());
        }

        @Test
        @DisplayName("Update with duplicate ID card throws DuplicateException")
        void update_duplicateIdCard_throwsDuplicate() {
            EmployeeRequest request = new EmployeeRequest();
            request.setIdCard("NEW_CCCD_12345");

            doNothing().when(accessControlService).checkHrEditPermission();
            when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
            when(employeeRepository.existsByIdCard("NEW_CCCD_12345")).thenReturn(true);

            assertThrows(DuplicateException.class, () -> employeeService.updateEmployee(100L, request, hrManager));
        }
    }
    // DELETE & STATUS TESTS
    @Nested
    @DisplayName("Delete & Status")
    class DeleteStatusTests {

        @Test
        @DisplayName("Delete employee removes it from repository")
        void delete_success() {
            doNothing().when(accessControlService).checkHrEditPermission();
            when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));

            assertDoesNotThrow(() -> employeeService.deleteEmployee(100L));
            verify(employeeRepository).delete(testEmployee);
        }

        @Test
        @DisplayName("Update status changes employee status")
        void updateStatus_success() {
            doNothing().when(accessControlService).checkHrEditPermission();
            when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
            when(employeeRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            Employee result = employeeService.updateStatus(100L, EmployeeStatus.RESIGNED);

            assertEquals(EmployeeStatus.RESIGNED, result.getStatus());
        }
    }
    // LOOKUP TESTS
    @Nested
    @DisplayName("Employee Lookups")
    class LookupTests {

        @Test
        @DisplayName("Get employee by userId returns employee")
        void getByUserId_found() {
            when(employeeRepository.findByUser_UserId(1L)).thenReturn(Optional.of(testEmployee));

            Employee result = employeeService.getEmployeeByUserId(1L);
            assertEquals(100L, result.getEmployeeId());
        }

        @Test
        @DisplayName("Get employee by unknown userId throws ResourceNotFound")
        void getByUserId_notFound() {
            when(employeeRepository.findByUser_UserId(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> employeeService.getEmployeeByUserId(999L));
        }

        @Test
        @DisplayName("hasEmployeeProfile returns true when profile exists")
        void hasProfile_exists() {
            when(employeeRepository.findByUser_UserId(1L)).thenReturn(Optional.of(testEmployee));
            assertTrue(employeeService.hasEmployeeProfile(1L));
        }

        @Test
        @DisplayName("hasEmployeeProfile returns false when no profile")
        void hasProfile_notExists() {
            when(employeeRepository.findByUser_UserId(1L)).thenReturn(Optional.empty());
            assertFalse(employeeService.hasEmployeeProfile(1L));
        }
    }

}
