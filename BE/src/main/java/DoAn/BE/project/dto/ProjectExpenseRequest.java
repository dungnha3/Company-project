package DoAn.BE.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ProjectExpenseRequest {
    @NotNull(message = "Project ID is required")
    private Long projectId;

    @NotBlank(message = "Expense name is required")
    private String expenseName;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    @NotNull(message = "Expense date is required")
    private LocalDate expenseDate;

    private String description;
}
