package DoAn.BE.hrm.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.EmployeeRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    private final AccessControlService accessControlService;

    @Transactional(readOnly = true)
    public Employee getEmployeeById(Long id, User currentUser) {
        if (id == null)
            throw new BadRequestException("Invalid Employee ID");

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found"));
        if (accessControlService.hasPermission("hr.viewList")) {
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
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found"));
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
        // ALL companies
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            return Page.empty(pageable);
        }
        return employeeRepository.findByCompanyId(companyId, pageable);
    }

    public Employee createEmployee(EmployeeRequest request, User currentUser) {
        if (request == null || request.getUserId() == null) {
            throw new BadRequestException("Invalid data: userId is required");
        }

        accessControlService.checkHrCreateEmployeePermission();

        // Check if user already has an employee profile (tenant-scoped)
        if (employeeRepository.findByUser_UserId(request.getUserId()).isPresent()) {
            throw new DuplicateException("User already has an employee profile");
        }

        // Validate idCard uniqueness
        if (request.getIdCard() != null && !request.getIdCard().isBlank()
                && employeeRepository.existsByIdCard(request.getIdCard())) {
            throw new DuplicateException("ID Card already exists");
        }

        log.info("HR Manager {} creating employee profile for userId: {}",
                currentUser.getUsername(), request.getUserId());

        Employee employee = new Employee();

        // Link to user — use a proxy reference to avoid extra query
        User userRef = new User();
        userRef.setUserId(request.getUserId());
        employee.setUser(userRef);

        employee.setFullName(request.getFullName());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        employee.setAddress(request.getAddress());
        employee.setHireDate(request.getHireDate());
        employee.setIdCard(request.getIdCard());
        employee.setBaseSalary(request.getBaseSalary() != null ? request.getBaseSalary() : java.math.BigDecimal.ZERO);
        employee.setAllowance(request.getAllowance() != null ? request.getAllowance() : java.math.BigDecimal.ZERO);



        // TenantScopedEntity.prePersistTenant() will auto-set company from
        // TenantContext
        return employeeRepository.save(employee);
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



        return employeeRepository.save(employee);
    }

    // integrity
    public void deleteEmployee(Long id) {
        accessControlService.checkHrDeleteEmployeePermission();
        Employee employee = getEmployeeById(id);
        employee.setStatus(EmployeeStatus.RESIGNED);
        employeeRepository.save(employee);
    }

    @Transactional(readOnly = true)
    public List<Employee> getEmployeesByStatus(EmployeeStatus status) {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null)
            return java.util.Collections.emptyList();
        return employeeRepository.findByStatusAndCompany_CompanyId(status, companyId);
    }

    @Transactional(readOnly = true)
    public Page<Employee> getEmployeesByStatus(EmployeeStatus status, Pageable pageable) {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null)
            return Page.empty(pageable);
        return employeeRepository.findByStatusAndCompany_CompanyId(status, companyId, pageable);
    }



    @Transactional(readOnly = true)
    public List<Employee> searchEmployees(String keyword) {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        List<Employee> results = employeeRepository.searchByKeyword(keyword);
        if (companyId != null) {
            results = results.stream()
                    .filter(e -> e.getCompany() != null && companyId.equals(e.getCompany().getCompanyId()))
                    .toList();
        }
        return results;
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
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId != null) {
            return employeeRepository.findByUser_UserIdAndCompany_CompanyId(userId, companyId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No employee profile found for this User in current company"));
        }
        // Fallback when no tenant context (e.g., system admin operations)
        return employeeRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No employee profile found for this User"));
    }

    public boolean hasEmployeeProfile(Long userId) {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId != null) {
            return employeeRepository.findByUser_UserIdAndCompany_CompanyId(userId, companyId).isPresent();
        }
        return employeeRepository.findByUser_UserId(userId).isPresent();
    }
}
