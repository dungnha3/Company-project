package DoAn.BE.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSimpleDTO {
    private Long employeeId;
    private String fullName;
    private String positionName;
    private String departmentName;
}
