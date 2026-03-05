package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StartOnboardingRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Template ID is required")
    private Long templateId;
}
