package DoAn.BE.sysadmin.dto;

import lombok.Data;

public class SysAdminCompanyDto {



    @Data
    public static class FeatureOverrideRequest {
        // Core Modules
        private Boolean hrModuleEnabled;
        private Boolean projectModuleEnabled;

        // HR Sub-features
        private Boolean leaveEnabled;
        private Boolean reviewEnabled;
        private Boolean resourcePlanningEnabled;

        // Project Sub-features
        private Boolean timeTrackingEnabled;
        private Boolean analyticsEnabled;
        private Boolean calendarEnabled;
    }
}
