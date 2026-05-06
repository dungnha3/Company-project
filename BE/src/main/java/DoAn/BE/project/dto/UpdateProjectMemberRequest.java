package DoAn.BE.project.dto;

import DoAn.BE.project.entity.ProjectMember.MemberStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request DTO để cập nhật thông tin HR mở rộng của ProjectMember.
 * Tất cả các field đều optional (partial update).
 */
@Data
public class UpdateProjectMemberRequest {
    /** Vị trí trong dự án: "Frontend Dev", "BA", "QC"... */
    private String position;

    /** % thời gian tham gia (0-100) */
    private Integer allocationRate;

    /** Trạng thái tham gia */
    private MemberStatus memberStatus;

    /** Ngày bắt đầu tham gia */
    private LocalDate joinDate;

    /** Ngày rời dự án */
    private LocalDate leaveDate;

    /** Số năm kinh nghiệm */
    private Integer yearsOfExperience;

    /** Phí nội bộ/giờ */
    private BigDecimal billingRate;

    /** Ghi chú kỹ năng */
    private String skillNotes;
}
