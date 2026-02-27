package DoAn.BE.common.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Set;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;

// Tests for AccessControlService — verifies that the granular permission system
// correctly enforces access control for HR, Salary, Leave, and Project
// operations.
// /
@ExtendWith(MockitoExtension.class)
public class AccessControlServiceTest {

    @Mock
    private CompanyMemberRepository memberRepository;
    @Mock
    private PermissionService permissionService;

    @InjectMocks
    private AccessControlService accessControlService;

    private User adminUser;
    private User regularUser;
    private CompanyMember adminMember;
    private CompanyMember regularMember;
    private MockedStatic<TenantContext> tenantMock;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setUserId(1L);
        adminUser.setUsername("admin");

        regularUser = new User();
        regularUser.setUserId(2L);
        regularUser.setUsername("employee");

        adminMember = new CompanyMember();
        adminMember.setUser(adminUser);
        adminMember.setRoles(Set.of(CompanyRole.ADMIN));

        regularMember = new CompanyMember();
        regularMember.setUser(regularUser);
        regularMember.setRoles(Set.of(CompanyRole.EMPLOYEE));

        tenantMock = mockStatic(TenantContext.class);
        tenantMock.when(TenantContext::getCompanyId).thenReturn(1L);
    }

    @AfterEach
    void tearDown() {
        tenantMock.close();
        SecurityContextHolder.clearContext();
        AccessControlService.clearCache();
    }

    // ===== Admin bypass =====

    @Test
    void checkAdminPermission_AdminUser_NoException() {
        setCurrentUser(adminUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                .thenReturn(Optional.of(adminMember));

        assertDoesNotThrow(() -> accessControlService.checkAdminPermission(adminUser));
    }

    @Test
    void checkAdminPermission_RegularUser_ThrowsForbidden() {
        setCurrentUser(regularUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                .thenReturn(Optional.of(regularMember));

        assertThrows(ForbiddenException.class,
                () -> accessControlService.checkAdminPermission(regularUser));
    }

    // ===== Ownership checks =====

    @Test
    void checkOwnership_SameUser_NoException() {
        setCurrentUser(regularUser);

        assertDoesNotThrow(
                () -> accessControlService.checkOwnership(regularUser, 2L, "Not your data"));
    }

    @Test
    void checkOwnership_DifferentUser_NoAdmin_ThrowsForbidden() {
        setCurrentUser(regularUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                .thenReturn(Optional.of(regularMember));

        assertThrows(ForbiddenException.class,
                () -> accessControlService.checkOwnership(regularUser, 3L, "Not your data"));
    }

    @Test
    void checkOwnership_DifferentUser_Admin_NoException() {
        setCurrentUser(adminUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                .thenReturn(Optional.of(adminMember));

        assertDoesNotThrow(
                () -> accessControlService.checkOwnership(adminUser, 3L, "Not your data"));
    }

    @Test
    void checkOwnership_NullUser_ThrowsForbidden() {
        assertThrows(ForbiddenException.class,
                () -> accessControlService.checkOwnership(null, 1L, "Not your data"));
    }

    // ===== isOwnerOrAdmin =====

    @Test
    void isOwnerOrAdmin_AdminUser_ReturnsTrue() {
        setCurrentUser(adminUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                .thenReturn(Optional.of(adminMember));

        assertTrue(accessControlService.isOwnerOrAdmin());
    }

    @Test
    void isOwnerOrAdmin_RegularUser_ReturnsFalse() {
        setCurrentUser(regularUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                .thenReturn(Optional.of(regularMember));

        assertFalse(accessControlService.isOwnerOrAdmin());
    }

    @Test
    void isOwnerOrAdmin_NoMember_ReturnsFalse() {
        setCurrentUser(regularUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                .thenReturn(Optional.empty());

        assertFalse(accessControlService.isOwnerOrAdmin());
    }

    // ===== canUseChat =====

    @Test
    void canUseChat_ActiveMember_ReturnsTrue() {
        setCurrentUser(regularUser);
        regularUser.setIsActive(true);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                .thenReturn(Optional.of(regularMember));

        assertTrue(accessControlService.canUseChat(regularUser));
    }

    @Test
    void canUseChat_InactiveUser_ReturnsFalse() {
        regularUser.setIsActive(false);
        assertFalse(accessControlService.canUseChat(regularUser));
    }

    @Test
    void canUseChat_NullUser_ReturnsFalse() {
        assertFalse(accessControlService.canUseChat(null));
    }

    // ===== checkPermission with CompanyRole =====

    @Test
    void checkPermission_AdminUser_AnyRole_NoException() {
        setCurrentUser(adminUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                .thenReturn(Optional.of(adminMember));

        assertDoesNotThrow(() -> accessControlService.checkPermission(1L, CompanyRole.MANAGER_HR));
    }

    @Test
    void checkPermission_NoMember_ThrowsForbidden() {
        setCurrentUser(regularUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(2L, 1L))
                .thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class,
                () -> accessControlService.checkPermission(1L, CompanyRole.ADMIN));
    }

    // ===== getCurrentUser edge cases =====

    @Test
    void getCurrentUser_NoAuth_ReturnsNull() {
        SecurityContextHolder.clearContext();
        assertNull(accessControlService.getCurrentUser());
    }

    @Test
    void getCurrentUser_WithUser_ReturnsUser() {
        setCurrentUser(adminUser);
        assertEquals(adminUser, accessControlService.getCurrentUser());
    }

    // ===== Thread-local cache =====

    @Test
    void clearCache_RemovesCachedMember() {
        setCurrentUser(adminUser);
        when(memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L))
                .thenReturn(Optional.of(adminMember));

        accessControlService.getCurrentMember();
        AccessControlService.clearCache();
        accessControlService.getCurrentMember();

        verify(memberRepository, times(2))
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(1L, 1L);
    }

    // ===== Helper =====

    private void setCurrentUser(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, java.util.Collections.emptyList()));
    }
}
