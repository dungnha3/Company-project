package DoAn.BE.hrm.dto;

import DoAn.BE.hrm.entity.SalaryProposal.ProposalStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalaryProposalDTO {
    private Long proposalId;
    private Long employeeId;
    private String employeeName;
    private String employeeAvatar;
    private BigDecimal currentSalary;
    private BigDecimal proposedSalary;
    private String reason;
    private ProposalStatus status;
    private Long reviewedBy;
    private String reviewedByName;
    private LocalDate reviewDate;
    private Long projectId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
