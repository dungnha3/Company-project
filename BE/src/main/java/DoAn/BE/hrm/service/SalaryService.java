package DoAn.BE.hrm.service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;

import DoAn.BE.hrm.dto.CreateSalaryRequest;
import DoAn.BE.hrm.dto.UpdateSalaryRequest;
import DoAn.BE.hrm.entity.Salary;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.SalaryRepository;
import DoAn.BE.hrm.repository.AttendanceRepository;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.notification.service.FCMService;
import DoAn.BE.notification.service.HRNotificationService;
import DoAn.BE.user.entity.User;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class SalaryService {

    private final SalaryRepository salaryRepository;
    private final EmployeeRepository employeeRepository;
    private final ContractRepository contractRepository;
    private final AttendanceRepository attendanceRepository;
    private final HRNotificationService hrNotificationService;
    private final FCMService fcmService;
    private final AccessControlService accessControlService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public SalaryService(SalaryRepository salaryRepository,
            EmployeeRepository employeeRepository,
            ContractRepository contractRepository,
            AttendanceRepository attendanceRepository,
            HRNotificationService hrNotificationService,
            FCMService fcmService,
            AccessControlService accessControlService,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this.salaryRepository = salaryRepository;
        this.employeeRepository = employeeRepository;
        this.contractRepository = contractRepository;
        this.attendanceRepository = attendanceRepository;
        this.hrNotificationService = hrNotificationService;
        this.fcmService = fcmService;
        this.accessControlService = accessControlService;
        this.eventPublisher = eventPublisher;
    }

    public Salary createSalary(CreateSalaryRequest request, User currentUser) {
        accessControlService.checkSalaryCalculatePermission();

        log.info("Accountant {} creating salary for employee ID: {}", currentUser.getUsername(),
                request.getEmployeeId());

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        if (salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(request.getEmployeeId(), request.getMonth(),
                request.getYear())) {
            throw new DuplicateException(
                    "Salary for " + request.getMonth() + "/" + request.getYear() + " already exists");
        }

        Salary salary = new Salary();
        salary.setEmployee(employee);
        salary.setMonth(request.getMonth());
        salary.setYear(request.getYear());
        salary.setBaseSalary(request.getBaseSalary());

        // Default values
        salary.setWorkingDays(request.getWorkingDays() != null ? request.getWorkingDays() : 0);
        salary.setStandardWorkingDays(request.getStandardWorkingDays() != null ? request.getStandardWorkingDays() : 26);
        salary.setAllowance(request.getAllowance() != null ? request.getAllowance() : BigDecimal.ZERO);
        salary.setBonus(request.getBonus() != null ? request.getBonus() : BigDecimal.ZERO);
        salary.setOvertimeHours(request.getOvertimeHours() != null ? request.getOvertimeHours() : 0);
        salary.setOtherDeductions(
                request.getOtherDeductions() != null ? request.getOtherDeductions() : BigDecimal.ZERO);
        salary.setNote(request.getNote());
        salary.setPaymentStatus(Salary.PaymentStatus.UNPAID);

        return salaryRepository.save(salary);
    }

    public Salary getSalaryById(Long id, User currentUser) {
        Salary salary = salaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary record not found"));

        // Users with salaryView permission can see all salary records
        try {
            accessControlService.checkSalaryViewPermission();
            return salary;
        } catch (ForbiddenException ignored) {
            // Fall through to self-view check
        }

        // Otherwise, only allow viewing own salary
        if (salary.getEmployee().getUser() == null ||
                !salary.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You can only view your own salary");
        }

        return salary;
    }

    public Salary getSalaryByEmployeeAndPeriod(Long employeeId, Integer month, Integer year, User currentUser) {
        // Users with salaryView permission can see any employee's salary
        boolean hasViewPermission;
        try {
            accessControlService.checkSalaryViewPermission();
            hasViewPermission = true;
        } catch (ForbiddenException e) {
            hasViewPermission = false;
        }

        if (!hasViewPermission) {
            Employee emp = employeeRepository.findById(employeeId).orElseThrow();
            if (emp.getUser() == null || !emp.getUser().getUserId().equals(currentUser.getUserId())) {
                throw new ForbiddenException("Not allowed to view other's salary");
            }
        }

        if (month != null && year != null) {
            return salaryRepository.findByEmployee_EmployeeIdAndMonthAndYear(employeeId, month, year)
                    .orElse(null);
        }

        throw new BadRequestException("Please provide both month and year");
    }

    private Salary getSalaryById(Long id) {
        return salaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary not found"));
    }

    public org.springframework.data.domain.Page<Salary> getAllSalariesPaged(User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        accessControlService.checkSalaryViewPermission();
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null)
            return org.springframework.data.domain.Page.empty(pageable);
        return salaryRepository.findByCompanyId(companyId, pageable);
    }

    public Salary updateSalary(Long id, UpdateSalaryRequest request, User currentUser) {
        accessControlService.checkSalaryCalculatePermission();

        Salary salary = getSalaryById(id);

        if (request.getMonth() != null)
            salary.setMonth(request.getMonth());
        if (request.getYear() != null)
            salary.setYear(request.getYear());
        if (request.getBaseSalary() != null)
            salary.setBaseSalary(request.getBaseSalary());
        if (request.getWorkingDays() != null)
            salary.setWorkingDays(request.getWorkingDays());
        if (request.getStandardWorkingDays() != null)
            salary.setStandardWorkingDays(request.getStandardWorkingDays());
        if (request.getAllowance() != null)
            salary.setAllowance(request.getAllowance());
        if (request.getBonus() != null)
            salary.setBonus(request.getBonus());
        if (request.getOvertimeHours() != null)
            salary.setOvertimeHours(request.getOvertimeHours());
        if (request.getOtherDeductions() != null)
            salary.setOtherDeductions(request.getOtherDeductions());
        if (request.getPaymentStatus() != null)
            salary.setPaymentStatus(request.getPaymentStatus());
        if (request.getNote() != null)
            salary.setNote(request.getNote());

        return salaryRepository.save(salary);
    }

    public void deleteSalary(Long id, User currentUser) {
        accessControlService.checkSalaryCalculatePermission();

        Salary salary = getSalaryById(id);
        salaryRepository.delete(salary);
    }

    public org.springframework.data.domain.Page<Salary> getSalariesByEmployeePaged(Long employeeId, User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        // Users with salaryView permission can see any employee's salary
        try {
            accessControlService.checkSalaryViewPermission();
            return salaryRepository.findByEmployee_EmployeeId(employeeId, pageable);
        } catch (ForbiddenException ignored) {
            // Fall through to self-view check
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        if (employee.getUser() == null || !employee.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You can only view your own salary history");
        }

        return salaryRepository.findByEmployee_EmployeeId(employeeId, pageable);
    }

    private List<Salary> getSalariesByPeriod(Integer month, Integer year, User currentUser) {
        accessControlService.checkSalaryViewPermission();
        return salaryRepository.findByMonthAndYear(month, year);
    }

    public org.springframework.data.domain.Page<Salary> getSalariesByPeriodPaged(Integer month, Integer year,
            User currentUser, org.springframework.data.domain.Pageable pageable) {
        accessControlService.checkSalaryViewPermission();
        return salaryRepository.findByMonthAndYear(month, year, pageable);
    }

    public Salary markAsPaid(Long id, User currentUser) {
        accessControlService.checkSalaryApprovePermission();

        Salary salary = getSalaryById(id);
        salary.setPaymentStatus(Salary.PaymentStatus.PAID);
        Salary saved = salaryRepository.save(salary);

        sendPaymentNotification(saved);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.SALARY_PAID,
                saved, currentUser.getUserId(), "Salary Paid: " + saved.getMonth() + "/" + saved.getYear()));

        return saved;
    }

    private void sendPaymentNotification(Salary salary) {
        try {
            User employeeUser = salary.getEmployee().getUser();
            if (employeeUser != null) {
                String amount = salary.getNetSalary() != null
                        ? String.format("%,.0f", salary.getNetSalary())
                        : "0";

                hrNotificationService.createSalaryPaidNotification(
                        employeeUser.getUserId(),
                        String.valueOf(salary.getMonth()),
                        String.valueOf(salary.getYear()),
                        amount);

                if (employeeUser.getFcmToken() != null) {
                    Map<String, String> data = new HashMap<>();
                    data.put("type", "SALARY_PAID");
                    data.put("link", "/payroll");
                    fcmService.sendToDevice(
                            employeeUser.getFcmToken(),
                            "💰 Salary Paid",
                            "Salary for " + salary.getMonth() + "/" + salary.getYear() + " (" + amount
                                    + " VNĐ) has been transferred.",
                            data);
                }
            }
        } catch (Exception e) {
            log.warn("Error sending salary payment notification: {}", e.getMessage());
        }
    }

    public Salary cancelSalary(Long id, User currentUser) {
        accessControlService.checkSalaryApprovePermission();

        Salary salary = getSalaryById(id);
        salary.setPaymentStatus(Salary.PaymentStatus.CANCELLED);
        return salaryRepository.save(salary);
    }

    public org.springframework.data.domain.Page<Salary> getSalariesByStatusPaged(Salary.PaymentStatus status,
            User currentUser, org.springframework.data.domain.Pageable pageable) {
        accessControlService.checkSalaryViewPermission();
        return salaryRepository.findByPaymentStatus(status, pageable);
    }

    public BigDecimal getTotalSalaryByPeriod(Integer month, Integer year, User currentUser) {
        accessControlService.checkSalaryViewPermission();
        List<Salary> list = getSalariesByPeriod(month, year, currentUser);
        return list.stream().map(Salary::getNetSalary).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getTotalSalaryByEmployeeAndYear(Long employeeId, Integer year, User currentUser) {
        boolean hasViewPermission;
        try {
            accessControlService.checkSalaryViewPermission();
            hasViewPermission = true;
        } catch (ForbiddenException e) {
            hasViewPermission = false;
        }

        if (!hasViewPermission) {
            Employee emp = employeeRepository.findById(employeeId).orElseThrow();
            if (emp.getUser() == null || !emp.getUser().getUserId().equals(currentUser.getUserId())) {
                throw new ForbiddenException("Access Denied");
            }
        }

        List<Salary> all = salaryRepository.findByEmployee_EmployeeId(employeeId);
        return all.stream()
                .filter(sl -> sl.getYear().equals(year))
                .map(Salary::getNetSalary)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Salary calculateSalaryAuto(Long employeeId, Integer month, Integer year, User currentUser) {
        accessControlService.checkSalaryCalculatePermission();

        log.info("Accountant {} auto-calculating salary for employee ID: {}", currentUser.getUsername(),
                employeeId);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        if (salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(employeeId, month, year)) {
            throw new DuplicateException("Salary for this period already exists");
        }

        Contract contract = contractRepository
                .findFirstByEmployee_EmployeeIdAndStatusOrderByStartDateDesc(employeeId, ContractStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Employee does not have an active contract"));

        // Get attendance data
        YearMonth yearMonth = YearMonth.of(year, month);
        int workingDays = attendanceRepository.countWorkingDaysByEmployeeAndMonth(employeeId, yearMonth.atDay(1),
                yearMonth.atEndOfMonth());
        BigDecimal totalHours = attendanceRepository.sumWorkingHoursByEmployeeAndMonth(employeeId, yearMonth.atDay(1),
                yearMonth.atEndOfMonth());

        Salary salary = new Salary();
        salary.setEmployee(employee);
        salary.setMonth(month);
        salary.setYear(year);
        salary.setBaseSalary(contract.getSalary());
        salary.setWorkingDays(workingDays);
        salary.setStandardWorkingDays(26);
        salary.setAllowance(employee.getAllowance() != null ? employee.getAllowance() : BigDecimal.ZERO);
        salary.setPaymentStatus(Salary.PaymentStatus.UNPAID);

        // Calculate OT (> 176h)
        BigDecimal standardHours = new BigDecimal("176");
        if (totalHours != null && totalHours.compareTo(standardHours) > 0) {
            salary.setOvertimeHours(totalHours.subtract(standardHours).intValue());
        } else {
            salary.setOvertimeHours(0);
        }

        Salary saved = salaryRepository.save(salary);

        sendSalaryCreatedNotification(employee, saved);

        return saved;
    }

    private void sendSalaryCreatedNotification(Employee employee, Salary salary) {
        try {
            User user = employee.getUser();
            if (user != null) {
                hrNotificationService.createSalaryNotification(user.getUserId(), String.valueOf(salary.getMonth()),
                        String.valueOf(salary.getYear()));
            }
        } catch (Exception e) {
            log.warn("Error sending salary created notification: {}", e.getMessage());
        }
    }

    public List<Salary> calculateSalaryAutoForAll(Integer month, Integer year, User currentUser) {
        accessControlService.checkSalaryCalculatePermission();

        List<Employee> employees = employeeRepository.findByStatus(Employee.EmployeeStatus.ACTIVE);
        List<Salary> results = new ArrayList<>();

        for (Employee emp : employees) {
            try {
                if (!salaryRepository.existsByEmployee_EmployeeIdAndMonthAndYear(emp.getEmployeeId(), month, year)) {
                    results.add(calculateSalaryAuto(emp.getEmployeeId(), month, year, currentUser));
                }
            } catch (Exception e) {
                log.error("Could not calculate salary for employee {}: {}", emp.getFullName(), e.getMessage());
            }
        }
        return results;
    }
}
