package DoAn.BE.hrm.dto;

import DoAn.BE.hrm.entity.OnboardingInstance.OnboardingStatus;
import lombok.Data;

@Data
public class UpdateOnboardingProgressRequest {

    private Integer currentStep;

    private OnboardingStatus status;
}
