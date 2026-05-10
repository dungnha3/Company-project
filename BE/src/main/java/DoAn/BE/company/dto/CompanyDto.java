package DoAn.BE.company.dto;


import lombok.Data;

public class CompanyDto {

    @Data
    public static class CompanyResponse {
        private Long companyId;
        private String name;
        private String logoUrl;
        private String address;

        private boolean isOwner; // Helper for frontend
        private String role; // Current user's role
        private DoAn.BE.company.entity.UserPermissions permissions; // [NEW] Granular permissions
        private Boolean isActive; // [SAAS] For System Admin UI
    }

    @Data
    public static class CompanyCreateRequest {
        private String name;
        private String description;
        private String logoUrl;
        private String address;
        private String phone;
        private String email;
    }

    @Data
    public static class CompanyUpdateRequest {
        private String name;
        private String logoUrl;
        private String address;
    }

    
}
