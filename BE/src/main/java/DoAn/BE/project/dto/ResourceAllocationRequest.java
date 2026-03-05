package DoAn.BE.project.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResourceAllocationRequest {

    @NotNull(message = "Employee ID cannot be null")
    private Long employeeId;

    private Long projectId;

    @NotNull(message = "Start date cannot be null")
    private LocalDate startDate;

    @NotNull(message = "End date cannot be null")
    private LocalDate endDate;

    @NotNull(message = "Allocation cannot be null")
    @Min(value = 0, message = "Allocation must be >= 0")
    @Max(value = 100, message = "Allocation must be <= 100")
    private Integer allocation;

    private String note;
}
