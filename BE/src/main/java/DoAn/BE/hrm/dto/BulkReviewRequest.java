package DoAn.BE.hrm.dto;

import DoAn.BE.hrm.entity.Review.ReviewType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkReviewRequest {

    private List<Long> employeeIds;

    @NotBlank(message = "Review period cannot be empty")
    @Size(max = 50, message = "Review period max 50 chars")
    private String reviewPeriod;

    @NotNull(message = "Review type cannot be null")
    private ReviewType reviewType;

    private LocalDate startDate;

    private LocalDate endDate;

    private Long projectId;
    private String projectName;
}
