package DoAn.BE.auth.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GoogleLoginRequest {
    @NotNull(message = "ID Token is required")
    private String idToken;
}
