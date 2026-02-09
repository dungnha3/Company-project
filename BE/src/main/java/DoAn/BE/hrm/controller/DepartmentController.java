package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.DepartmentDTO;
import DoAn.BE.hrm.dto.DepartmentRequest;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.mapper.DepartmentMapper;
import DoAn.BE.hrm.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// [Controller managing departments] (Role: HR Manager)
@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;
    private final DepartmentMapper departmentMapper;

    // [Create new department] (Role: HR Manager)
    @PostMapping
    public ResponseEntity<DepartmentDTO> createDepartment(@Valid @RequestBody DepartmentRequest request) {
        Department department = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentMapper.toDTO(department));
    }

    // [Get department by ID] (Role: All)
    @GetMapping("/{id}")
    public ResponseEntity<DepartmentDTO> getDepartmentById(@PathVariable Long id) {
        Department department = departmentService.getDepartmentById(id);
        return ResponseEntity.ok(departmentMapper.toDTO(department));
    }

    // [Get all departments] (Role: All)
    @GetMapping
    public ResponseEntity<List<DepartmentDTO>> getAllDepartments() {
        List<Department> departments = departmentService.getAllDepartments();
        return ResponseEntity.ok(departmentMapper.toDTOList(departments));
    }

    // [Update department] (Role: HR Manager)
    @PutMapping("/{id}")
    public ResponseEntity<DepartmentDTO> updateDepartment(
            @PathVariable Long id,
            @Valid @RequestBody DepartmentRequest request) {
        Department department = departmentService.updateDepartment(id, request);
        return ResponseEntity.ok(departmentMapper.toDTO(department));
    }

    // [Delete department] (Role: HR Manager)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteDepartment(@PathVariable Long id) {
        departmentService.deleteDepartment(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted department successfully");
        return ResponseEntity.ok(response);
    }
}
