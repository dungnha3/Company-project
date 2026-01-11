package DoAn.BE.common.controller;

import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.PersonalWorkspaceRepository;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
public class DebugController {

    private final UserRepository userRepository;
    private final PersonalWorkspaceRepository personalWorkspaceRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final jakarta.persistence.EntityManager entityManager;
    private final DoAn.BE.workspace.service.WorkspaceService workspaceService;

    @GetMapping("/workspaces")
    public ResponseEntity<Map<String, Object>> debugWorkspaces(
            @org.springframework.web.bind.annotation.RequestParam(required = false, defaultValue = "admin") String username) {
        Map<String, Object> result = new HashMap<>();

        User currentUser = userRepository.findByUsername(username).orElse(null);

        if (currentUser == null) {
            result.put("error", "User not found: " + username);
            return ResponseEntity.ok(result);
        }

        // Check Personal Workspace
        var personal = personalWorkspaceRepository.findByUser_UserId(currentUser.getUserId());
        result.put("hasPersonalWorkspace", personal.isPresent());
        result.put("personalWorkspaceId", personal.map(p -> p.getWorkspaceId()).orElse(null));

        // Check Company Memberships (Raw)
        var members = companyMemberRepository.findByUser_UserId(currentUser.getUserId()); // Find ALL (ignore is_active
                                                                                          // for debug)
        result.put("rawMembershipsCount", members.size());

        var activeMembers = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(currentUser.getUserId());
        result.put("activeMembershipsCount_NoFilter", activeMembers.size());

        // SIMULATE FILTER
        org.hibernate.Session session = entityManager.unwrap(org.hibernate.Session.class);
        session.enableFilter("tenantFilter").setParameter("companyId", 1L);

        var filteredMembers = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(currentUser.getUserId());
        result.put("activeMembershipsCount_WithFilterOnId1", filteredMembers.size());

        session.disableFilter("tenantFilter");

        session.disableFilter("tenantFilter");

        // TEST WORKSPACE SERVICE
        try {
            var serviceResult = workspaceService.getAllWorkspaces(currentUser);
            result.put("serviceResultCount", serviceResult.size());
            result.put("serviceResultData", serviceResult);
        } catch (Exception e) {
            result.put("serviceError", e.getMessage());
            e.printStackTrace();
        }

        return ResponseEntity.ok(result);
    }
}
