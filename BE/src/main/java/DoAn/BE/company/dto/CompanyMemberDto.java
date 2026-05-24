package DoAn.BE.company.dto;

import DoAn.BE.company.entity.CompanyRole;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class CompanyMemberDto {
    private Long userId;
    private String fullName;
    private String email;
    private String avatarUrl;
    private CompanyRole role;
    @JsonProperty("active")
    private boolean isActive;
    private DoAn.BE.company.entity.UserPermissions permissions;
}
