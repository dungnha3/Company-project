package DoAn.BE.common.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.repository.CompanySettingsRepository;

@ExtendWith(MockitoExtension.class)
public class FeatureFlagServiceTest {

    @Mock
    private CompanySettingsRepository settingsRepository;

    @InjectMocks
    private FeatureFlagService featureFlagService;

    private CompanySettings settings;
    private MockedStatic<TenantContext> tenantMock;

    @BeforeEach
    void setUp() {
        settings = new CompanySettings();
        settings.setCompanyId(1L);
        settings.setHrModuleEnabled(true);
        settings.setSalaryEnabled(true);
        settings.setLeaveEnabled(true);
        settings.setContractEnabled(true);
        settings.setAttendanceEnabled(true);
        settings.setReviewEnabled(true);
        settings.setChatModuleEnabled(true);
        settings.setAiModuleEnabled(true);
        settings.setProjectModuleEnabled(true);
        settings.setStorageModuleEnabled(true);
        settings.setMaxLeaveDaysPerYear(15);
        settings.setAllowedRadius(200.0);
        settings.setOfficeLatitude(10.75);
        settings.setOfficeLongitude(106.65);

        tenantMock = mockStatic(TenantContext.class);
        tenantMock.when(TenantContext::getCompanyId).thenReturn(1L);
    }

    @AfterEach
    void tearDown() {
        tenantMock.close();
        FeatureFlagService.clearCache();
    }

    @Test
    void requireHRModule_Enabled_NoException() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertDoesNotThrow(() -> featureFlagService.requireHRModule());
    }

    @Test
    void requireHRModule_Disabled_ThrowsForbidden() {
        settings.setHrModuleEnabled(false);
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertThrows(ForbiddenException.class, () -> featureFlagService.requireHRModule());
    }

    @Test
    void requireSalaryFeature_Disabled_ThrowsForbidden() {
        settings.setSalaryEnabled(false);
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertThrows(ForbiddenException.class, () -> featureFlagService.requireSalaryFeature());
    }

    @Test
    void requireChatModule_Enabled_NoException() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertDoesNotThrow(() -> featureFlagService.requireChatModule());
    }

    @Test
    void requireChatModule_Disabled_ThrowsForbidden() {
        settings.setChatModuleEnabled(false);
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertThrows(ForbiddenException.class, () -> featureFlagService.requireChatModule());
    }

    @Test
    void getMaxLeaveDaysPerYear_ReturnsConfigured() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertEquals(15, featureFlagService.getMaxLeaveDaysPerYear());
    }

    @Test
    void getMaxLeaveDaysPerYear_NoSettings_ReturnsDefault() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.empty());

        assertEquals(12, featureFlagService.getMaxLeaveDaysPerYear());
    }

    @Test
    void getAllowedRadius_ReturnsConfigured() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertEquals(200.0, featureFlagService.getAllowedRadius());
    }

    @Test
    void getOfficeLatitude_ReturnsValue() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertEquals(10.75, featureFlagService.getOfficeLatitude());
    }

    @Test
    void getOfficeLongitude_ReturnsValue() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        assertEquals(106.65, featureFlagService.getOfficeLongitude());
    }

    @Test
    void noCompanyId_Module_NoException() {
        tenantMock.close();
        tenantMock = mockStatic(TenantContext.class);
        tenantMock.when(TenantContext::getCompanyId).thenReturn(null);

        assertDoesNotThrow(() -> featureFlagService.requireHRModule());
    }
}
