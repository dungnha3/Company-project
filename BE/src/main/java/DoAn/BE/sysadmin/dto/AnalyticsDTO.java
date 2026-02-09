package DoAn.BE.sysadmin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AnalyticsDTO {

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SystemStats {
        private long totalUsers;
        private long totalCompanies;
        private long activeCompanies;
        private long totalProjects;
        private double estimatedRevenue; // Placeholder
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class GrowthData {
        private String month;
        private long newCompanies;
        private long newUsers;
    }
}
