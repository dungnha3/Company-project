package DoAn.BE.timetracking.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTimeLogRequest {

    @NotNull(message = "Issue ID là bắt buộc")
    private Long issueId;

    @NotNull(message = "Số giờ là bắt buộc")
    @DecimalMin(value = "0.25", message = "Số giờ tối thiểu là 0.25 (15 phút)")
    @DecimalMax(value = "24.00", message = "Số giờ tối đa là 24")
    private BigDecimal loggedHours;

    @NotNull(message = "Ngày làm việc là bắt buộc")
    @PastOrPresent(message = "Ngày làm việc không thể trong tương lai")
    private LocalDate workDate;

    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    private String description;
}
