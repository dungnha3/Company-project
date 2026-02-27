package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class CreateOKRRequest {

    @NotBlank(message = "OKR title is required")
    private String title;

    private String description;

    private String period;

    private List<KeyResultRequest> keyResults;

    @Data
    public static class KeyResultRequest {
        @NotBlank(message = "Key result title is required")
        private String title;
        private Double target;
        private String unit;
    }
}
