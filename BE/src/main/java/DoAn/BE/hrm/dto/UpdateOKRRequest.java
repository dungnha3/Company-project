package DoAn.BE.hrm.dto;

import DoAn.BE.hrm.entity.OKR;
import lombok.Data;
import java.util.List;

@Data
public class UpdateOKRRequest {

    private String title;

    private String description;

    private String period;

    private OKR.OKRStatus status;

    private List<KeyResultUpdateRequest> keyResults;

    @Data
    public static class KeyResultUpdateRequest {
        private Long id;
        private String title;
        private Double current;
    }
}
