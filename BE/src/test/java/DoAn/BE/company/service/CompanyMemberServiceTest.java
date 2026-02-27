package DoAn.BE.company.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.company.dto.CompanyMemberDto;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.UserPermissions;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompanyMember Service Unit Tests")
class CompanyMemberServiceTest {

    @Mock
    private CompanyMemberRepository memberRepository;
    @Mock
    private RoleTemplateService roleTemplateService;
    @Mock
    private AccessControlService accessControlService;

    @InjectMocks
    private CompanyMemberService companyMemberService;

    private User testUser;
    private User targetUser;
    private CompanyMember testMember;
    private CompanyMember ownerMember;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("admin");
        testUser.setEmail("admin@test.com");

        targetUser = new User();
        targetUser.setUserId(2L);
        targetUser.setUsername("employee");
        targetUser.setEmail("employee@test.com");

        testMember = new CompanyMember();
        testMember.setUser(targetUser);
        testMember.setRoles(new HashSet<>(Set.of(CompanyRole.EMPLOYEE)));
        testMember.setIsActive(true);
        testMember.setPermissions(new UserPermissions());

        ownerMember = new CompanyMember();
        ownerMember.setUser(testUser);
        ownerMember.setRoles(new HashSet<>(Set.of(CompanyRole.OWNER)));
        ownerMember.setIsActive(true);
    }
    // GET MEMBERS
    @Nested
    @DisplayName("Get Members")
    class GetMembersTests {

        @Test
        @DisplayName("Get members returns DTO list")
        void getMembers_success() {
            when(memberRepository.findByCompany_CompanyId(1L)).thenReturn(List.of(testMember));

            List<CompanyMemberDto> result = companyMemberService.getMembers(1L);

            assertEquals(1, result.size());
            assertEquals(targetUser.getUserId(), result.get(0).getUserId());
            verify(accessControlService).checkPermission(1L, CompanyRole.EMPLOYEE);
        }

        @Test
        @DisplayName("Get members with null company ID throws BadRequestException")
        void getMembers_nullCompanyId() {
            assertThrows(BadRequestException.class,
                    () -> companyMemberService.getMembers(null));
        }
    }
    // CHANGE ROLE
    @Nested
    @DisplayName("Change Role")
    class ChangeRoleTests {

        @Test
        @DisplayName("Change role succeeds and resets permissions")
        void changeRole_success() {
            UserPermissions newPerms = new UserPermissions();
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                    .thenReturn(Optional.of(testMember));
            when(roleTemplateService.getTemplate(any())).thenReturn(newPerms);

            companyMemberService.changeRole(1L, 2L, CompanyRole.MANAGER_HR);

            assertTrue(testMember.getRoles().contains(CompanyRole.MANAGER_HR));
            assertFalse(testMember.getRoles().contains(CompanyRole.EMPLOYEE));
            verify(memberRepository).save(testMember);
            verify(roleTemplateService).getTemplate(any());
        }

        @Test
        @DisplayName("Cannot change Owner role throws ForbiddenException")
        void changeRole_owner_forbidden() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                    .thenReturn(Optional.of(ownerMember));

            assertThrows(ForbiddenException.class,
                    () -> companyMemberService.changeRole(1L, 1L, CompanyRole.ADMIN));
        }

        @Test
        @DisplayName("Cannot assign OWNER role directly throws ForbiddenException")
        void changeRole_assignOwner_forbidden() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                    .thenReturn(Optional.of(testMember));

            assertThrows(ForbiddenException.class,
                    () -> companyMemberService.changeRole(1L, 2L, CompanyRole.OWNER));
        }

        @Test
        @DisplayName("Change role with null params throws BadRequestException")
        void changeRole_nullParams() {
            assertThrows(BadRequestException.class,
                    () -> companyMemberService.changeRole(null, 2L, CompanyRole.ADMIN));
        }

        @Test
        @DisplayName("Change role - member not found throws ResourceNotFoundException")
        void changeRole_memberNotFound() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(999L, 1L))
                    .thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> companyMemberService.changeRole(1L, 999L, CompanyRole.ADMIN));
        }
    }
    // REMOVE MEMBER
    @Nested
    @DisplayName("Remove Member")
    class RemoveMemberTests {

        @Test
        @DisplayName("Remove member succeeds")
        void removeMember_success() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                    .thenReturn(Optional.of(testMember));

            companyMemberService.removeMember(1L, 2L);

            verify(memberRepository).delete(testMember);
        }

        @Test
        @DisplayName("Cannot remove Owner throws ForbiddenException")
        void removeMember_owner_forbidden() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                    .thenReturn(Optional.of(ownerMember));

            assertThrows(ForbiddenException.class,
                    () -> companyMemberService.removeMember(1L, 1L));
        }

        @Test
        @DisplayName("Remove member with null params throws BadRequestException")
        void removeMember_nullParams() {
            assertThrows(BadRequestException.class,
                    () -> companyMemberService.removeMember(null, null));
        }
    }
    // LEAVE COMPANY
    @Nested
    @DisplayName("Leave Company")
    class LeaveCompanyTests {

        @Test
        @DisplayName("Employee can leave company")
        void leaveCompany_success() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                    .thenReturn(Optional.of(testMember));

            companyMemberService.leaveCompany(1L, targetUser);

            verify(memberRepository).delete(testMember);
        }

        @Test
        @DisplayName("Owner cannot leave company throws ForbiddenException")
        void leaveCompany_owner_forbidden() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                    .thenReturn(Optional.of(ownerMember));

            assertThrows(ForbiddenException.class,
                    () -> companyMemberService.leaveCompany(1L, testUser));
        }

        @Test
        @DisplayName("Leave company - not a member throws ResourceNotFoundException")
        void leaveCompany_notMember() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                    .thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class,
                    () -> companyMemberService.leaveCompany(1L, targetUser));
        }

        @Test
        @DisplayName("Leave company with null params throws BadRequestException")
        void leaveCompany_nullParams() {
            assertThrows(BadRequestException.class,
                    () -> companyMemberService.leaveCompany(null, testUser));
        }
    }
    // UPDATE PERMISSION
    @Nested
    @DisplayName("Update Permission")
    class UpdatePermissionTests {

        @Test
        @DisplayName("Update specific permission succeeds")
        void updatePermission_success() {
            UserPermissions perms = new UserPermissions();
            testMember.setPermissions(perms);
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                    .thenReturn(Optional.of(testMember));

            companyMemberService.updatePermission(1L, 2L, "HR.VIEW_LIST", true);

            assertTrue(testMember.getPermissions().isHrViewList());
            verify(memberRepository).save(testMember);
        }

        @Test
        @DisplayName("Update permission on Owner throws ForbiddenException")
        void updatePermission_owner_forbidden() {
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                    .thenReturn(Optional.of(ownerMember));

            assertThrows(ForbiddenException.class,
                    () -> companyMemberService.updatePermission(1L, 1L, "HR.VIEW_LIST", true));
        }

        @Test
        @DisplayName("Update with invalid permission key throws BadRequestException")
        void updatePermission_invalidKey() {
            UserPermissions perms = new UserPermissions();
            testMember.setPermissions(perms);
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                    .thenReturn(Optional.of(testMember));

            assertThrows(BadRequestException.class,
                    () -> companyMemberService.updatePermission(1L, 2L, "NONEXISTENT.KEY", true));
        }

        @Test
        @DisplayName("Update permission with null permissions initializes from template")
        void updatePermission_nullPerms_fallback() {
            testMember.setPermissions(null);
            UserPermissions templatePerms = new UserPermissions();
            when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                    .thenReturn(Optional.of(testMember));
            when(roleTemplateService.getTemplate(any())).thenReturn(templatePerms);

            companyMemberService.updatePermission(1L, 2L, "HR.VIEW_LIST", true);

            assertNotNull(testMember.getPermissions());
            verify(roleTemplateService).getTemplate(any());
            verify(memberRepository).save(testMember);
        }
    }
}
