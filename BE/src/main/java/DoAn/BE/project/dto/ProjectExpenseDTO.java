package DoAn.BE.project.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectExpenseDTO {
    private Long expenseId;
    private Long projectId;
    private String expenseName;
    private BigDecimal amount;
    private LocalDate expenseDate;
    private String description;
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
}
