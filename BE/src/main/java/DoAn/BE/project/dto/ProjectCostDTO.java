package DoAn.BE.project.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectCostDTO {
    private Long projectId;
    private String projectName;
    
    // Tổng chi phí nhân sự (HR Cost) = Tổng mức tiêu hao của tất cả ProjectMembers
    private BigDecimal totalHrCost;
    
    // Tổng chi phí phát sinh (Expenses) = Tổng các ProjectExpense
    private BigDecimal totalExpenses;
    
    // Tổng chi phí dự án = HR Cost + Expenses
    private BigDecimal totalProjectCost;
    
    // Chi tiết từng loại
    private List<MemberCostDTO> memberCosts;
    private List<ProjectExpenseDTO> expenses;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberCostDTO {
        private Long userId;
        private String fullName;
        private String position;
        private Integer daysInvolved;
        private Integer allocationRate;
        private BigDecimal dailyRate;
        private BigDecimal totalCost;
    }
}
