package DoAn.BE.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark controllers/methods that require a specific feature to be
 * enabled.
 * The FeatureFlagInterceptor will check if the feature is enabled for the
 * current company.
 * 
 * Usage:
 * @FeatureFlag("HR") - on class or method level
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
public @interface FeatureFlag {
    /**
     * The feature code to check.
     * Valid values: HR, SALARY, LEAVE, ATTENDANCE, CONTRACT, REVIEW,
     * PROJECT, CHAT, STORAGE, AI, CALENDAR, AUTOMATION,
     * OKR, SKILLS_MATRIX, ONBOARDING, RESOURCE_PLANNING, ORG_CHART,
     * TIME_TRACKING, ANALYTICS
     */
    String value();
}
