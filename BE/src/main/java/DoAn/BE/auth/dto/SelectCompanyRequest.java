package DoAn.BE.auth.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

// DTO cho request chọn công ty sau khi login
@Data
public class SelectCompanyRequest {

    @NotNull(message = "Company ID không được để trống")
    private Long companyId;
}
