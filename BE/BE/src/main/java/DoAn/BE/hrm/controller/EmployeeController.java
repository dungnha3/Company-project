package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.EmployeeDTO;
import DoAn.BE.hrm.dto.EmployeeRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;
import DoAn.BE.hrm.mapper.EmployeeMapper;
import DoAn.BE.hrm.service.EmployeeService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// [Controller managing employees] (Role: HR Manager)
// NOTE: Create employee via InviteService.inviteUser() - no manual create endpoint
@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeMapper employeeMapper;

    // ==================== READ ====================

    // [Get employee by ID] (Role: HR/Self)
    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDTO> getEmployeeById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.getEmployeeById(id, currentUser);
        return ResponseEntity.ok(employeeMapper.toDTO(employee, currentUser));
    }

    // [Get all employees (no pagination)] (Role: HR/Accounting)
    @GetMapping
    public ResponseEntity<List<EmployeeDTO>> getAllEmployees(
            @AuthenticationPrincipal User currentUser) {
        List<Employee> employees = employeeService.getAllEmployees(currentUser);
        return ResponseEntity.ok(employeeMapper.toDTOList(employees, currentUser));
    }

    // [Get employees with pagination] (Role: HR/Accounting)
    @GetMapping("/page")
    public ResponseEntity<Page<EmployeeDTO>> getEmployeesPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "fullName") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @AuthenticationPrincipal User currentUser) {

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Employee> employeePage = employeeService.getAllEmployeesPage(pageable);
        Page<EmployeeDTO> dtoPage = employeePage.map(nv -> employeeMapper.toDTO(nv, currentUser));

        return ResponseEntity.ok(dtoPage);
    }

    // ==================== UPDATE ====================

    // [Update employee] (Role: HR Manager)
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeDTO> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeRequest request,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.updateEmployee(id, request, currentUser);
        return ResponseEntity.ok(employeeMapper.toDTO(employee, currentUser));
    }

    // [Delete employee] (Role: HR Manager)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted employee successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== FILTERS ====================

    // [Filter employees by status] (Role: HR/Accounting)
    @GetMapping("/status/{status}")
    public ResponseEntity<List<EmployeeDTO>> getEmployeesByStatus(
            @PathVariable EmployeeStatus status,
            @AuthenticationPrincipal User currentUser) {
        List<Employee> employees = employeeService.getEmployeesByStatus(status);
        return ResponseEntity.ok(employeeMapper.toDTOList(employees, currentUser));
    }

    // [Filter employees by department] (Role: HR/Accounting)
    @GetMapping("/department/{departmentId}")
    public ResponseEntity<List<EmployeeDTO>> getEmployeesByDepartment(
            @PathVariable Long departmentId,
            @AuthenticationPrincipal User currentUser) {
        List<Employee> employees = employeeService.getEmployeesByDepartment(departmentId);
        return ResponseEntity.ok(employeeMapper.toDTOList(employees, currentUser));
    }

    // [Filter employees by position] (Role: HR/Accounting)
    @GetMapping("/position/{positionId}")
    public ResponseEntity<List<EmployeeDTO>> getEmployeesByPosition(
            @PathVariable Long positionId,
            @AuthenticationPrincipal User currentUser) {
        List<Employee> employees = employeeService.getEmployeesByPosition(positionId);
        return ResponseEntity.ok(employeeMapper.toDTOList(employees, currentUser));
    }

    // [Search employees by keyword] (Role: HR/Accounting)
    @GetMapping("/search")
    public ResponseEntity<List<EmployeeDTO>> searchEmployees(
            @RequestParam String keyword,
            @AuthenticationPrincipal User currentUser) {
        List<Employee> employees = employeeService.searchEmployees(keyword);
        return ResponseEntity.ok(employeeMapper.toDTOList(employees, currentUser));
    }

    // ==================== ACTIONS ====================

    // [Update employee status] (Role: HR Manager)
    @PatchMapping("/{id}/status")
    public ResponseEntity<EmployeeDTO> updateStatus(
            @PathVariable Long id,
            @RequestParam EmployeeStatus status,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.updateStatus(id, status);
        return ResponseEntity.ok(employeeMapper.toDTO(employee, currentUser));
    }

    // ==================== USER MAPPING ====================

    // [Get employee by User ID] (Role: HR/Self)
    @GetMapping("/user/{userId}")
    public ResponseEntity<EmployeeDTO> getEmployeeByUserId(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.getEmployeeByUserId(userId);
        return ResponseEntity.ok(employeeMapper.toDTO(employee, currentUser));
    }

    // [Check if User has employee profile] (Role: System)
    @GetMapping("/user/{userId}/exists")
    public ResponseEntity<Map<String, Boolean>> hasEmployeeProfile(@PathVariable Long userId) {
        boolean exists = employeeService.hasEmployeeProfile(userId);
        Map<String, Boolean> response = new HashMap<>();
        response.put("hasEmployee", exists);
        return ResponseEntity.ok(response);
    }
}
