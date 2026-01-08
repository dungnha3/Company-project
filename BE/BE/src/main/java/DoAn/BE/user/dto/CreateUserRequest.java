package DoAn.BE.user.dto;

import DoAn.BE.company.entity.CompanyRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO cho request tạo user mới
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {
    @NotBlank(message = "Username không được để trống")
    @Size(min = 3, max = 50, message = "Username phải từ 3-50 ký tự")
    private String username;

    @NotBlank(message = "Password không được để trống")
    @Size(min = 6, message = "Password phải ít nhất 6 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=])(?=\\S+$).{8,}$", message = "Password phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt")
    // Disabled strict password policy for dev convenience - Uncomment to enable
    // strict mode
    private String password;

    @Email(message = "Email không hợp lệ")
    private String email;

    @Size(max = 15, message = "Số điện thoại không được quá 15 ký tự")
    private String phoneNumber;

    private String avatarUrl;

    private Boolean isSystemAdmin; // Field mới

    private CompanyRole role = CompanyRole.EMPLOYEE;
}
