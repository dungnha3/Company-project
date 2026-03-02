package DoAn.BE.project.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResourceAllocationDTO {
    private Long allocationId;
    private Long employeeId;
    private String employeeName;
    private Long projectId;
    private String projectName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer allocation;
    private String note;
}
