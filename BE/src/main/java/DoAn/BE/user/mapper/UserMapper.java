package DoAn.BE.user.mapper;

import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class UserMapper {

    public UserMapper() {
    }

    // [Convert User entity to UserDTO] (Role: System)
    public UserDTO toDTO(User user) {
        if (user == null) {
            return null;
        }

        UserDTO dto = new UserDTO();
        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setAvatarUrl(user.getAvatarUrl());

        // [SAAS] Set System Admin flag
        dto.setIsSystemAdmin(user.getIsSystemAdmin());

        // Lấy role từ CompanyMember trong context hiện tại
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();

        try {
            if (companyId != null && user.getMemberships() != null) {
                user.getMemberships().stream()
                        .filter(m -> m.getCompany().getCompanyId().equals(companyId)
                                && Boolean.TRUE.equals(m.getIsActive()))
                        .findFirst()
                        .ifPresentOrElse(member -> {
                            // Dùng CompanyRole trực tiếp
                            CompanyRole primaryRole = member.getRoles().stream().findFirst()
                                    .orElse(CompanyRole.EMPLOYEE);
                            dto.setRole(primaryRole);
                        }, () -> dto.setRole(CompanyRole.EMPLOYEE));
            } else {
                dto.setRole(CompanyRole.EMPLOYEE);
            }

            // [SAAS] Map all company memberships for System Admin UI
            if (user.getMemberships() != null && !user.getMemberships().isEmpty()) {
                List<UserDTO.CompanyMembershipInfo> memberships = user.getMemberships().stream()
                        .map(m -> new UserDTO.CompanyMembershipInfo(
                                m.getCompany().getCompanyId(),
                                m.getCompany().getName(),
                                m.getRoles().stream().findFirst().map(Enum::name).orElse(null),
                                m.getIsActive()))
                        .collect(Collectors.toList());
                dto.setCompanyMemberships(memberships);
            }
        } catch (org.hibernate.LazyInitializationException e) {
            // Memberships not loaded - set defaults
            dto.setRole(CompanyRole.EMPLOYEE);
            dto.setCompanyMemberships(null);
        }

        dto.setIsActive(user.getIsActive());
        dto.setIsOnline(user.getIsOnline());
        dto.setLastSeen(user.getLastSeen());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setLastLogin(user.getLastLogin());

        return dto;
    }

    // [Convert list of User entities to list of UserDTOs] (Role: System)
    public List<UserDTO> toDTOList(List<User> users) {
        if (users == null) {
            return null;
        }

        return users.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
