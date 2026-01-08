package DoAn.BE.hrm.controller;

import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.ContractDTO;
import DoAn.BE.hrm.dto.ContractRequest;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.mapper.ContractMapper;
import DoAn.BE.hrm.service.ContractService;
import DoAn.BE.hrm.service.EmployeeService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// [Controller managing contracts] (Role: HR Manager)
@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;
    private final ContractMapper contractMapper;
    private final EmployeeService employeeService;
    private final AccessControlService accessControlService;

    // [Check contract access permission] (Role: Internal)
    private void validateContractAccess(Long employeeId, User currentUser) {
        if (accessControlService.isHRManager() || accessControlService.isOwnerOrAdmin()) {
            return;
        }
        Employee employee = employeeService.getEmployeeByUserId(currentUser.getUserId());
        if (employee == null || !employee.getEmployeeId().equals(employeeId)) {
            throw new ForbiddenException("You do not have permission to view contracts of other employees");
        }
    }

    // ==================== CRUD ====================

    // [Create contract] (Role: HR Manager)
    @PostMapping
    public ResponseEntity<ContractDTO> createContract(
            @Valid @RequestBody ContractRequest request,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.createContract(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(contractMapper.toDTO(contract, currentUser));
    }

    // [Get contract by ID] (Role: HR/Self)
    @GetMapping("/{id}")
    public ResponseEntity<ContractDTO> getContractById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.getContractById(id);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }

    // [Get all contracts] (Role: HR Manager)
    @GetMapping
    public ResponseEntity<List<ContractDTO>> getAllContracts(@AuthenticationPrincipal User currentUser) {
        List<Contract> contracts = contractService.getAllContracts();
        return ResponseEntity.ok(contractMapper.toDTOList(contracts, currentUser));
    }

    // [Update contract] (Role: HR Manager)
    @PutMapping("/{id}")
    public ResponseEntity<ContractDTO> updateContract(
            @PathVariable Long id,
            @Valid @RequestBody ContractRequest request,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.updateContract(id, request);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }

    // [Delete contract] (Role: HR Manager)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteContract(@PathVariable Long id) {
        contractService.deleteContract(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted contract successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== QUERIES ====================

    // [Get contracts by employee] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<ContractDTO>> getContractsByEmployee(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser) {
        validateContractAccess(employeeId, currentUser);
        List<Contract> contracts = contractService.getContractsByEmployee(employeeId);
        return ResponseEntity.ok(contractMapper.toDTOList(contracts, currentUser));
    }

    // [Get active contract of employee] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}/active")
    public ResponseEntity<ContractDTO> getActiveContract(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser) {
        validateContractAccess(employeeId, currentUser);
        Contract contract = contractService.getActiveContract(employeeId);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }

    // [Get contracts by status] (Role: HR Manager)
    @GetMapping("/status/{status}")
    public ResponseEntity<List<ContractDTO>> getContractsByStatus(
            @PathVariable ContractStatus status,
            @AuthenticationPrincipal User currentUser) {
        List<Contract> contracts = contractService.getContractsByStatus(status);
        return ResponseEntity.ok(contractMapper.toDTOList(contracts, currentUser));
    }

    // [Get expiring contracts] (Role: HR Manager)
    @GetMapping("/expiring")
    public ResponseEntity<List<ContractDTO>> getExpiringContracts(
            @RequestParam(defaultValue = "30") int daysAhead,
            @AuthenticationPrincipal User currentUser) {
        List<Contract> contracts = contractService.getExpiringContracts(daysAhead);
        return ResponseEntity.ok(contractMapper.toDTOList(contracts, currentUser));
    }

    // ==================== ACTIONS ====================

    // [Cancel contract] (Role: HR Manager)
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ContractDTO> cancelContract(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.cancelContract(id);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }

    // [Renew contract] (Role: HR Manager)
    @PatchMapping("/{id}/renew")
    public ResponseEntity<ContractDTO> renewContract(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newEndDate,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.renewContract(id, newEndDate);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }

    // [Update expired contracts (batch job)] (Role: System)
    @PostMapping("/update-expired")
    public ResponseEntity<Map<String, Object>> updateExpiredContracts() {
        int count = contractService.updateExpiredContracts();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Updated expired contracts successfully");
        response.put("updatedCount", count);
        return ResponseEntity.ok(response);
    }

    // ==================== CHECKS ====================

    // [Check if employee has active contract] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}/has-active")
    public ResponseEntity<Map<String, Object>> hasActiveContract(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser) {
        validateContractAccess(employeeId, currentUser);
        boolean hasActive = contractService.hasActiveContract(employeeId);
        Map<String, Object> response = new HashMap<>();
        response.put("employeeId", employeeId);
        response.put("hasActiveContract", hasActive);
        return ResponseEntity.ok(response);
    }
}
