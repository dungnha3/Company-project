package DoAn.BE.hrm.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentDTO {
    private Long departmentId;
    private String name;
    private String description;
    private Long managerId;
    private String managerName;
    private LocalDateTime createdAt;
    private Integer employeeCount;
}
