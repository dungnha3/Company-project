package DoAn.BE.hrm.service;

import java.util.List;

import jakarta.persistence.EntityManager;
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
    private final EntityManager entityManager;

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
    public Page<Employee> getAllEmployeesPage(String keyword, EmployeeStatus status, Pageable pageable) {
        accessControlService.checkHrViewPermission();
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            return Page.empty(pageable);
        }

        String keywordParam = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        String statusParam = status != null ? status.name() : null;

        String whereClause = "WHERE e.company_id = :companyId";
        if (statusParam != null) {
            whereClause += " AND e.status = :status";
        }
        if (keywordParam != null) {
            whereClause += " AND LOWER(e.full_name) LIKE :keyword";
        }

        String baseSql = "SELECT e.employee_id, e.created_at, e.updated_at, e.user_id, e.company_id, " +
            "e.company_member_id, e.full_name, e.id_card, e.date_of_birth, e.gender, " +
            "e.address, e.phone, e.hire_date, e.status, e.base_salary, e.allowance, e.leave_balance, " +
            "u.email AS user_email, u.avatar_data AS user_avatar " +
            "FROM employees e " +
            "LEFT JOIN users u ON e.user_id = u.user_id " +
            whereClause + " ORDER BY e.full_name";

        jakarta.persistence.Query nativeQuery = entityManager.createNativeQuery(baseSql);
        nativeQuery.setParameter("companyId", companyId);
        if (statusParam != null) nativeQuery.setParameter("status", statusParam);
        if (keywordParam != null) nativeQuery.setParameter("keyword", "%" + keywordParam.toLowerCase() + "%");

        String countSql = "SELECT COUNT(*) FROM employees e " + whereClause;
        jakarta.persistence.Query countQuery = entityManager.createNativeQuery(countSql);
        countQuery.setParameter("companyId", companyId);
        if (statusParam != null) countQuery.setParameter("status", statusParam);
        if (keywordParam != null) countQuery.setParameter("keyword", "%" + keywordParam.toLowerCase() + "%");
        long total = ((Number) countQuery.getSingleResult()).longValue();

        int pageSize = pageable.getPageSize();
        int firstResult = (int) pageable.getOffset();
        nativeQuery.setFirstResult(firstResult);
        nativeQuery.setMaxResults(pageSize);

        @SuppressWarnings("unchecked")
        List<Object[]> results = nativeQuery.getResultList();
        List<Employee> employees = results.stream().map(this::mapRowToEmployee).toList();

        return new org.springframework.data.domain.PageImpl<>(employees, pageable, total);
    }

    private Employee mapRowToEmployee(Object[] row) {
        Employee emp = new Employee();
        emp.setEmployeeId(toLong(row[0]));
        emp.setCreatedAt(toLocalDateTime(row[1]));
        emp.setUpdatedAt(toLocalDateTime(row[2]));
        emp.setUser(userProxy(toLong(row[3])));
        emp.setCompany(companyProxy(toLong(row[4])));
        emp.setFullName((String) row[6]);
        emp.setIdCard((String) row[7]);
        emp.setDateOfBirth(toLocalDate(row[8]));
        try { emp.setGender(row[9] != null ? DoAn.BE.hrm.entity.Employee.Gender.valueOf((String) row[9]) : null); } catch (Exception e) { /* ignore */ }
        emp.setAddress((String) row[10]);
        emp.setPhone((String) row[11]);
        emp.setHireDate(toLocalDate(row[12]));
        try { emp.setStatus(row[13] != null ? DoAn.BE.hrm.entity.Employee.EmployeeStatus.valueOf((String) row[13]) : null); } catch (Exception e) { /* ignore */ }
        emp.setBaseSalary(row[14] != null ? new java.math.BigDecimal(row[14].toString()) : null);
        emp.setAllowance(row[15] != null ? new java.math.BigDecimal(row[15].toString()) : null);
        emp.setLeaveBalance(row[16] != null ? toInt(row[16]) : null);
        // row[17] = user_email, row[18] = user_avatar
        if (row.length > 17) {
            DoAn.BE.user.entity.User u = userProxy(toLong(row[3]));
            u.setEmail((String) row[17]);
            u.setAvatarUrl((String) row[18]);
            emp.setUser(u);
        }
        return emp;
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        return Long.parseLong(val.toString());
    }

    private Integer toInt(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).intValue();
        return Integer.parseInt(val.toString());
    }

    private java.time.LocalDateTime toLocalDateTime(Object val) {
        if (val == null) return null;
        if (val instanceof java.time.LocalDateTime) return (java.time.LocalDateTime) val;
        if (val instanceof java.sql.Timestamp) return ((java.sql.Timestamp) val).toLocalDateTime();
        return java.time.LocalDateTime.parse(val.toString());
    }

    private java.time.LocalDate toLocalDate(Object val) {
        if (val == null) return null;
        if (val instanceof java.time.LocalDate) return (java.time.LocalDate) val;
        if (val instanceof java.sql.Date) return ((java.sql.Date) val).toLocalDate();
        return java.time.LocalDate.parse(val.toString());
    }

    private DoAn.BE.user.entity.User userProxy(Long id) {
        if (id == null) return null;
        DoAn.BE.user.entity.User u = new DoAn.BE.user.entity.User();
        u.setUserId(id);
        return u;
    }

    private DoAn.BE.company.entity.Company companyProxy(Long id) {
        if (id == null) return null;
        DoAn.BE.company.entity.Company c = new DoAn.BE.company.entity.Company();
        c.setCompanyId(id);
        return c;
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
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            return Page.empty(pageable);
        }
        return employeeRepository.searchByKeyword(keyword, companyId, pageable);
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
