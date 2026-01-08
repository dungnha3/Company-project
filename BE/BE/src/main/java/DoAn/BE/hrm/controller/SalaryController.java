package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.SalaryDTO;
import DoAn.BE.hrm.dto.CreateSalaryRequest;
import DoAn.BE.hrm.dto.UpdateSalaryRequest;
import DoAn.BE.hrm.entity.Salary;
import DoAn.BE.hrm.mapper.SalaryMapper;
import DoAn.BE.hrm.service.SalaryService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

// [Controller managing salaries] (Role: Accounting/HR)
@RestController
@RequestMapping("/api/salaries")
@RequiredArgsConstructor
@Slf4j
public class SalaryController {

    private final SalaryService salaryService;
    private final SalaryMapper salaryMapper;

    // ==================== CRUD ====================

    // [Create salary] (Role: Accounting)
    @PostMapping
    public ResponseEntity<SalaryDTO> createSalary(
            @Valid @RequestBody CreateSalaryRequest request,
            @AuthenticationPrincipal User currentUser) {
        Salary salary = salaryService.createSalary(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(salaryMapper.toDTO(salary));
    }

    // [Get salary by ID] (Role: Accounting/Self)
    @GetMapping("/{id}")
    public ResponseEntity<SalaryDTO> getSalaryById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Salary salary = salaryService.getSalaryById(id, currentUser);
        return ResponseEntity.ok(salaryMapper.toDTO(salary));
    }

    // [Get all salaries] (Role: Accounting)
    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<SalaryDTO>> getAllSalaries(
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Salary> salaries = salaryService.getAllSalariesPaged(currentUser,
                pageable);
        return ResponseEntity.ok(salaries.map(salaryMapper::toDTO));
    }

    // [Update salary] (Role: Accounting)
    @PutMapping("/{id}")
    public ResponseEntity<SalaryDTO> updateSalary(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSalaryRequest request,
            @AuthenticationPrincipal User currentUser) {
        Salary salary = salaryService.updateSalary(id, request, currentUser);
        return ResponseEntity.ok(salaryMapper.toDTO(salary));
    }

    // [Delete salary] (Role: Accounting)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteSalary(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        salaryService.deleteSalary(id, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted salary record successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== QUERIES ====================

    // [Get salaries by employee] (Role: Accounting/Self)
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<org.springframework.data.domain.Page<SalaryDTO>> getSalariesByEmployee(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Salary> salaries = salaryService.getSalariesByEmployeePaged(employeeId,
                currentUser, pageable);
        return ResponseEntity.ok(salaries.map(salaryMapper::toDTO));
    }

    // [Get salaries by period (month/year)] (Role: Accounting)
    @GetMapping("/period")
    public ResponseEntity<org.springframework.data.domain.Page<SalaryDTO>> getSalariesByPeriod(
            @RequestParam Integer month,
            @RequestParam Integer year,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Salary> salaries = salaryService.getSalariesByPeriodPaged(month, year,
                currentUser, pageable);
        return ResponseEntity.ok(salaries.map(salaryMapper::toDTO));
    }

    // [Get salary by employee and period] (Role: Accounting/Self)
    @GetMapping("/employee/{employeeId}/period")
    public ResponseEntity<SalaryDTO> getSalaryByEmployeeAndPeriod(
            @PathVariable Long employeeId,
            @RequestParam Integer month,
            @RequestParam Integer year,
            @AuthenticationPrincipal User currentUser) {
        Salary salary = salaryService.getSalaryByEmployeeAndPeriod(employeeId, month, year, currentUser);
        if (salary == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(salaryMapper.toDTO(salary));
    }

    // [Get salaries by status] (Role: Accounting)
    // [Get salaries by status] (Role: Accounting)
    @GetMapping("/status/{status}")
    public ResponseEntity<org.springframework.data.domain.Page<SalaryDTO>> getSalariesByStatus(
            @PathVariable String status,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        Salary.PaymentStatus paymentStatus;
        try {
            paymentStatus = Salary.PaymentStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DoAn.BE.common.exception.BadRequestException("Invalid payment status: " + status);
        }
        org.springframework.data.domain.Page<Salary> salaries = salaryService.getSalariesByStatusPaged(paymentStatus,
                currentUser, pageable);
        return ResponseEntity.ok(salaries.map(salaryMapper::toDTO));
    }

    // ==================== ACTIONS ====================

    // [Mark as paid] (Role: Accounting)
    @PatchMapping("/{id}/mark-paid")
    public ResponseEntity<SalaryDTO> markAsPaid(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Salary salary = salaryService.markAsPaid(id, currentUser);
        return ResponseEntity.ok(salaryMapper.toDTO(salary));
    }

    // [Cancel salary] (Role: Accounting)
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<SalaryDTO> cancelSalary(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Salary salary = salaryService.cancelSalary(id, currentUser);
        return ResponseEntity.ok(salaryMapper.toDTO(salary));
    }

    // ==================== STATISTICS ====================

    // [Get total salary by period] (Role: Accounting)
    @GetMapping("/statistics/total")
    public ResponseEntity<Map<String, Object>> getTotalSalaryByPeriod(
            @RequestParam Integer month,
            @RequestParam Integer year,
            @AuthenticationPrincipal User currentUser) {
        BigDecimal total = salaryService.getTotalSalaryByPeriod(month, year, currentUser);
        Map<String, Object> response = new HashMap<>();
        response.put("month", month);
        response.put("year", year);
        response.put("totalSalary", total);
        return ResponseEntity.ok(response);
    }
}
