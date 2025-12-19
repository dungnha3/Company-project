package DoAn.BE.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO cho approve/reject nghỉ phép
 * Người duyệt được lấy từ currentUser, không cần truyền vào
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApproveRejectRequest {
    
    // Ghi chú khi duyệt hoặc từ chối (optional)
    private String ghiChu;
}
