package DoAn.BE.hrm.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.EmployeeRequest;
import DoAn.BE.hrm.entity.Position;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.repository.PositionRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.DepartmentRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final AccessControlService accessControlService;

    // [DEPRECATED - Use InviteService instead]
    @Deprecated
    public Employee createEmployee(EmployeeRequest request, User currentUser) {
        if (request == null) {
            throw new BadRequestException("Request cannot be empty");
        }

        accessControlService.checkHrEditPermission();

        log.info("HR Manager {} is creating new employee profile", currentUser.getUsername());

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("User account not found"));

        if (employeeRepository.findByUser_UserId(request.getUserId()).isPresent()) {
            throw new DuplicateException("This account is already linked to another employee profile");
        }

        if (request.getIdCard() != null && employeeRepository.existsByIdCard(request.getIdCard())) {
            throw new DuplicateException("ID Card already exists in the system");
        }

        Employee employee = new Employee();
        employee.setUser(user);
        employee.setFullName(request.getFullName());
        employee.setIdCard(request.getIdCard());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        employee.setAddress(request.getAddress());
        employee.setHireDate(request.getHireDate());
        employee.setStatus(EmployeeStatus.ACTIVE);
        employee.setBaseSalary(request.getBaseSalary());
        employee.setAllowance(request.getAllowance());

        if (request.getDepartmentId() != null) {
            Department department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new EntityNotFoundException("Department not found"));
            employee.setDepartment(department);
        }

        if (request.getPositionId() != null) {
            Position position = positionRepository.findById(request.getPositionId())
                    .orElseThrow(() -> new EntityNotFoundException("Position not found"));
            employee.setPosition(position);
        }

        return employeeRepository.save(employee);
    }

    @Transactional(readOnly = true)
    public Employee getEmployeeById(Long id, User currentUser) {
        if (id == null)
            throw new BadRequestException("Invalid Employee ID");

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Employee profile not found"));

        if (accessControlService.isHRManager() || accessControlService.isAccountingManager()) {
            return employee;
        }

        if (employee.getUser() == null || !employee.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You do not have permission to view this profile");
        }

        return employee;
    }

    @Transactional(readOnly = true)
    public Employee getEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Employee profile not found"));
    }

    @Transactional(readOnly = true)
    public List<Employee> getAllEmployees(User currentUser) {
        accessControlService.checkHrViewPermission();

        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            return java.util.Collections.emptyList();
        }
        return employeeRepository.findByCompanyId(companyId);
    }

    @Transactional(readOnly = true)
    public List<Employee> getAllEmployees() {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            return java.util.Collections.emptyList();
        }
        return employeeRepository.findByCompanyId(companyId);
    }

    @Transactional(readOnly = true)
    public Page<Employee> getAllEmployeesPage(Pageable pageable) {
        accessControlService.checkHrViewPermission();
        return employeeRepository.findAll(pageable);
    }

    public Employee updateEmployee(Long id, EmployeeRequest request, User currentUser) {
        if (id == null || request == null)
            throw new BadRequestException("Invalid data");

        accessControlService.checkHrEditPermission();

        log.info("HR Manager {} updating employee ID: {}", currentUser.getUsername(), id);

        Employee employee = getEmployeeById(id);

        if (request.getFullName() != null)
            employee.setFullName(request.getFullName());
        if (request.getDateOfBirth() != null)
            employee.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null)
            employee.setGender(request.getGender());
        if (request.getAddress() != null)
            employee.setAddress(request.getAddress());
        if (request.getHireDate() != null)
            employee.setHireDate(request.getHireDate());
        if (request.getBaseSalary() != null)
            employee.setBaseSalary(request.getBaseSalary());
        if (request.getAllowance() != null)
            employee.setAllowance(request.getAllowance());

        if (request.getIdCard() != null && !request.getIdCard().equals(employee.getIdCard())) {
            if (employeeRepository.existsByIdCard(request.getIdCard())) {
                throw new DuplicateException("New ID Card already exists");
            }
            employee.setIdCard(request.getIdCard());
        }

        if (request.getDepartmentId() != null) {
            Department department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new EntityNotFoundException("Department not found"));
            employee.setDepartment(department);
        }

        if (request.getPositionId() != null) {
            Position position = positionRepository.findById(request.getPositionId())
                    .orElseThrow(() -> new EntityNotFoundException("Position not found"));
            employee.setPosition(position);
        }

        return employeeRepository.save(employee);
    }

    public void deleteEmployee(Long id) {
        accessControlService.checkHrEditPermission();
        Employee employee = getEmployeeById(id);
        employeeRepository.delete(employee);
    }

    @Transactional(readOnly = true)
    public List<Employee> getEmployeesByStatus(EmployeeStatus status) {
        return employeeRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public Page<Employee> getEmployeesByStatus(EmployeeStatus status, Pageable pageable) {
        return employeeRepository.findByStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public List<Employee> getEmployeesByDepartment(Long departmentId) {
        return employeeRepository.findByDepartment_DepartmentId(departmentId);
    }

    @Transactional(readOnly = true)
    public Page<Employee> getEmployeesByDepartment(Long departmentId, Pageable pageable) {
        return employeeRepository.findByDepartment_DepartmentId(departmentId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Employee> getEmployeesByPosition(Long positionId) {
        return employeeRepository.findByPosition_PositionId(positionId);
    }

    @Transactional(readOnly = true)
    public Page<Employee> getEmployeesByPosition(Long positionId, Pageable pageable) {
        return employeeRepository.findByPosition_PositionId(positionId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Employee> searchEmployees(String keyword) {
        return employeeRepository.searchByKeyword(keyword);
    }

    @Transactional(readOnly = true)
    public Page<Employee> searchEmployees(String keyword, Pageable pageable) {
        return employeeRepository.searchByKeyword(keyword, pageable);
    }

    public Employee updateStatus(Long id, EmployeeStatus status) {
        accessControlService.checkHrEditPermission();
        Employee employee = getEmployeeById(id);
        employee.setStatus(status);
        return employeeRepository.save(employee);
    }

    public Employee getEmployeeByUserId(Long userId) {
        return employeeRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("No employee profile found for this User"));
    }

    public boolean hasEmployeeProfile(Long userId) {
        return employeeRepository.findByUser_UserId(userId).isPresent();
    }
}
