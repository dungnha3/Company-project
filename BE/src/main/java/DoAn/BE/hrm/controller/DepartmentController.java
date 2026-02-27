package DoAn.BE.hrm.controller;

import DoAn.BE.common.annotation.FeatureFlag;

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

import DoAn.BE.common.service.AccessControlService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@FeatureFlag("HR")
public class DepartmentController {

    private final DepartmentService departmentService;
    private final DepartmentMapper departmentMapper;
    private final AccessControlService accessControlService;
    @PostMapping
    public ResponseEntity<DepartmentDTO> createDepartment(@Valid @RequestBody DepartmentRequest request) {
        accessControlService.checkHrEditPermission();
        Department department = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentMapper.toDTO(department));
    }
    @GetMapping("/{id}")
    public ResponseEntity<DepartmentDTO> getDepartmentById(@PathVariable Long id) {
        accessControlService.checkHrViewPermission();
        Department department = departmentService.getDepartmentById(id);
        return ResponseEntity.ok(departmentMapper.toDTO(department));
    }
    @GetMapping
    public ResponseEntity<List<DepartmentDTO>> getAllDepartments() {
        accessControlService.checkHrViewPermission();
        List<Department> departments = departmentService.getAllDepartments();
        return ResponseEntity.ok(departmentMapper.toDTOList(departments));
    }
    @PutMapping("/{id}")
    public ResponseEntity<DepartmentDTO> updateDepartment(
            @PathVariable Long id,
            @Valid @RequestBody DepartmentRequest request) {
        accessControlService.checkHrEditPermission();
        Department department = departmentService.updateDepartment(id, request);
        return ResponseEntity.ok(departmentMapper.toDTO(department));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteDepartment(@PathVariable Long id) {
        accessControlService.checkHrEditPermission();
        departmentService.deleteDepartment(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted department successfully");
        return ResponseEntity.ok(response);
    }
}