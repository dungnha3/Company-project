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

import DoAn.BE.common.annotation.FeatureFlag;
@RestController
@RequestMapping("/api/contracts")
@FeatureFlag("CONTRACT")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;
    private final ContractMapper contractMapper;
    private final EmployeeService employeeService;
    private final AccessControlService accessControlService;
    private void validateContractAccess(Long employeeId, User currentUser) {
        try {
            accessControlService.checkHrViewPermission();
            return;
        } catch (ForbiddenException ignored) {
            // Fall through to self-view check
        }
        Employee employee = employeeService.getEmployeeByUserId(currentUser.getUserId());
        if (employee == null || !employee.getEmployeeId().equals(employeeId)) {
            throw new ForbiddenException("You do not have permission to view contracts of other employees");
        }
    }
    @PostMapping
    public ResponseEntity<ContractDTO> createContract(
            @Valid @RequestBody ContractRequest request,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.createContract(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(contractMapper.toDTO(contract, currentUser));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ContractDTO> getContractById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.getContractById(id);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }
    @GetMapping
    public ResponseEntity<List<ContractDTO>> getAllContracts(@AuthenticationPrincipal User currentUser) {
        List<Contract> contracts = contractService.getAllContracts();
        return ResponseEntity.ok(contractMapper.toDTOList(contracts, currentUser));
    }
    @PutMapping("/{id}")
    public ResponseEntity<ContractDTO> updateContract(
            @PathVariable Long id,
            @Valid @RequestBody ContractRequest request,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.updateContract(id, request);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteContract(@PathVariable Long id) {
        contractService.deleteContract(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted contract successfully");
        return ResponseEntity.ok(response);
    }
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<ContractDTO>> getContractsByEmployee(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser) {
        validateContractAccess(employeeId, currentUser);
        List<Contract> contracts = contractService.getContractsByEmployee(employeeId);
        return ResponseEntity.ok(contractMapper.toDTOList(contracts, currentUser));
    }
    @GetMapping("/employee/{employeeId}/active")
    public ResponseEntity<ContractDTO> getActiveContract(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser) {
        validateContractAccess(employeeId, currentUser);
        Contract contract = contractService.getActiveContract(employeeId);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }
    @GetMapping("/status/{status}")
    public ResponseEntity<List<ContractDTO>> getContractsByStatus(
            @PathVariable ContractStatus status,
            @AuthenticationPrincipal User currentUser) {
        List<Contract> contracts = contractService.getContractsByStatus(status);
        return ResponseEntity.ok(contractMapper.toDTOList(contracts, currentUser));
    }
    @GetMapping("/expiring")
    public ResponseEntity<List<ContractDTO>> getExpiringContracts(
            @RequestParam(defaultValue = "30") int daysAhead,
            @AuthenticationPrincipal User currentUser) {
        List<Contract> contracts = contractService.getExpiringContracts(daysAhead);
        return ResponseEntity.ok(contractMapper.toDTOList(contracts, currentUser));
    }
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ContractDTO> cancelContract(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.cancelContract(id);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }
    @PatchMapping("/{id}/renew")
    public ResponseEntity<ContractDTO> renewContract(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newEndDate,
            @AuthenticationPrincipal User currentUser) {
        Contract contract = contractService.renewContract(id, newEndDate);
        return ResponseEntity.ok(contractMapper.toDTO(contract, currentUser));
    }
    @PostMapping("/update-expired")
    public ResponseEntity<Map<String, Object>> updateExpiredContracts() {
        int count = contractService.updateExpiredContracts();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Updated expired contracts successfully");
        response.put("updatedCount", count);
        return ResponseEntity.ok(response);
    }
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
