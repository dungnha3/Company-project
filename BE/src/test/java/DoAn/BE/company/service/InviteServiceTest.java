package DoAn.BE.company.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.service.QuotaService;
import DoAn.BE.company.dto.InviteRequest;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.UserPermissions;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Invite Service Unit Tests")
class InviteServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CompanyMemberRepository memberRepository;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private EmailNotificationService emailService;
    @Mock
    private RoleTemplateService roleTemplateService;
    @Mock
    private QuotaService quotaService;

    @InjectMocks
    private InviteService inviteService;

    private Company testCompany;
    private User existingUser;

    @BeforeEach
    void setUp() {
        testCompany = new Company();
        testCompany.setCompanyId(1L);
        testCompany.setName("Test Company");

        existingUser = new User();
        existingUser.setUserId(10L);
        existingUser.setEmail("existing@test.com");
        existingUser.setUsername("existing");
    }
    // INVITE EXISTING USER
    @Nested
    @DisplayName("Invite Existing User")
    class InviteExistingTests {

        @Test
        @DisplayName("Invite existing user succeeds")
        void inviteUser_existing_success() {
            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCompanyId).thenReturn(1L);

                InviteRequest request = new InviteRequest();
                request.setEmail("existing@test.com");
                request.setRole(CompanyRole.EMPLOYEE);

                when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
                when(userRepository.findByEmail("existing@test.com")).thenReturn(Optional.of(existingUser));
                when(memberRepository.existsByUserAndCompany(existingUser, testCompany)).thenReturn(false);
                when(roleTemplateService.getTemplate(any())).thenReturn(new UserPermissions());

                inviteService.inviteUser(request);

                ArgumentCaptor<CompanyMember> captor = ArgumentCaptor.forClass(CompanyMember.class);
                verify(memberRepository).save(captor.capture());
                CompanyMember saved = captor.getValue();
                assertEquals(existingUser, saved.getUser());
                assertEquals(testCompany, saved.getCompany());
                assertTrue(saved.getIsActive());
                verify(emailService).sendSimpleEmail(eq("existing@test.com"), anyString(), anyString());
            }
        }

        @Test
        @DisplayName("Invite existing user who is already a member throws BadRequestException")
        void inviteUser_existing_alreadyMember() {
            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCompanyId).thenReturn(1L);

                InviteRequest request = new InviteRequest();
                request.setEmail("existing@test.com");
                request.setRole(CompanyRole.EMPLOYEE);

                when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
                when(userRepository.findByEmail("existing@test.com")).thenReturn(Optional.of(existingUser));
                when(memberRepository.existsByUserAndCompany(existingUser, testCompany)).thenReturn(true);

                assertThrows(BadRequestException.class, () -> inviteService.inviteUser(request));
                verify(memberRepository, never()).save(any());
            }
        }
    }
    // INVITE NEW USER (SHADOW)
    @Nested
    @DisplayName("Invite New User")
    class InviteNewTests {

        @Test
        @DisplayName("Invite new user creates shadow user and inactive membership")
        void inviteUser_new_success() {
            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCompanyId).thenReturn(1L);

                InviteRequest request = new InviteRequest();
                request.setEmail("new@test.com");
                request.setRole(CompanyRole.EMPLOYEE);

                when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
                when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
                when(roleTemplateService.getTemplate(any())).thenReturn(new UserPermissions());

                inviteService.inviteUser(request);

                // Shadow user created and saved
                ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
                verify(userRepository).save(userCaptor.capture());
                User shadowUser = userCaptor.getValue();
                assertEquals("new@test.com", shadowUser.getEmail());
                assertEquals(User.UserStatus.PENDING_ACTIVATION, shadowUser.getStatus());
                assertNotNull(shadowUser.getActivationToken());
                assertFalse(shadowUser.getIsActive());

                // Membership created as inactive
                ArgumentCaptor<CompanyMember> memberCaptor = ArgumentCaptor.forClass(CompanyMember.class);
                verify(memberRepository).save(memberCaptor.capture());
                assertFalse(memberCaptor.getValue().getIsActive());

                // Activation email sent
                verify(emailService).sendSimpleEmail(eq("new@test.com"), anyString(), anyString());
            }
        }
    }
    // VALIDATION
    @Nested
    @DisplayName("Validation")
    class ValidationTests {

        @Test
        @DisplayName("Invite with null email throws BadRequestException")
        void inviteUser_nullEmail() {
            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCompanyId).thenReturn(1L);

                InviteRequest request = new InviteRequest();
                request.setEmail(null);

                assertThrows(BadRequestException.class, () -> inviteService.inviteUser(request));
            }
        }

        @Test
        @DisplayName("Invite with invalid email throws BadRequestException")
        void inviteUser_invalidEmail() {
            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCompanyId).thenReturn(1L);

                InviteRequest request = new InviteRequest();
                request.setEmail("not-an-email");

                assertThrows(BadRequestException.class, () -> inviteService.inviteUser(request));
            }
        }

        @Test
        @DisplayName("Invite with null company context throws BadRequestException")
        void inviteUser_nullCompany() {
            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCompanyId).thenReturn(null);

                InviteRequest request = new InviteRequest();
                request.setEmail("test@example.com");

                assertThrows(BadRequestException.class, () -> inviteService.inviteUser(request));
            }
        }

        @Test
        @DisplayName("Invite with null role defaults to EMPLOYEE")
        void inviteUser_nullRole_defaults() {
            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCompanyId).thenReturn(1L);

                InviteRequest request = new InviteRequest();
                request.setEmail("new@test.com");
                request.setRole(null); // should default to EMPLOYEE

                when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
                when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
                when(roleTemplateService.getTemplate(any())).thenReturn(new UserPermissions());

                inviteService.inviteUser(request);

                // Verify role was set to EMPLOYEE
                ArgumentCaptor<CompanyMember> captor = ArgumentCaptor.forClass(CompanyMember.class);
                verify(memberRepository).save(captor.capture());
                assertTrue(captor.getValue().getRoles().contains(CompanyRole.EMPLOYEE));
            }
        }
    }
}
