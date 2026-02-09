package DoAn.BE.sysadmin.dto;

import lombok.Data;

public class SysAdminCompanyDto {

    @Data
    public static class QuotaUpdateRequest {
        private Integer maxEmployees;
        private Integer maxProjects;
        private Long maxStorageBytes;
        private Long userStorageQuotaBytes; // Optional override
    }

    @Data
    public static class FeatureOverrideRequest {
        // Core Modules
        private Boolean hrModuleEnabled;
        private Boolean projectModuleEnabled;
        private Boolean chatModuleEnabled;
        private Boolean aiModuleEnabled;
        private Boolean storageModuleEnabled;

        // HR Sub-features
        private Boolean attendanceEnabled;
        private Boolean leaveEnabled;
        private Boolean salaryEnabled;
        private Boolean contractEnabled;
        private Boolean reviewEnabled;

        // Competitive Features
        private Boolean okrEnabled;
        private Boolean skillsMatrixEnabled;
        private Boolean onboardingEnabled;
        private Boolean resourcePlanningEnabled;
        private Boolean orgChartEnabled;

        // Project Sub-features
        private Boolean timeTrackingEnabled;
        private Boolean analyticsEnabled;
        private Boolean calendarEnabled;
    }
}
