package DoAn.BE.hrm.service;

import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.hrm.dto.DepartmentRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.DepartmentRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

@Service
@Transactional
@Slf4j
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    public DepartmentService(DepartmentRepository departmentRepository, EmployeeRepository employeeRepository) {
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
    }

    public long countEmployeesByDepartment(Long departmentId) {
        // Since I haven't added `countNhanVienByPhongBan` to DepartmentRepository yet
        // (it was likely custom or derived).
        // Standard JPA countBy...
        return employeeRepository.countByDepartment_DepartmentId(departmentId);
    }

    public Department createDepartment(DepartmentRequest request) {
        if (departmentRepository.existsByName(request.getName())) {
            throw new DuplicateException("Department already exists");
        }

        Department department = new Department();
        department.setName(request.getName());
        department.setDescription(request.getDescription());

        if (request.getManagerId() != null) {
            Employee manager = employeeRepository.findById(request.getManagerId())
                    .orElseThrow(() -> new EntityNotFoundException("Manager employee not found"));
            department.setManager(manager);
        }

        return departmentRepository.save(department);
    }

    @Cacheable(value = "department", key = "#id")
    public Department getDepartmentById(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Department not found"));
    }

    @Cacheable(value = "department", key = "'all'")
    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    @CacheEvict(value = "department", allEntries = true)
    public Department updateDepartment(Long id, DepartmentRequest request) {
        Department department = getDepartmentById(id);

        if (request.getName() != null && !request.getName().equals(department.getName())) {
            if (departmentRepository.existsByName(request.getName())) {
                throw new DuplicateException("Department name already exists");
            }
            department.setName(request.getName());
        }

        if (request.getDescription() != null) {
            department.setDescription(request.getDescription());
        }

        if (request.getManagerId() != null) {
            Employee manager = employeeRepository.findById(request.getManagerId())
                    .orElseThrow(() -> new EntityNotFoundException("Manager employee not found"));
            department.setManager(manager);
        }

        return departmentRepository.save(department);
    }

    @CacheEvict(value = "department", allEntries = true)
    public void deleteDepartment(Long id) {
        Department department = getDepartmentById(id);
        departmentRepository.delete(department);
    }
}
