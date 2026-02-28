package DoAn.BE.hrm.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.ContractRequest;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class ContractService {

    private final ContractRepository contractRepository;
    private final EmployeeRepository employeeRepository;
    private final DoAn.BE.common.service.AccessControlService accessControlService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public ContractService(ContractRepository contractRepository, EmployeeRepository employeeRepository,
            AccessControlService accessControlService,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this.contractRepository = contractRepository;
        this.employeeRepository = employeeRepository;
        this.accessControlService = accessControlService;
        this.eventPublisher = eventPublisher;
    }

    public Contract createContract(ContractRequest request) {
        if (request == null) {
            throw new BadRequestException("Request cannot be empty");
        }

        accessControlService.checkHrContractsPermission();

        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

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

        contract = contractRepository.save(contract);

        // Publish Event
        eventPublisher
                .publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.CONTRACT_CREATED,
                        contract, null, "New Contract for " + employee.getFullName()));

        return contract;
    }

    public Contract getContractById(Long id) {
        if (id == null) {
            throw new BadRequestException("Invalid Contract ID");
        }
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId != null && contract.getEmployee() != null && contract.getEmployee().getCompany() != null
                && !companyId.equals(contract.getEmployee().getCompany().getCompanyId())) {
            throw new DoAn.BE.common.exception.ForbiddenException("Bạn không có quyền xem hợp đồng này");
        }
        return contract;
    }

    public List<Contract> getAllContracts() {
        accessControlService.checkHrViewPermission();
        // ALL companies
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) {
            return java.util.Collections.emptyList();
        }
        return contractRepository.findByCompanyId(companyId);
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
                .orElseThrow(() -> new ResourceNotFoundException("No active contract found for this employee"));
    }
    public List<Contract> getContractsByStatus(ContractStatus status) {
        if (status == null) {
            return List.of();
        }
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null)
            return java.util.Collections.emptyList();
        return contractRepository.findByStatusAndCompanyId(status, companyId);
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
        contract = contractRepository.save(contract);

        // Publish Event
        eventPublisher
                .publishEvent(new DoAn.BE.hrm.event.HrmEvent(this, DoAn.BE.hrm.event.HrmEvent.Type.CONTRACT_RENEWED,
                        contract, null, "Contract Renewed for " + contract.getEmployee().getFullName()));

        return contract;
    }

    public List<Contract> getExpiringContracts(int daysAhead) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(daysAhead);
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        List<Contract> contracts = contractRepository.findExpiringContracts(startDate, endDate);
        if (companyId != null) {
            contracts = contracts.stream()
                    .filter(c -> c.getEmployee() != null && c.getEmployee().getCompany() != null
                            && companyId.equals(c.getEmployee().getCompany().getCompanyId()))
                    .toList();
        }
        return contracts;
    }

    public int updateExpiredContracts() {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        List<Contract> expiredContracts = contractRepository.findExpiredContracts(LocalDate.now());
        if (companyId != null) {
            expiredContracts = expiredContracts.stream()
                    .filter(c -> c.getEmployee() != null && c.getEmployee().getCompany() != null
                            && companyId.equals(c.getEmployee().getCompany().getCompanyId()))
                    .toList();
        }
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
