package DoAn.BE.sysadmin.controller;

import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/sysadmin/tenants")
@RequiredArgsConstructor
public class SysAdminTenantController {

    private final CompanyMemberRepository companyMemberRepository;
    private final ProjectRepository projectRepository;

    // [VIEW] Get Users of a specific Tenant
    @GetMapping("/{companyId}/users")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getTenantUsers(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);

        var members = companyMemberRepository.findByCompanyIdWithUserAndRoles(companyId).stream()
                .map(m -> {
                    var map = new java.util.HashMap<String, Object>();
                    map.put("userId", m.getUser().getUserId());
                    map.put("username", m.getUser().getUsername());
                    map.put("email", m.getUser().getEmail() != null ? m.getUser().getEmail() : "");
                    map.put("role", m.getRoles() != null
                            ? m.getRoles().stream().map(Enum::name).collect(Collectors.toList())
                            : java.util.List.of());
                    map.put("joinedAt", m.getJoinedAt() != null ? m.getJoinedAt().toString() : "");
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(members);
    }

    // [VIEW] Get Projects of a specific Tenant
    @GetMapping("/{companyId}/projects")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getTenantProjects(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);

        var projects = projectRepository.findByCompany_CompanyId(companyId).stream()
                .map(p -> Map.of(
                        "projectId", p.getProjectId(),
                        "name", p.getName(),
                        "status", p.getStatus(),
                        "pmName", p.getCreatedBy() != null ? p.getCreatedBy().getFullName() : "N/A"))
                .collect(Collectors.toList());

        return ResponseEntity.ok(projects);
    }

    private void checkSysAdmin(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            throw new DoAn.BE.common.exception.ForbiddenException("Access Denied: System Admin only");
        }
    }
}
