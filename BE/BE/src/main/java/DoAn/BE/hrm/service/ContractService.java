package DoAn.BE.hrm.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.ContractRequest;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import lombok.extern.slf4j.Slf4j;
import jakarta.transaction.Transactional;

@Service
@Transactional
@Slf4j
public class ContractService {

    private final ContractRepository contractRepository;
    private final EmployeeRepository employeeRepository;
    private final AccessControlService accessControlService;

    public ContractService(ContractRepository contractRepository, EmployeeRepository employeeRepository,
            AccessControlService accessControlService) {
        this.contractRepository = contractRepository;
        this.employeeRepository = employeeRepository;
        this.accessControlService = accessControlService;
    }

    public Contract createContract(ContractRequest request) {
        if (request == null) {
            throw new BadRequestException("Request cannot be empty");
        }

        accessControlService.checkHrContractsPermission();

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));

        if (request.getEndDate() != null && request.getStartDate() != null &&
                request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        Contract contract = new Contract();
        contract.setEmployee(employee);
        contract.setContractType(request.getContractType());
        contract.setStartDate(request.getStartDate());
        contract.setEndDate(request.getEndDate());
        contract.setSalary(request.getSalary());
        contract.setContent(request.getContent());
        contract.setStatus(ContractStatus.ACTIVE);

        return contractRepository.save(contract);
    }

    public Contract getContractById(Long id) {
        if (id == null) {
            throw new BadRequestException("Invalid Contract ID");
        }
        return contractRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Contract not found"));
    }

    public List<Contract> getAllContracts() {
        accessControlService.checkHrViewPermission();
        return contractRepository.findAll();
    }

    public Contract updateContract(Long id, ContractRequest request) {
        if (id == null || request == null) {
            throw new BadRequestException("Invalid update request");
        }

        accessControlService.checkHrContractsPermission();

        Contract contract = getContractById(id);

        if (request.getEmployeeId() != null &&
                !request.getEmployeeId().equals(contract.getEmployee().getEmployeeId())) {
            throw new BadRequestException("Cannot change employee of a contract");
        }

        if (request.getContractType() != null)
            contract.setContractType(request.getContractType());
        if (request.getStartDate() != null)
            contract.setStartDate(request.getStartDate());
        if (request.getEndDate() != null)
            contract.setEndDate(request.getEndDate());
        if (request.getSalary() != null)
            contract.setSalary(request.getSalary());
        if (request.getContent() != null)
            contract.setContent(request.getContent());

        if (contract.getEndDate() != null &&
                contract.getEndDate().isBefore(contract.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        return contractRepository.save(contract);
    }

    public void deleteContract(Long id) {
        accessControlService.checkHrContractsPermission();
        Contract contract = getContractById(id);
        contractRepository.delete(contract);
    }

    public List<Contract> getContractsByEmployee(Long employeeId) {
        if (employeeId == null) {
            throw new BadRequestException("Invalid Employee ID");
        }
        return contractRepository.findByEmployee_EmployeeId(employeeId);
    }

    public Contract getActiveContract(Long employeeId) {
        if (employeeId == null) {
            throw new BadRequestException("Invalid Employee ID");
        }

        return contractRepository.findFirstByEmployee_EmployeeIdAndStatusOrderByStartDateDesc(
                employeeId, ContractStatus.ACTIVE)
                .orElseThrow(() -> new EntityNotFoundException("No active contract found for this employee"));
    }

    public List<Contract> getContractsByStatus(ContractStatus status) {
        if (status == null) {
            return List.of();
        }
        return contractRepository.findByStatus(status);
    }

    public Contract cancelContract(Long id) {
        accessControlService.checkHrContractsPermission();
        Contract contract = getContractById(id);
        contract.setStatus(ContractStatus.CANCELLED);
        return contractRepository.save(contract);
    }

    public Contract renewContract(Long id, LocalDate newEndDate) {
        if (newEndDate == null) {
            throw new BadRequestException("New end date cannot be empty");
        }

        accessControlService.checkHrContractsPermission();

        Contract contract = getContractById(id);

        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new BadRequestException("Can only renew active contracts");
        }

        if (newEndDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Renewal date must be in the future");
        }

        contract.setEndDate(newEndDate);
        return contractRepository.save(contract);
    }

    public List<Contract> getExpiringContracts(int daysAhead) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(daysAhead);
        return contractRepository.findExpiringContracts(startDate, endDate);
    }

    public int updateExpiredContracts() {
        List<Contract> expiredContracts = contractRepository.findExpiredContracts(LocalDate.now());
        if (expiredContracts.isEmpty()) {
            return 0;
        }

        expiredContracts.forEach(hd -> hd.setStatus(ContractStatus.EXPIRED));
        contractRepository.saveAll(expiredContracts);
        return expiredContracts.size();
    }

    public boolean hasActiveContract(Long employeeId) {
        if (employeeId == null)
            return false;
        return contractRepository.findFirstByEmployee_EmployeeIdAndStatusOrderByStartDateDesc(
                employeeId, ContractStatus.ACTIVE).isPresent();
    }
}
