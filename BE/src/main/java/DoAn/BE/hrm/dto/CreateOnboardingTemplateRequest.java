package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class CreateOnboardingTemplateRequest {

    @NotBlank(message = "Template name is required")
    private String name;

    private String description;

    private Integer duration;

    private List<StepRequest> steps;

    @Data
    public static class StepRequest {
        @NotBlank(message = "Step title is required")
        private String title;
        private String description;
        private Boolean required;
    }
}
