package DoAn.BE.hrm.dto;

import DoAn.BE.hrm.entity.Review.Rating;
import DoAn.BE.hrm.entity.Review.ReviewStatus;
import DoAn.BE.hrm.entity.Review.ReviewType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDTO {

    private Long reviewId;
    private Long employeeId;
    private String employeeName;
    private String avatar;
    private String employeeEmail;

    private Long reviewerId;
    private String reviewerName;

    private String reviewPeriod;
    private ReviewType reviewType;

    private BigDecimal technicalScore;
    private BigDecimal attitudeScore;
    private BigDecimal softSkillsScore;
    private BigDecimal teamworkScore;
    private BigDecimal totalScore;

    private Rating rating;
    private String comments;
    private String nextGoals;
    private String developmentPlan;

    private ReviewStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate completedDate;

    // Project link (optional — dùng khi reviewType = PROJECT)
    private Long projectId;
    private String projectName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
