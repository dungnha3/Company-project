package DoAn.BE.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceRankingDTO {
    private Long employeeId;
    private Long userId;
    private String employeeName;
    private String employeeAvatar;
    
    // 1. Khối lượng công việc (Quy ra điểm 10)
    private BigDecimal volumeScore; 
    
    // 2. Tốc độ / Tiến độ (Quy ra điểm 10)
    private BigDecimal speedScore;
    
    // Trung bình điểm hệ thống (Hard Skills)
    private BigDecimal systemScore;
    
    // 3. Đánh giá chất lượng (Từ PM Review - Thang điểm 10)
    private BigDecimal qualityScore;
    
    // Tổng hợp (Ví dụ: 50% System + 50% Quality)
    private BigDecimal totalPerformanceScore;
    
    // Thống kê thô để xem chi tiết
    private Integer completedTasks;
    private Integer totalStoryPoints;
    private Integer overdueTasks;
    private Integer lateTasks;
    private Integer reworks;
}
