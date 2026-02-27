package DoAn.BE.common.interceptor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.method.HandlerMethod;

import DoAn.BE.common.annotation.FeatureFlag;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.FeatureDisabledException;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.service.CompanyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Tests for FeatureFlagInterceptor — verifies that the @FeatureFlag annotation
// blocks access when a feature module is disabled in CompanySettings.
// /
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class FeatureFlagInterceptorTest {

    @Mock
    private CompanyService companyService;
    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;
    @Mock
    private HandlerMethod handlerMethod;

    private FeatureFlagInterceptor interceptor;

    private CompanySettings settings;
    private MockedStatic<TenantContext> tenantMock;

    @BeforeEach
    void setUp() throws Exception {
        interceptor = new FeatureFlagInterceptor();
        // Inject the mock CompanyService via reflection (field is @Autowired @Lazy)
        var field = FeatureFlagInterceptor.class.getDeclaredField("companyService");
        field.setAccessible(true);
        field.set(interceptor, companyService);

        settings = new CompanySettings();
        settings.setCompanyId(1L);
        settings.setHrModuleEnabled(true);
        settings.setProjectModuleEnabled(true);
        settings.setChatModuleEnabled(true);
        settings.setStorageModuleEnabled(true);
        settings.setAiModuleEnabled(true);
        settings.setAttendanceEnabled(true);
        settings.setLeaveEnabled(true);
        settings.setSalaryEnabled(true);
        settings.setContractEnabled(true);
        settings.setReviewEnabled(true);
        settings.setOkrEnabled(true);
        settings.setSkillsMatrixEnabled(true);
        settings.setOnboardingEnabled(true);

        tenantMock = mockStatic(TenantContext.class);
        tenantMock.when(TenantContext::getCompanyId).thenReturn(1L);
    }

    @AfterEach
    void tearDown() {
        tenantMock.close();
    }

    // ===== No annotation = always pass =====

    @Test
    void noFeatureFlag_AllowsAccess() throws Exception {
        when(handlerMethod.getMethodAnnotation(FeatureFlag.class)).thenReturn(null);
        @SuppressWarnings("rawtypes")
        Class beanType = (Class) Object.class;
        when(handlerMethod.getBeanType()).thenReturn(beanType);

        assertTrue(interceptor.preHandle(request, response, handlerMethod));
    }

    // ===== HR module =====

    @Test
    void hrModule_Enabled_AllowsAccess() throws Exception {
        mockFeatureFlag("HR");
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertTrue(interceptor.preHandle(request, response, handlerMethod));
    }

    @Test
    void hrModule_Disabled_ThrowsFeatureDisabled() throws Exception {
        mockFeatureFlag("HR");
        settings.setHrModuleEnabled(false);
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertThrows(FeatureDisabledException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
    }

    // ===== Sub-features require parent module =====

    @Test
    void contractFeature_HrDisabled_Blocked() throws Exception {
        mockFeatureFlag("CONTRACT");
        settings.setHrModuleEnabled(false);
        settings.setContractEnabled(true);
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertThrows(FeatureDisabledException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
    }

    @Test
    void contractFeature_HrEnabledContractDisabled_Blocked() throws Exception {
        mockFeatureFlag("CONTRACT");
        settings.setHrModuleEnabled(true);
        settings.setContractEnabled(false);
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertThrows(FeatureDisabledException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
    }

    @Test
    void contractFeature_BothEnabled_Allowed() throws Exception {
        mockFeatureFlag("CONTRACT");
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertTrue(interceptor.preHandle(request, response, handlerMethod));
    }

    @Test
    void okrFeature_HrDisabled_Blocked() throws Exception {
        mockFeatureFlag("OKR");
        settings.setHrModuleEnabled(false);
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertThrows(FeatureDisabledException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
    }

    @Test
    void reviewFeature_HrEnabledReviewDisabled_Blocked() throws Exception {
        mockFeatureFlag("REVIEW");
        settings.setReviewEnabled(false);
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertThrows(FeatureDisabledException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
    }

    @Test
    void skillsMatrixFeature_BothEnabled_Allowed() throws Exception {
        mockFeatureFlag("SKILLS_MATRIX");
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertTrue(interceptor.preHandle(request, response, handlerMethod));
    }

    @Test
    void onboardingFeature_SubDisabled_Blocked() throws Exception {
        mockFeatureFlag("ONBOARDING");
        settings.setOnboardingEnabled(false);
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertThrows(FeatureDisabledException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
    }

    // ===== Project module =====

    @Test
    void projectModule_Disabled_ThrowsFeatureDisabled() throws Exception {
        mockFeatureFlag("PROJECT");
        settings.setProjectModuleEnabled(false);
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertThrows(FeatureDisabledException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
    }

    // ===== Storage module =====

    @Test
    void storageModule_Disabled_ThrowsFeatureDisabled() throws Exception {
        mockFeatureFlag("STORAGE");
        settings.setStorageModuleEnabled(false);
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertThrows(FeatureDisabledException.class,
                () -> interceptor.preHandle(request, response, handlerMethod));
    }

    // ===== No company context = skip check =====

    @Test
    void noCompanyId_SkipsCheck_Allows() throws Exception {
        tenantMock.close();
        tenantMock = mockStatic(TenantContext.class);
        tenantMock.when(TenantContext::getCompanyId).thenReturn(null);

        mockFeatureFlag("HR");

        assertTrue(interceptor.preHandle(request, response, handlerMethod));
    }

    // ===== Null settings = fail-open =====

    @Test
    void nullSettings_FailOpen_Allows() throws Exception {
        mockFeatureFlag("HR");
        when(companyService.getSettingsCached(1L)).thenReturn(null);

        assertTrue(interceptor.preHandle(request, response, handlerMethod));
    }

    // ===== Unknown feature code = fail-open =====

    @Test
    void unknownFeatureCode_FailOpen_Allows() throws Exception {
        mockFeatureFlag("UNKNOWN_FEATURE");
        when(companyService.getSettingsCached(1L)).thenReturn(settings);

        assertTrue(interceptor.preHandle(request, response, handlerMethod));
    }

    // ===== Not a HandlerMethod = skip =====

    @Test
    void nonHandlerMethod_SkipsCheck_Allows() throws Exception {
        assertTrue(interceptor.preHandle(request, response, new Object()));
    }

    // ===== Helper =====

    private void mockFeatureFlag(String value) {
        FeatureFlag annotation = mock(FeatureFlag.class);
        when(annotation.value()).thenReturn(value);
        when(handlerMethod.getMethodAnnotation(FeatureFlag.class)).thenReturn(annotation);
    }
}
