package DoAn.BE.common.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.QuotaExceededException;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.service.CompanyService;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.repository.FileRepository;

import DoAn.BE.common.exception.BadRequestException;

@ExtendWith(MockitoExtension.class)
public class QuotaServiceTest {

    @Mock
    private CompanyService companyService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private FileRepository fileRepository;

    @InjectMocks
    private QuotaService quotaService;

    private CompanySettings settings;
    private MockedStatic<TenantContext> tenantMock;

    @BeforeEach
    void setUp() {
        settings = new CompanySettings();
        settings.setCompanyId(1L);
        settings.setMaxEmployees(10);
        settings.setMaxProjects(5);
        settings.setMaxStorageBytes(1024 * 1024 * 100L); // 100MB
        settings.setMaxFileUploadBytes(10 * 1024 * 1024L); // 10MB per file

        tenantMock = mockStatic(TenantContext.class);
        tenantMock.when(TenantContext::getCompanyId).thenReturn(1L);
    }

    @AfterEach
    void tearDown() {
        tenantMock.close();
    }

    @Test
    void validateEmployeeQuota_UnderLimit_NoException() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);
        when(employeeRepository.countByCompanyId(1L)).thenReturn(5L);

        assertDoesNotThrow(() -> quotaService.validateEmployeeQuota());
    }

    @Test
    void validateEmployeeQuota_AtLimit_ThrowsQuotaExceeded() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);
        when(employeeRepository.countByCompanyId(1L)).thenReturn(10L);

        assertThrows(QuotaExceededException.class, () -> quotaService.validateEmployeeQuota());
    }

    @Test
    void validateProjectQuota_UnderLimit_NoException() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);
        when(projectRepository.countByCompany_CompanyId(1L)).thenReturn(3L);

        assertDoesNotThrow(() -> quotaService.validateProjectQuota());
    }

    @Test
    void validateProjectQuota_AtLimit_ThrowsQuotaExceeded() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);
        when(projectRepository.countByCompany_CompanyId(1L)).thenReturn(5L);

        assertThrows(QuotaExceededException.class, () -> quotaService.validateProjectQuota());
    }

    @Test
    void validateStorageQuota_UnderLimit_NoException() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);
        when(fileRepository.sumFileSizeByCompany(1L)).thenReturn(50L * 1024 * 1024); // 50MB used

        assertDoesNotThrow(() -> quotaService.validateStorageQuota(10L * 1024 * 1024)); // Upload 10MB
    }

    @Test
    void validateStorageQuota_WouldExceed_ThrowsQuotaExceeded() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);
        when(fileRepository.sumFileSizeByCompany(1L)).thenReturn(95L * 1024 * 1024); // 95MB used

        assertThrows(QuotaExceededException.class,
                () -> quotaService.validateStorageQuota(10L * 1024 * 1024)); // Upload 10MB → 105MB > 100MB
    }

    @Test
    void getRemainingStorageBytes_ReturnsCorrectValue() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);
        when(fileRepository.sumFileSizeByCompany(1L)).thenReturn(30L * 1024 * 1024); // 30MB used

        long remaining = quotaService.getRemainingStorageBytes();

        assertEquals(70L * 1024 * 1024, remaining); // 100MB - 30MB = 70MB
    }

    @Test
    void noCompanyId_SkipsValidation() {
        tenantMock.close();
        tenantMock = mockStatic(TenantContext.class);
        tenantMock.when(TenantContext::getCompanyId).thenReturn(null);

        assertDoesNotThrow(() -> quotaService.validateEmployeeQuota());
        assertDoesNotThrow(() -> quotaService.validateProjectQuota());
        assertDoesNotThrow(() -> quotaService.validateStorageQuota(999999));
    }

    @Test
    void getQuotaUsage_ReturnsUsage() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);
        when(employeeRepository.countByCompanyId(1L)).thenReturn(7L);
        when(projectRepository.countByCompany_CompanyId(1L)).thenReturn(3L);
        when(fileRepository.sumFileSizeByCompany(1L)).thenReturn(50L * 1024 * 1024);

        QuotaService.QuotaUsage usage = quotaService.getQuotaUsage();

        assertNotNull(usage);
        assertEquals(7, usage.employeesUsed());
        assertEquals(10, usage.employeesMax());
    }

    // ===== validateFileSize tests (added Phase 7) =====

    @Test
    void validateFileSize_UnderLimit_NoException() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        // 5MB file, limit is 10MB
        assertDoesNotThrow(() -> quotaService.validateFileSize(5L * 1024 * 1024));
    }

    @Test
    void validateFileSize_AtLimit_NoException() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        // Exactly 10MB, limit is 10MB (should pass since it's at, not over)
        assertDoesNotThrow(() -> quotaService.validateFileSize(10L * 1024 * 1024));
    }

    @Test
    void validateFileSize_OverLimit_ThrowsBadRequest() {
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        // 11MB file, limit is 10MB
        assertThrows(BadRequestException.class,
                () -> quotaService.validateFileSize(11L * 1024 * 1024));
    }

    @Test
    void validateFileSize_NoCompanyId_SkipsValidation() {
        tenantMock.close();
        tenantMock = mockStatic(TenantContext.class);
        tenantMock.when(TenantContext::getCompanyId).thenReturn(null);

        // Even a huge file should pass without company context
        assertDoesNotThrow(() -> quotaService.validateFileSize(999L * 1024 * 1024));
    }

    @Test
    void validateFileSize_NullSettings_SkipsValidation() {
        when(companyService.getSettingsCached(1L)).thenReturn(null);

        assertDoesNotThrow(() -> quotaService.validateFileSize(999L * 1024 * 1024));
    }
}
