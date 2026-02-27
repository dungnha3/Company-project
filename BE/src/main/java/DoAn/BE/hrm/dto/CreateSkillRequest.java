package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateSkillRequest {

    @NotBlank(message = "Skill name is required")
    private String name;

    private String category;

    private String description;
}
