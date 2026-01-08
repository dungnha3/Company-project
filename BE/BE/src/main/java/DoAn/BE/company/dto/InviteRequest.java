package DoAn.BE.company.dto;

import DoAn.BE.company.entity.CompanyRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InviteRequest {
    @NotNull(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotNull(message = "Role is required")
    private CompanyRole role;
}
