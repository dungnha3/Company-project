package DoAn.BE.hrm.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.Contract.ContractType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContractDTO {
    private Long contractId;
    private Long employeeId;
    private String employeeName;
    private String avatarUrl;
    private String positionName;
    private ContractType contractType;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal salary;
    private String content;
    private ContractStatus status;
    private LocalDateTime createdAt;

    private Boolean isExpired;
    private Integer daysRemaining;
}
