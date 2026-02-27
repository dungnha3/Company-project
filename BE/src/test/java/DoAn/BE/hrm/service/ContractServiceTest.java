package DoAn.BE.hrm.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.dto.ContractRequest;
import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
public class ContractServiceTest {

    @Mock
    private ContractRepository contractRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AccessControlService accessControlService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ContractService contractService;

    private Employee testEmployee;
    private Contract testContract;

    @BeforeEach
    void setUp() {
        testEmployee = new Employee();
        testEmployee.setEmployeeId(1L);
        testEmployee.setFullName("John Doe");

        testContract = new Contract();
        testContract.setContractId(10L);
        testContract.setEmployee(testEmployee);
        testContract.setStatus(ContractStatus.ACTIVE);
        testContract.setStartDate(LocalDate.of(2025, 1, 1));
        testContract.setEndDate(LocalDate.of(2026, 1, 1));
    }

    @Test
    void createContract_Success() {
        ContractRequest req = new ContractRequest();
        req.setEmployeeId(1L);
        req.setStartDate(LocalDate.of(2025, 1, 1));
        req.setEndDate(LocalDate.of(2026, 1, 1));

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
        when(contractRepository.save(any(Contract.class))).thenAnswer(i -> {
            Contract c = i.getArgument(0);
            c.setContractId(10L);
            return c;
        });

        Contract result = contractService.createContract(req);

        assertNotNull(result);
        assertEquals(ContractStatus.ACTIVE, result.getStatus());
        verify(accessControlService).checkHrContractsPermission();
    }

    @Test
    void createContract_NullRequest_ThrowsBadRequest() {
        assertThrows(BadRequestException.class, () -> contractService.createContract(null));
    }

    @Test
    void createContract_EndDateBeforeStartDate_ThrowsBadRequest() {
        ContractRequest req = new ContractRequest();
        req.setEmployeeId(1L);
        req.setStartDate(LocalDate.of(2026, 6, 1));
        req.setEndDate(LocalDate.of(2025, 1, 1));

        when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));

        assertThrows(BadRequestException.class, () -> contractService.createContract(req));
    }

    @Test
    void getContractById_Success() {
        when(contractRepository.findById(10L)).thenReturn(Optional.of(testContract));

        Contract result = contractService.getContractById(10L);

        assertNotNull(result);
        assertEquals(10L, result.getContractId());
    }

    @Test
    void getContractById_NotFound_Throws() {
        when(contractRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> contractService.getContractById(99L));
    }

    @Test
    void cancelContract_Success() {
        when(contractRepository.findById(10L)).thenReturn(Optional.of(testContract));
        when(contractRepository.save(any(Contract.class))).thenAnswer(i -> i.getArgument(0));

        Contract result = contractService.cancelContract(10L);

        assertEquals(ContractStatus.CANCELLED, result.getStatus());
    }

    @Test
    void renewContract_Success() {
        LocalDate newEnd = LocalDate.now().plusYears(1);
        when(contractRepository.findById(10L)).thenReturn(Optional.of(testContract));
        when(contractRepository.save(any(Contract.class))).thenAnswer(i -> i.getArgument(0));

        Contract result = contractService.renewContract(10L, newEnd);

        assertEquals(newEnd, result.getEndDate());
    }

    @Test
    void renewContract_NullDate_ThrowsBadRequest() {
        assertThrows(BadRequestException.class, () -> contractService.renewContract(10L, null));
    }

    @Test
    void hasActiveContract_True() {
        when(contractRepository.findFirstByEmployee_EmployeeIdAndStatusOrderByStartDateDesc(1L, ContractStatus.ACTIVE))
                .thenReturn(Optional.of(testContract));

        assertTrue(contractService.hasActiveContract(1L));
    }

    @Test
    void hasActiveContract_False() {
        when(contractRepository.findFirstByEmployee_EmployeeIdAndStatusOrderByStartDateDesc(1L, ContractStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertFalse(contractService.hasActiveContract(1L));
    }

    @Test
    void updateExpiredContracts_MarksExpired() {
        Contract expired = new Contract();
        expired.setStatus(ContractStatus.ACTIVE);
        when(contractRepository.findExpiredContracts(any(LocalDate.class))).thenReturn(List.of(expired));

        int count = contractService.updateExpiredContracts();

        assertEquals(1, count);
        assertEquals(ContractStatus.EXPIRED, expired.getStatus());
        verify(contractRepository).saveAll(List.of(expired));
    }

    @Test
    void getAllContracts_ChecksPermission() {
        when(contractRepository.findAll()).thenReturn(List.of(testContract));

        List<Contract> result = contractService.getAllContracts();

        assertEquals(1, result.size());
        verify(accessControlService).checkHrViewPermission();
    }

    @Test
    void deleteContract_Success() {
        when(contractRepository.findById(10L)).thenReturn(Optional.of(testContract));

        contractService.deleteContract(10L);

        verify(accessControlService).checkHrContractsPermission();
        verify(contractRepository).delete(testContract);
    }

    @Test
    void getContractsByEmployee_ReturnsList() {
        when(contractRepository.findByEmployee_EmployeeId(1L)).thenReturn(List.of(testContract));

        List<Contract> result = contractService.getContractsByEmployee(1L);

        assertEquals(1, result.size());
    }

    @Test
    void getContractsByEmployee_NullId_ThrowsBadRequest() {
        assertThrows(BadRequestException.class, () -> contractService.getContractsByEmployee(null));
    }

    @Test
    void updateContract_Success() {
        ContractRequest req = new ContractRequest();
        req.setEmployeeId(1L); // same as existing
        req.setContent("Updated content");

        when(contractRepository.findById(10L)).thenReturn(Optional.of(testContract));
        when(contractRepository.save(any(Contract.class))).thenAnswer(i -> i.getArgument(0));

        Contract result = contractService.updateContract(10L, req);

        assertEquals("Updated content", result.getContent());
        verify(accessControlService).checkHrContractsPermission();
    }

    @Test
    void updateContract_ChangeEmployee_ThrowsBadRequest() {
        ContractRequest req = new ContractRequest();
        req.setEmployeeId(999L); // different employee

        when(contractRepository.findById(10L)).thenReturn(Optional.of(testContract));

        assertThrows(BadRequestException.class, () -> contractService.updateContract(10L, req));
    }

    @Test
    void renewContract_NotActiveStatus_ThrowsBadRequest() {
        testContract.setStatus(ContractStatus.CANCELLED);
        when(contractRepository.findById(10L)).thenReturn(Optional.of(testContract));

        assertThrows(BadRequestException.class,
                () -> contractService.renewContract(10L, LocalDate.now().plusMonths(6)));
    }

    @Test
    void renewContract_PastDate_ThrowsBadRequest() {
        when(contractRepository.findById(10L)).thenReturn(Optional.of(testContract));

        assertThrows(BadRequestException.class,
                () -> contractService.renewContract(10L, LocalDate.now().minusDays(1)));
    }

    @Test
    void getContractsByStatus_NullStatus_ReturnsEmptyList() {
        List<Contract> result = contractService.getContractsByStatus(null);

        assertTrue(result.isEmpty());
    }

    @Test
    void updateExpiredContracts_NoneExpired_ReturnsZero() {
        when(contractRepository.findExpiredContracts(any(LocalDate.class))).thenReturn(List.of());

        assertEquals(0, contractService.updateExpiredContracts());
    }
}
