package DoAn.BE.company.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.repository.FileRepository;

@ExtendWith(MockitoExtension.class)
public class SubscriptionServiceTest {

    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private CompanyMemberRepository companyMemberRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private FileRepository fileRepository;

    @InjectMocks
    private SubscriptionService subscriptionService;

    private Company testCompany;

    @BeforeEach
    void setUp() {
        testCompany = new Company();
        testCompany.setCompanyId(1L);
        testCompany.setName("Test Corp");
        testCompany.setPlan(Plan.FREE);
    }

    @Test
    void checkUserLimit_UnderLimit_NoException() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(companyMemberRepository.countByCompany_CompanyIdAndIsActiveTrue(1L)).thenReturn(2L);

        assertDoesNotThrow(() -> subscriptionService.checkUserLimit(1L));
    }

    @Test
    void checkUserLimit_AtLimit_ThrowsBadRequest() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(companyMemberRepository.countByCompany_CompanyIdAndIsActiveTrue(1L))
                .thenReturn((long) Plan.FREE.getMaxUsers());

        assertThrows(BadRequestException.class, () -> subscriptionService.checkUserLimit(1L));
    }

    @Test
    void checkProjectLimit_UnderLimit_NoException() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(projectRepository.countByCompany_CompanyId(1L)).thenReturn(1L);

        assertDoesNotThrow(() -> subscriptionService.checkProjectLimit(1L));
    }

    @Test
    void checkProjectLimit_AtLimit_ThrowsBadRequest() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(projectRepository.countByCompany_CompanyId(1L))
                .thenReturn((long) Plan.FREE.getMaxProjects());

        assertThrows(BadRequestException.class, () -> subscriptionService.checkProjectLimit(1L));
    }

    @Test
    void checkFeatureAccess_PayrollOnFree_ThrowsBadRequest() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));

        assertThrows(BadRequestException.class,
                () -> subscriptionService.checkFeatureAccess(1L, "PAYROLL"));
    }

    @Test
    void checkFeatureAccess_PayrollOnPro_NoException() {
        testCompany.setPlan(Plan.PROFESSIONAL);
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));

        assertDoesNotThrow(() -> subscriptionService.checkFeatureAccess(1L, "PAYROLL"));
    }

    @Test
    void checkStorageLimit_UnderLimit_NoException() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(fileRepository.sumFileSizeByCompany(1L)).thenReturn(500L * 1024 * 1024); // 500MB used

        assertDoesNotThrow(() -> subscriptionService.checkStorageLimit(1L, 100L * 1024 * 1024)); // upload 100MB
    }

    @Test
    void checkStorageLimit_OverLimit_ThrowsBadRequest() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(fileRepository.sumFileSizeByCompany(1L)).thenReturn(900L * 1024 * 1024); // 900MB used

        // FREE plan is 1GB = 1024MB, so 900MB + 200MB = 1100MB > 1024MB
        assertThrows(BadRequestException.class,
                () -> subscriptionService.checkStorageLimit(1L, 200L * 1024 * 1024));
    }

    @Test
    void checkStorageLimit_NullUsage_TreatsAsZero() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(fileRepository.sumFileSizeByCompany(1L)).thenReturn(null);

        assertDoesNotThrow(() -> subscriptionService.checkStorageLimit(1L, 100L * 1024 * 1024));
    }

    @Test
    void checkUserLimit_CompanyNotFound_ThrowsRuntime() {
        when(companyRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> subscriptionService.checkUserLimit(99L));
    }
}
