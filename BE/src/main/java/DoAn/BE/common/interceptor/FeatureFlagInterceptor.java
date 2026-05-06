package DoAn.BE.common.interceptor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import DoAn.BE.common.annotation.FeatureFlag;
import DoAn.BE.common.exception.FeatureDisabledException;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.service.CompanyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

// Interceptor that checks if a feature is enabled for the current company
// before allowing access to a controller/method marked with @FeatureFlag.
// /
@Slf4j
@Component
public class FeatureFlagInterceptor implements HandlerInterceptor {

    @Autowired
    @Lazy
    private CompanyService companyService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        HandlerMethod handlerMethod = (HandlerMethod) handler;

        // Check method-level annotation first, then class-level
        FeatureFlag featureFlag = handlerMethod.getMethodAnnotation(FeatureFlag.class);
        if (featureFlag == null) {
            featureFlag = handlerMethod.getBeanType().getAnnotation(FeatureFlag.class);
        }

        if (featureFlag == null) {
            // No feature flag annotation, allow access
            return true;
        }

        String featureCode = featureFlag.value();
        Long companyId = TenantContext.getCompanyId();

        // Skip check if no company context (e.g., public endpoints)
        if (companyId == null) {
            return true;
        }

        CompanySettings settings = companyService.getSettingsCached(companyId);

        if (!isFeatureEnabled(settings, featureCode)) {
            log.warn("Feature '{}' is disabled for company {}", featureCode, companyId);
            throw new FeatureDisabledException(featureCode);
        }

        return true;
    }

    // Check if a feature is enabled based on CompanySettings
    // /
    private boolean isFeatureEnabled(CompanySettings settings, String featureCode) {
        if (settings == null) {
            // Fail-open: allow if no settings (legacy companies)
            return true;
        }

        switch (featureCode.toUpperCase()) {
            // Main modules
            case "HR":
                return settings.isHrModuleEnabled();
            case "PROJECT":
                return settings.isProjectModuleEnabled();
            case "CHAT":
            case "STORAGE":
            case "AI":
                return true;

            // HR sub-features (require HR + specific flag)
            case "LEAVE":
                return settings.isHrModuleEnabled() && settings.isLeaveEnabled();
            case "REVIEW":
                return settings.isHrModuleEnabled() && settings.isReviewEnabled();
            case "RESOURCE_PLANNING":
                return settings.isHrModuleEnabled() && settings.isResourcePlanningEnabled();

            // Project sub-features (require PROJECT + specific flag)
            case "TIME_TRACKING":
                return settings.isProjectModuleEnabled() && settings.isTimeTrackingEnabled();
            case "ANALYTICS":
                return settings.isProjectModuleEnabled() && settings.isAnalyticsEnabled();
            case "CALENDAR":
                return settings.isCalendarEnabled();
            case "WEBHOOK":
                return true;

            // Chat sub-features
            case "CHAT_REACTIONS":
            case "CHAT_THREADS":
            case "CHAT_SEARCH":
            case "CHAT_FILE_SHARE":
                return true;

            default:
                log.warn("Unknown feature code: {}, allowing by default", featureCode);
                return true;
        }
    }
}
