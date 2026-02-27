package DoAn.BE.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApproveRejectRequest {

    // Ghi chú khi duyệt hoặc từ chối (optional)
    private String ghiChu;
}
