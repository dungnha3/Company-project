package DoAn.BE.hrm.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.dto.DepartmentRequest;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.DepartmentRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
public class DepartmentServiceTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private DepartmentService departmentService;

    private Department testDepartment;
    private Employee testManager;

    @BeforeEach
    void setUp() {
        testManager = new Employee();
        testManager.setEmployeeId(1L);
        testManager.setFullName("John Doe");

        testDepartment = new Department();
        testDepartment.setDepartmentId(10L);
        testDepartment.setName("Engineering");
        testDepartment.setManager(testManager);
    }

    @Test
    void createDepartment_Success() {
        DepartmentRequest req = new DepartmentRequest();
        req.setName("HR");
        req.setManagerId(1L);

        when(departmentRepository.existsByName("HR")).thenReturn(false);
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testManager));
        when(departmentRepository.save(any(Department.class))).thenAnswer(i -> {
            Department d = i.getArgument(0);
            d.setDepartmentId(20L);
            return d;
        });

        Department result = departmentService.createDepartment(req);

        assertNotNull(result);
        assertEquals("HR", result.getName());
        assertEquals(testManager, result.getManager());
        verify(departmentRepository).save(any(Department.class));
    }

    @Test
    void createDepartment_DuplicateName() {
        DepartmentRequest req = new DepartmentRequest();
        req.setName("Engineering");

        when(departmentRepository.existsByName("Engineering")).thenReturn(true);

        assertThrows(DuplicateException.class, () -> departmentService.createDepartment(req));
        verify(departmentRepository, never()).save(any());
    }

    @Test
    void getDepartmentById_Success() {
        when(departmentRepository.findById(10L)).thenReturn(Optional.of(testDepartment));

        Department result = departmentService.getDepartmentById(10L);

        assertNotNull(result);
        assertEquals("Engineering", result.getName());
    }

    @Test
    void getDepartmentById_NotFound() {
        when(departmentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> departmentService.getDepartmentById(99L));
    }

    @Test
    void getAllDepartments_Success() {
        when(departmentRepository.findAll()).thenReturn(List.of(testDepartment));

        List<Department> list = departmentService.getAllDepartments();

        assertEquals(1, list.size());
        assertEquals("Engineering", list.get(0).getName());
    }

    @Test
    void updateDepartment_Success() {
        DepartmentRequest req = new DepartmentRequest();
        req.setName("New Engineering");

        when(departmentRepository.findById(10L)).thenReturn(Optional.of(testDepartment));
        when(departmentRepository.existsByName("New Engineering")).thenReturn(false);
        when(departmentRepository.save(any(Department.class))).thenReturn(testDepartment);

        Department updated = departmentService.updateDepartment(10L, req);
        assertNotNull(updated);

        assertEquals("New Engineering", testDepartment.getName());
        verify(departmentRepository).save(testDepartment);
    }

    @Test
    void deleteDepartment_Success() {
        when(departmentRepository.findById(10L)).thenReturn(Optional.of(testDepartment));

        departmentService.deleteDepartment(10L);

        verify(departmentRepository).delete(testDepartment);
    }
}
