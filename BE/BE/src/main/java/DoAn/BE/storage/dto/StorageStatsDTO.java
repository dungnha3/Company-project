package DoAn.BE.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StorageStatsDTO {
    private Long totalFiles;
    private Long totalFolders;
    private Long totalSize;
    private String totalSizeFormatted;
    private Long quotaLimit;
    private String quotaLimitFormatted;
    private Long remainingQuota;
    private String remainingQuotaFormatted;
    private Double usagePercentage;
    private Long fileTypes; // Number of distinct file types
}
