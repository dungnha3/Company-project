package DoAn.BE.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkReviewResponse {
    private int totalRequested;
    private int createdCount;
    private int skippedCount;
    private List<String> createdNames;
    private List<String> skippedNames;
    private List<String> errors;
}
