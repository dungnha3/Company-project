package DoAn.BE.user.dto;

import DoAn.BE.user.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO cho request cập nhật thông tin user
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    @Size(min = 3, max = 50, message = "Username phải từ 3-50 ký tự")
    private String username;

    @Email(message = "Email không hợp lệ")
    private String email;

    @Size(max = 20, message = "Số điện thoại không được quá 20 ký tự")
    private String phoneNumber;

    @Size(max = 500000, message = "Avatar URL không được quá 500KB")
    private String avatarUrl;

    private User.Role role;

    private Boolean isActive;

    // Fields for NhanVien entity
    @Size(max = 100, message = "Họ tên không được quá 100 ký tự")
    private String hoTen;

    @Size(max = 20, message = "Số điện thoại không được quá 20 ký tự")
    private String sdt;

    @Size(max = 255, message = "Địa chỉ không được quá 255 ký tự")
    private String diaChi;
}
