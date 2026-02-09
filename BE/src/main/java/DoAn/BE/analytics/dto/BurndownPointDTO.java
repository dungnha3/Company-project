package DoAn.BE.analytics.dto;

import java.time.LocalDate;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BurndownPointDTO {
    private LocalDate date;
    private int ideal; // Ideal remaining
    private int actual; // Actual remaining
}
