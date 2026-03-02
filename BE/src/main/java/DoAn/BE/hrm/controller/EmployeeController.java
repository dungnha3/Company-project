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

import DoAn.BE.common.annotation.FeatureFlag;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@FeatureFlag("HR")
@Transactional(readOnly = true)
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeMapper employeeMapper;
    private final DoAn.BE.common.service.AccessControlService accessControlService;

    @Transactional
    @PostMapping
    public ResponseEntity<EmployeeDTO> createEmployee(
            @Valid @RequestBody EmployeeRequest request,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.createEmployee(request, currentUser);
        return ResponseEntity.status(201).body(employeeMapper.toDTO(employee, currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDTO> getEmployeeById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.getEmployeeById(id, currentUser);
        return ResponseEntity.ok(employeeMapper.toDTO(employee, currentUser));
    }

    @GetMapping
    public ResponseEntity<List<EmployeeDTO>> getAllEmployees(
            @AuthenticationPrincipal User currentUser) {
        List<Employee> employees = employeeService.getAllEmployees(currentUser);
        return ResponseEntity.ok(employeeMapper.toDTOList(employees, currentUser));
    }

    @GetMapping("/page")
    public ResponseEntity<Page<EmployeeDTO>> getEmployeesPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "fullName") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @AuthenticationPrincipal User currentUser) {

        // Validate pagination params
        if (page < 0)
            page = 0;
        if (size < 1)
            size = 10;

        // Validate sortBy field (whitelist valid fields)
        java.util.Set<String> validSortFields = java.util.Set.of(
                "fullName", "email", "phoneNumber", "startDate", "status",
                "employeeId", "dateOfBirth");
        if (!validSortFields.contains(sortBy)) {
            sortBy = "fullName";
        }

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Employee> employeePage = employeeService.getAllEmployeesPage(pageable);
        Page<EmployeeDTO> dtoPage = employeePage.map(nv -> employeeMapper.toDTO(nv, currentUser));

        return ResponseEntity.ok(dtoPage);
    }

    @Transactional
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeDTO> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeRequest request,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.updateEmployee(id, request, currentUser);
        return ResponseEntity.ok(employeeMapper.toDTO(employee, currentUser));
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteEmployee(@PathVariable Long id) {
        accessControlService.checkHrDeleteEmployeePermission();
        employeeService.deleteEmployee(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted employee successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<Page<EmployeeDTO>> getEmployeesByStatus(
            @PathVariable EmployeeStatus status,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<Employee> employeePage = employeeService.getEmployeesByStatus(status, pageable);
        return ResponseEntity.ok(employeePage.map(nv -> employeeMapper.toDTO(nv, currentUser)));
    }

    @GetMapping("/department/{departmentId}")
    public ResponseEntity<Page<EmployeeDTO>> getEmployeesByDepartment(
            @PathVariable Long departmentId,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<Employee> employeePage = employeeService.getEmployeesByDepartment(departmentId, pageable);
        return ResponseEntity.ok(employeePage.map(nv -> employeeMapper.toDTO(nv, currentUser)));
    }

    @GetMapping("/position/{positionId}")
    public ResponseEntity<Page<EmployeeDTO>> getEmployeesByPosition(
            @PathVariable Long positionId,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<Employee> employeePage = employeeService.getEmployeesByPosition(positionId, pageable);
        return ResponseEntity.ok(employeePage.map(nv -> employeeMapper.toDTO(nv, currentUser)));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<EmployeeDTO>> searchEmployees(
            @RequestParam String keyword,
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<Employee> employeePage = employeeService.searchEmployees(keyword, pageable);
        return ResponseEntity.ok(employeePage.map(nv -> employeeMapper.toDTO(nv, currentUser)));
    }

    @Transactional
    @PatchMapping("/{id}/status")
    public ResponseEntity<EmployeeDTO> updateStatus(
            @PathVariable Long id,
            @RequestParam EmployeeStatus status,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.updateStatus(id, status);
        return ResponseEntity.ok(employeeMapper.toDTO(employee, currentUser));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<EmployeeDTO> getEmployeeByUserId(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        Employee employee = employeeService.getEmployeeByUserId(userId);
        return ResponseEntity.ok(employeeMapper.toDTO(employee, currentUser));
    }

    @GetMapping("/user/{userId}/exists")
    public ResponseEntity<Map<String, Boolean>> hasEmployeeProfile(@PathVariable Long userId) {
        boolean exists = employeeService.hasEmployeeProfile(userId);
        Map<String, Boolean> response = new HashMap<>();
        response.put("hasEmployee", exists);
        return ResponseEntity.ok(response);
    }
}
