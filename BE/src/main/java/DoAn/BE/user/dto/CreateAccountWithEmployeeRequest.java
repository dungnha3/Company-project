package DoAn.BE.user.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateAccountWithEmployeeRequest {

    // Thông tin tài khoản
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3-50 ký tự")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    private String password;

    @NotBlank(message = "Role không được để trống")
    @Pattern(regexp = "ADMIN|MANAGER_HR|MANAGER_ACCOUNTING|MANAGER_PROJECT|EMPLOYEE", message = "Role phải là ADMIN, MANAGER_HR, MANAGER_ACCOUNTING, MANAGER_PROJECT hoặc EMPLOYEE")
    private String role;

    // Thông tin nhân viên
    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 100, message = "Họ tên không được quá 100 ký tự")
    private String hoTen;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    @Pattern(regexp = "Nam|Nữ|Khác", message = "Giới tính phải là Nam, Nữ hoặc Khác")
    private String gioiTinh = "Nam";

    private String diaChi;

    @NotNull(message = "Ngày sinh không được để trống")
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate ngaySinh;

    @NotNull(message = "Ngày vào làm không được để trống")
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate ngayVaoLam;

    @Pattern(regexp = "^[0-9]{10,11}$", message = "Số điện thoại phải có 10-11 chữ số")
    private String soDienThoai;

    @Pattern(regexp = "^[0-9]{12}$", message = "CCCD phải có 12 chữ số")
    private String cccd;

    // Thông tin phòng ban, chức vụ
    private Long phongBanId;
    private Long chucVuId;
}
