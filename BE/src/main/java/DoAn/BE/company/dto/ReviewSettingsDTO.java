package DoAn.BE.company.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSettingsDTO {

    private boolean autoReviewEnabled;
    private String reviewCycleType; // QUARTERLY, MONTHLY, MANUAL
    private String lastReviewAutoCreate;
}
