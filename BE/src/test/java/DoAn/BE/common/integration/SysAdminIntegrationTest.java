package DoAn.BE.common.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import DoAn.BE.auth.service.JwtService;
import DoAn.BE.company.entity.*;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanySettingsRepository;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

// 🛡️ SYSADMIN INTEGRATION TEST
//
// Tests System Admin functionality:
// 1. Access Control: Employee/Admin → /api/sysadmin/** → 403
// 2. SysAdmin CRUD companies
// 3. SysAdmin user management
// 4. SysAdmin tenant view
// 5. SysAdmin global settings
// 6. SysAdmin analytics
// 7. Mass assignment: set isSystemAdmin=true via API
// /
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SuppressWarnings("unused")
public class SysAdminIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private CompanyMemberRepository memberRepository;
    @Autowired
    private CompanySettingsRepository settingsRepository;

    private String employeeToken;
    private String adminToken;
    private String sysAdminToken;
    private Long companyId;
    private Long sysAdminUserId;
    private Long employeeUserId;

    @BeforeAll
    void seedDatabase() {
        // Regular employee
        User employee = userRepository.save(User.builder()
                .username("sys_test_emp").passwordHash("$2a$10$dummy")
                .email("sys_emp@test.com").isActive(true).isDeleted(false)
                .isSystemAdmin(false).build());
        this.employeeUserId = employee.getUserId();

        // Company admin
        User admin = userRepository.save(User.builder()
                .username("sys_test_admin").passwordHash("$2a$10$dummy")
                .email("sys_admin@test.com").isActive(true).isDeleted(false)
                .isSystemAdmin(false).build());

        // System Admin
        User sysAdmin = userRepository.save(User.builder()
                .username("sys_test_sysadmin").passwordHash("$2a$10$dummy")
                .email("sys_sysadmin@test.com").isActive(true).isDeleted(false)
                .isSystemAdmin(true).build());
        this.sysAdminUserId = sysAdmin.getUserId();

        // Company
        Company company = new Company();
        company.setName("SysAdmin Test Corp");
        company.setSlug("sysadmin-test");
        company.setPlan(Plan.PROFESSIONAL);
        company.setIsActive(true);

        CompanySettings settings = new CompanySettings();
        settings.setCompany(company);
        settings.setHrModuleEnabled(true);
        settings.setProjectModuleEnabled(true);
        settings.setChatModuleEnabled(true);
        settings.setStorageModuleEnabled(true);
        settings.setAiModuleEnabled(true);
        settings.setMaxEmployees(50);
        settings.setMaxProjects(20);
        settings.setMaxStorageBytes(1024L * 1024 * 1024);
        settings.setMaxFileUploadBytes(50 * 1024 * 1024L);
        company.setSettings(settings);
        company = companyRepository.save(company);
        this.companyId = company.getCompanyId();

        // Members
        UserPermissions empPerms = new UserPermissions();
        CompanyMember empMember = new CompanyMember();
        empMember.setUser(employee);
        empMember.setCompany(company);
        empMember.setRoles(Set.of(CompanyRole.EMPLOYEE));
        empMember.setPermissions(empPerms);
        empMember.setIsActive(true);
        memberRepository.save(empMember);

        UserPermissions adminPerms = new UserPermissions();
        CompanyMember adminMember = new CompanyMember();
        adminMember.setUser(admin);
        adminMember.setCompany(company);
        adminMember.setRoles(Set.of(CompanyRole.ADMIN));
        adminMember.setPermissions(adminPerms);
        adminMember.setIsActive(true);
        memberRepository.save(adminMember);

        // Tokens
        employeeToken = jwtService.generateToken(employee);
        adminToken = jwtService.generateToken(admin);
        sysAdminToken = jwtService.generateToken(sysAdmin);
    }

    private MvcResult doGet(String url, String token) throws Exception {
        var req = get(url).header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId);
        return mockMvc.perform(req).andReturn();
    }

    private MvcResult doPost(String url, String token, String body) throws Exception {
        var req = post(url).header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON).content(body);
        return mockMvc.perform(req).andReturn();
    }

    private MvcResult doPut(String url, String token, String body) throws Exception {
        var req = put(url).header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON).content(body);
        return mockMvc.perform(req).andReturn();
    }

    private MvcResult doDelete(String url, String token) throws Exception {
        var req = delete(url).header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId);
        return mockMvc.perform(req).andReturn();
    }

    // SysAdmin endpoints don't need X-Company-Id header
    private MvcResult doGetSysAdmin(String url, String token) throws Exception {
        var req = get(url).header("Authorization", "Bearer " + token);
        return mockMvc.perform(req).andReturn();
    }

    private MvcResult doPutSysAdmin(String url, String token, String body) throws Exception {
        var req = put(url).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body);
        return mockMvc.perform(req).andReturn();
    }

    private MvcResult doPostSysAdmin(String url, String token, String body) throws Exception {
        var req = post(url).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body);
        return mockMvc.perform(req).andReturn();
    }

    private MvcResult doDeleteSysAdmin(String url, String token) throws Exception {
        var req = delete(url).header("Authorization", "Bearer " + token);
        return mockMvc.perform(req).andReturn();
    }

    @Nested
    @DisplayName("1. SysAdmin Access Control")
    class AccessControl {

        @Test
        @DisplayName("1.1 Employee → /api/sysadmin/companies → 403")
        void employee_cannotAccessSysadminCompanies() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/companies", employeeToken);
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: Employee accessed sysadmin companies! Status: " + status);
        }

        @Test
        @DisplayName("1.2 Company Admin → /api/sysadmin/companies → 403")
        void companyAdmin_cannotAccessSysadminCompanies() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/companies", adminToken);
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: Company Admin accessed sysadmin! Status: " + status);
        }

        @Test
        @DisplayName("1.3 Employee → /api/sysadmin/users → 403")
        void employee_cannotAccessSysadminUsers() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/users", employeeToken);
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: Employee accessed sysadmin users! Status: " + status);
        }

        @Test
        @DisplayName("1.4 Employee → /api/sysadmin/analytics/stats → 403")
        void employee_cannotAccessSysadminAnalytics() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/analytics/stats", employeeToken);
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: Employee accessed analytics! Status: " + status);
        }

        @Test
        @DisplayName("1.5 Employee → /api/sysadmin/settings → 403")
        void employee_cannotAccessSysadminSettings() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/settings", employeeToken);
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: Employee accessed global settings! Status: " + status);
        }

        @Test
        @DisplayName("1.6 Admin → /api/sysadmin/users/{id}/toggle-status → 403")
        void companyAdmin_cannotToggleUserStatus() throws Exception {
            MvcResult r = doPutSysAdmin("/api/sysadmin/users/" + employeeUserId + "/toggle-status",
                    adminToken, "{}");
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: Company Admin toggled user status! Status: " + status);
        }

        @Test
        @DisplayName("1.7 Admin → /api/sysadmin/companies/{id}/plan?plan=ENTERPRISE → 403")
        void companyAdmin_cannotChangePlan() throws Exception {
            MvcResult r = doPutSysAdmin("/api/sysadmin/companies/" + companyId + "/plan?plan=ENTERPRISE",
                    adminToken, "{}");
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: Company Admin changed plan! Status: " + status);
        }
    }

    @Nested
    @DisplayName("2. SysAdmin Company Management")
    class CompanyManagement {

        @Test
        @DisplayName("2.1 SysAdmin → GET /api/sysadmin/companies → 200")
        void sysAdmin_canListCompanies() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/companies", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot list companies! Status: " + status);
        }

        @Test
        @DisplayName("2.2 SysAdmin → GET /api/sysadmin/companies/{id} → 200")
        void sysAdmin_canGetCompanyById() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/companies/" + companyId, sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot get company! Status: " + status);
        }

        @Test
        @DisplayName("2.3 SysAdmin → GET /api/sysadmin/companies/{id}/settings → 200")
        void sysAdmin_canGetCompanySettings() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/companies/" + companyId + "/settings", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot get settings! Status: " + status);
        }

        @Test
        @DisplayName("2.4 SysAdmin → PUT /api/sysadmin/companies/{id}/status → toggle")
        void sysAdmin_canToggleCompanyStatus() throws Exception {
            MvcResult r = doPutSysAdmin("/api/sysadmin/companies/" + companyId + "/status",
                    sysAdminToken, "{}");
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot toggle company status! Status: " + status);
            // Toggle back
            doPutSysAdmin("/api/sysadmin/companies/" + companyId + "/status", sysAdminToken, "{}");
        }

        @Test
        @DisplayName("2.5 SysAdmin → GET /api/sysadmin/analytics/stats → 200")
        void sysAdmin_canGetAnalyticsStats() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/analytics/stats", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot get analytics! Status: " + status);
            String body = r.getResponse().getContentAsString();
            assertTrue(body.contains("totalUsers"), "🔴 BUG: Analytics missing totalUsers!");
            assertTrue(body.contains("totalCompanies"), "🔴 BUG: Analytics missing totalCompanies!");
        }

        @Test
        @DisplayName("2.6 SysAdmin → GET /api/sysadmin/analytics/growth → 200")
        void sysAdmin_canGetAnalyticsGrowth() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/analytics/growth", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot get growth! Status: " + status);
        }
    }

    @Nested
    @DisplayName("3. SysAdmin User Management")
    class UserManagement {

        @Test
        @DisplayName("3.1 SysAdmin → GET /api/sysadmin/users → 200")
        void sysAdmin_canListUsers() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/users", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot list users! Status: " + status);
        }

        @Test
        @DisplayName("3.2 SysAdmin → GET /api/sysadmin/users?keyword=sys_test → filtered")
        void sysAdmin_canSearchUsers() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/users?keyword=sys_test", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot search users! Status: " + status);
        }

        @Test
        @DisplayName("3.3 SysAdmin → toggle employee status → 200")
        void sysAdmin_canToggleUserStatus() throws Exception {
            MvcResult r = doPutSysAdmin("/api/sysadmin/users/" + employeeUserId + "/toggle-status",
                    sysAdminToken, "{}");
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot toggle user! Status: " + status);
            // Toggle back
            doPutSysAdmin("/api/sysadmin/users/" + employeeUserId + "/toggle-status", sysAdminToken, "{}");
        }

        @Test
        @DisplayName("3.4 SysAdmin → toggle SysAdmin's own status → 403 (self-protect)")
        void sysAdmin_cannotToggleSelfStatus() throws Exception {
            MvcResult r = doPutSysAdmin("/api/sysadmin/users/" + sysAdminUserId + "/toggle-status",
                    sysAdminToken, "{}");
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: SysAdmin can deactivate self! Status: " + status);
        }
    }

    @Nested
    @DisplayName("4. SysAdmin Tenant View")
    class TenantView {

        @Test
        @DisplayName("4.1 SysAdmin → GET /api/sysadmin/tenants/{id}/users → 200")
        void sysAdmin_canViewTenantUsers() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/tenants/" + companyId + "/users", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot view tenant users! Status: " + status);
        }

        @Test
        @DisplayName("4.2 SysAdmin → GET /api/sysadmin/tenants/{id}/projects → 200")
        void sysAdmin_canViewTenantProjects() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/tenants/" + companyId + "/projects", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot view tenant projects! Status: " + status);
        }

        @Test
        @DisplayName("4.3 Employee → /api/sysadmin/tenants/{id}/users → 403")
        void employee_cannotViewTenantUsers() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/tenants/" + companyId + "/users", employeeToken);
            int status = r.getResponse().getStatus();
            assertEquals(403, status, "🔴 SECURITY BUG: Employee saw tenant users! Status: " + status);
        }
    }

    @Nested
    @DisplayName("5. SysAdmin Global Settings")
    class GlobalSettings {

        @Test
        @DisplayName("5.1 SysAdmin → GET /api/sysadmin/settings → 200")
        void sysAdmin_canGetGlobalSettings() throws Exception {
            MvcResult r = doGetSysAdmin("/api/sysadmin/settings", sysAdminToken);
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot get settings! Status: " + status);
        }

        @Test
        @DisplayName("5.2 SysAdmin → PUT /api/sysadmin/settings → 200")
        void sysAdmin_canUpdateGlobalSettings() throws Exception {
            MvcResult r = doPutSysAdmin("/api/sysadmin/settings", sysAdminToken,
                    "{\"test_key\":\"test_value\"}");
            int status = r.getResponse().getStatus();
            assertEquals(200, status, "🔴 BUG: SysAdmin cannot update settings! Status: " + status);
        }
    }

    @Nested
    @DisplayName("6. Mass Assignment Protection")
    class MassAssignment {

        @Test
        @DisplayName("6.1 Register with isSystemAdmin=true → must NOT become sysadmin")
        void register_withSysAdminFlag_ignored() throws Exception {
            String body = """
                    {"username":"hacker_register","password":"Hack1234!","email":"hacker@test.com",
                     "isSystemAdmin":true}""";
            MvcResult r = mockMvc.perform(post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
            int status = r.getResponse().getStatus();
            // Register should succeed (200/201) but user should NOT be sysadmin
            if (status == 200 || status == 201) {
                User hacker = userRepository.findByUsername("hacker_register").orElse(null);
                assertTrue(hacker != null, "User not created?");
                assertFalse(hacker.isSystemAdminAccount(), "🔴 CRITICAL SECURITY BUG: Mass assignment → isSystemAdmin=true via register!");
            }
            // If 400/409 (validation/duplicate), that's OK too
        }

        @Test
        @DisplayName("6.2 Update profile with isSystemAdmin=true → must NOT escalate")
        void updateProfile_withSysAdminFlag_ignored() throws Exception {
            String body = "{\"isSystemAdmin\":true}";
            MvcResult r = doPut("/api/users/profile", employeeToken, body);
            // After update, check DB
            User emp = userRepository.findById(employeeUserId).orElse(null);
            assertTrue(emp != null);
            assertFalse(emp.isSystemAdminAccount(), "🔴 CRITICAL SECURITY BUG: Mass assignment → isSystemAdmin=true via profile update!");
        }
    }
}
