package DoAn.BE.smart.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmartEstimateDTO {

    private BigDecimal suggestedHours;
    private String confidence; // "high" | "medium" | "low"
    private String method;      // "OLS" | "Heuristic" | "Baseline"
    private String basis;      // short technical basis
    private String explanation; // natural language explanation
    private Integer derivedFromNSamples;
    private Double rSquared;   // R² of the OLS fit (null for non-OLS)
    private String assigneeName;

    public static SmartEstimateDTO noData(String assigneeName) {
        return SmartEstimateDTO.builder()
                .suggestedHours(BigDecimal.valueOf(8.0))
                .confidence("low")
                .method("Baseline")
                .basis("Chưa có data. Dùng industry baseline: weight × 1.6h")
                .explanation("Chưa có dữ liệu lịch sử cho người này. Sử dụng ước tính industry standard: trung bình 1.6 giờ cho mỗi đơn vị weight.")
                .derivedFromNSamples(0)
                .assigneeName(assigneeName)
                .build();
    }

    public static SmartEstimateDTO noAssigneeSelected() {
        return SmartEstimateDTO.builder()
                .suggestedHours(null)
                .confidence(null)
                .method(null)
                .basis("Cần chọn người thực hiện để gợi ý chính xác")
                .explanation("Vui lòng chọn người thực hiện trước. Hệ thống cần biết ai sẽ làm task để đưa ra ước tính chính xác dựa trên lịch sử của họ.")
                .derivedFromNSamples(null)
                .assigneeName(null)
                .build();
    }

    public static SmartEstimateDTO noProjectSelected() {
        return SmartEstimateDTO.builder()
                .suggestedHours(null)
                .confidence(null)
                .method(null)
                .basis("Cần chọn dự án trước")
                .explanation("Vui lòng chọn dự án trước. Hệ thống cần biết project context để phân tích.")
                .derivedFromNSamples(null)
                .assigneeName(null)
                .build();
    }
}
