package DoAn.BE.hrm.dto;

import DoAn.BE.hrm.entity.Review.ReviewType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewRequest {

    @NotNull(message = "Employee ID cannot be null")
    private Long employeeId;

    @NotBlank(message = "Review period cannot be empty")
    @Size(max = 50, message = "Review period max 50 chars")
    private String reviewPeriod;

    @NotNull(message = "Review type cannot be null")
    private ReviewType reviewType;

    @NotNull(message = "Technical score cannot be null")
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "10.0")
    private BigDecimal technicalScore;

    @NotNull(message = "Attitude score cannot be null")
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "10.0")
    private BigDecimal attitudeScore;

    @NotNull(message = "Soft skills score cannot be null")
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "10.0")
    private BigDecimal softSkillsScore;

    @NotNull(message = "Teamwork score cannot be null")
    @DecimalMin(value = "0.0")
    @DecimalMax(value = "10.0")
    private BigDecimal teamworkScore;

    @Size(max = 2000)
    private String comments;

    @Size(max = 1000)
    private String nextGoals;

    @Size(max = 1000)
    private String developmentPlan;

    @NotNull(message = "Start date cannot be null")
    private LocalDate startDate;

    @NotNull(message = "End date cannot be null")
    private LocalDate endDate;

    // Optional: gắn review với dự án (khi reviewType = PROJECT)
    private Long projectId;
    private String projectName;
}
