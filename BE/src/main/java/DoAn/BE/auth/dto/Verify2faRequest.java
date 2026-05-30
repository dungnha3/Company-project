package DoAn.BE.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class Verify2faRequest {
    @NotBlank(message = "Temp token is required")
    private String tempToken;

    @NotBlank(message = "2FA code is required")
    private String code;
}
