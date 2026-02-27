package DoAn.BE.common.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Set;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;

import DoAn.BE.auth.service.JwtService;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.entity.UserPermissions;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanySettingsRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import static org.junit.jupiter.api.Assertions.*;

// 🔐 EXHAUSTIVE Permission Integration Tests
//
// Test NHƯ MỘT QA TESTER CHUYÊN NGHIỆP:
// - 5 loại user: NoToken, Employee, Admin, SysAdmin, Outsider
// - Test TỪNG endpoint trong hệ thống
// - Test feature flag toggle (bật/tắt → kiểm tra lại)
// - Test tenant isolation (user công ty A truy cập dữ liệu công ty B)
//
// Cách đọc kết quả test:
// - PASS = hệ thống hoạt động đúng (chặn/cho phép đúng role)
// - FAIL = BUG! endpoint cho phép/chặn sai
// /
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class PermissionIntegrationTest {

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
    @Autowired
    private CacheManager cacheManager;

    // ===== TEST DATA =====
    private Long companyId;
    private String employeeToken; // User thường, thuộc company, có đầy đủ permissions
    private String adminToken; // Admin company
    private String sysAdminToken; // System Admin (admin toàn hệ thống)
    private String outsiderToken; // User khác, KHÔNG thuộc company

    @BeforeAll
    void seedDatabase() {
        // === Users ===
        User employee = userRepository.save(User.builder()
                .username("test_employee").passwordHash("$2a$10$dummy")
                .email("emp@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

        User admin = userRepository.save(User.builder()
                .username("test_admin").passwordHash("$2a$10$dummy")
                .email("admin@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

        User sysAdmin = userRepository.save(User.builder()
                .username("test_sysadmin").passwordHash("$2a$10$dummy")
                .email("sys@test.com").isActive(true).isDeleted(false).isSystemAdmin(true).build());

        User outsider = userRepository.save(User.builder()
                .username("test_outsider").passwordHash("$2a$10$dummy")
                .email("out@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

        // === Company + Settings (cascade) ===
        Company company = new Company();
        company.setName("Test Corp");
        company.setSlug("test-corp");
        company.setPlan(Plan.PROFESSIONAL);
        company.setIsActive(true);

        CompanySettings settings = new CompanySettings();
        settings.setCompany(company);
        settings.setHrModuleEnabled(true);
        settings.setProjectModuleEnabled(true);
        settings.setChatModuleEnabled(true);
        settings.setStorageModuleEnabled(true);
        settings.setAiModuleEnabled(true);
        settings.setAttendanceEnabled(true);
        settings.setLeaveEnabled(true);
        settings.setSalaryEnabled(true);
        settings.setContractEnabled(true);
        settings.setReviewEnabled(true);
        settings.setOkrEnabled(true);
        settings.setSkillsMatrixEnabled(true);
        settings.setOnboardingEnabled(true);
        settings.setMaxEmployees(50);
        settings.setMaxProjects(20);
        settings.setMaxStorageBytes(1024L * 1024 * 1024);
        settings.setMaxFileUploadBytes(50 * 1024 * 1024L);
        company.setSettings(settings);
        company = companyRepository.save(company);
        this.companyId = company.getCompanyId();

        // === UserPermissions cho Employee (bật TẤT CẢ quyền) ===
        UserPermissions empPerms = new UserPermissions();
        empPerms.setHrViewList(true);
        empPerms.setHrEditProfile(true);
        empPerms.setHrManageContracts(true);
        empPerms.setHrManageReviews(true);
        empPerms.setSalaryView(true);
        empPerms.setSalaryCalculate(true);
        empPerms.setSalaryApprove(true);
        empPerms.setLeaveApprove(true);
        empPerms.setLeaveViewAll(true);
        empPerms.setAttendanceViewAll(true);
        empPerms.setAttendanceEdit(true);
        empPerms.setProjectCreate(true);
        empPerms.setProjectManageAll(true);
        empPerms.setProjectDelete(true);
        empPerms.setChatCreateGroup(true);
        empPerms.setStorageUpload(true);

        // === Members ===
        CompanyMember empMember = new CompanyMember();
        empMember.setUser(employee);
        empMember.setCompany(company);
        empMember.setRoles(Set.of(CompanyRole.EMPLOYEE));
        empMember.setPermissions(empPerms);
        empMember.setIsActive(true);
        memberRepository.save(empMember);

        CompanyMember adminMember = new CompanyMember();
        adminMember.setUser(admin);
        adminMember.setCompany(company);
        adminMember.setRoles(Set.of(CompanyRole.ADMIN));
        adminMember.setIsActive(true);
        memberRepository.save(adminMember);

        // sysAdmin cũng cần là member để pass TenantFilter
        CompanyMember sysMember = new CompanyMember();
        sysMember.setUser(sysAdmin);
        sysMember.setCompany(company);
        sysMember.setRoles(Set.of(CompanyRole.ADMIN));
        sysMember.setIsActive(true);
        memberRepository.save(sysMember);

        // outsider KHÔNG được thêm vào company

        // === JWT Tokens ===
        employeeToken = jwtService.generateToken(employee, companyId, CompanyRole.EMPLOYEE);
        adminToken = jwtService.generateToken(admin, companyId, CompanyRole.ADMIN);
        sysAdminToken = jwtService.generateToken(sysAdmin, companyId, CompanyRole.ADMIN);
        outsiderToken = jwtService.generateToken(outsider, companyId, CompanyRole.EMPLOYEE);
    }

    // ===== HELPER METHODS =====

    // Evict settings cache — cần gọi sau khi thay đổi settings trong DB
    private void evictSettingsCache() {
        var cache = cacheManager.getCache("companySettings");
        if (cache != null) {
            cache.clear();
        }
    }

    // GET request không token
    private void assertNoToken(String url, ResultMatcher status) throws Exception {
        mockMvc.perform(get(url).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status);
    }

    // GET request với token + company header
    private void assertWithToken(String url, String token, ResultMatcher status) throws Exception {
        mockMvc.perform(get(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status);
    }

    // POST request với token + company header
    private void assertPostWithToken(String url, String token, String body, ResultMatcher status) throws Exception {
        mockMvc.perform(post(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status);
    }
    // 🔒 NHÓM 1: AUTHENTICATION — Chưa login / Token giả

    @Test
    @DisplayName("1.1 No token → /api/employees → chặn")
    void auth_noToken_employees() throws Exception {
        assertNoToken("/api/employees", status().is4xxClientError());
    }

    @Test
    @DisplayName("1.2 No token → /api/projects → chặn")
    void auth_noToken_projects() throws Exception {
        assertNoToken("/api/projects", status().is4xxClientError());
    }

    @Test
    @DisplayName("1.3 No token → /api/chat/rooms → chặn")
    void auth_noToken_chatrooms() throws Exception {
        assertNoToken("/api/chat/rooms", status().is4xxClientError());
    }

    @Test
    @DisplayName("1.4 No token → /api/storage/files/my-files → chặn")
    void auth_noToken_storage() throws Exception {
        assertNoToken("/api/storage/files/my-files", status().is4xxClientError());
    }

    @Test
    @DisplayName("1.5 No token → /api/sysadmin/companies → chặn")
    void auth_noToken_sysadmin() throws Exception {
        assertNoToken("/api/sysadmin/companies", status().is4xxClientError());
    }

    @Test
    @DisplayName("1.6 No token → /api/audit-logs → chặn")
    void auth_noToken_auditLogs() throws Exception {
        assertNoToken("/api/audit-logs", status().is4xxClientError());
    }

    @Test
    @DisplayName("1.7 Fake token → chặn")
    void auth_fakeToken() throws Exception {
        mockMvc.perform(get("/api/employees")
                .header("Authorization", "Bearer totally.fake.token")
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("1.8 Public endpoint: POST /api/auth/login → không bị 401/403")
    void auth_publicLogin_noAuth() throws Exception {
        // Public endpoint — phải cho phép truy cập (có thể 400 do body rỗng)
        int s = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andReturn().getResponse().getStatus();
        assertTrue(s != 401 && s != 403, "Public login should not return 401/403, got: " + s);
    }

    @Test
    @DisplayName("1.9 Public endpoint: POST /api/auth/register → không bị 401/403")
    void auth_publicRegister_noAuth() throws Exception {
        int s = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andReturn().getResponse().getStatus();
        assertTrue(s != 401 && s != 403, "Public register should not return 401/403, got: " + s);
    }
    // 🏢 NHÓM 2: TENANT ISOLATION — Outsider truy cập company khác

    @Test
    @DisplayName("2.1 Outsider → /api/employees → 403")
    void tenant_outsider_employees() throws Exception {
        assertWithToken("/api/employees", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.2 Outsider → /api/departments → 403")
    void tenant_outsider_departments() throws Exception {
        assertWithToken("/api/departments", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.3 Outsider → /api/projects → 403")
    void tenant_outsider_projects() throws Exception {
        assertWithToken("/api/projects", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.4 Outsider → /api/chat/rooms → 403")
    void tenant_outsider_chat() throws Exception {
        assertWithToken("/api/chat/rooms", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.5 Outsider → /api/storage/files/my-files → 403")
    void tenant_outsider_storage() throws Exception {
        assertWithToken("/api/storage/files/my-files", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.6 Outsider → /api/attendance → 403")
    void tenant_outsider_attendance() throws Exception {
        assertWithToken("/api/attendance", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.7 Outsider → /api/leave-requests → 403")
    void tenant_outsider_leave() throws Exception {
        assertWithToken("/api/leave-requests", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.8 Outsider → /api/salaries → 403")
    void tenant_outsider_salary() throws Exception {
        assertWithToken("/api/salaries", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.9 Outsider → /api/contracts → 403")
    void tenant_outsider_contracts() throws Exception {
        assertWithToken("/api/contracts", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.10 Outsider → /api/reviews → 403")
    void tenant_outsider_reviews() throws Exception {
        assertWithToken("/api/reviews", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.11 Outsider → /api/okrs → 403")
    void tenant_outsider_okrs() throws Exception {
        assertWithToken("/api/okrs", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.12 Outsider → /api/skills → 403")
    void tenant_outsider_skills() throws Exception {
        assertWithToken("/api/skills", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.13 Outsider → /api/notifications → 403")
    void tenant_outsider_notifications() throws Exception {
        assertWithToken("/api/notifications", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.14 Outsider → /api/calendar/events → 403")
    void tenant_outsider_calendar() throws Exception {
        assertWithToken("/api/calendar/events", outsiderToken, status().isForbidden());
    }

    @Test
    @DisplayName("2.15 Outsider → /api/audit-logs → 403")
    void tenant_outsider_auditLogs() throws Exception {
        assertWithToken("/api/audit-logs", outsiderToken, status().isForbidden());
    }
    // 👑 NHÓM 3: SYSTEM ADMIN — Chỉ sysadmin mới vào được

    @Test
    @DisplayName("3.1 SysAdmin → /api/sysadmin/companies → 200")
    void sysadmin_companies_allowed() throws Exception {
        assertWithToken("/api/sysadmin/companies", sysAdminToken, status().isOk());
    }

    @Test
    @DisplayName("3.2 SysAdmin → /api/sysadmin/users → 200")
    void sysadmin_users_allowed() throws Exception {
        assertWithToken("/api/sysadmin/users", sysAdminToken, status().isOk());
    }

    @Test
    @DisplayName("3.3 SysAdmin → /api/sysadmin/settings → 200")
    void sysadmin_settings_allowed() throws Exception {
        assertWithToken("/api/sysadmin/settings", sysAdminToken, status().isOk());
    }

    @Test
    @DisplayName("3.4 SysAdmin → /api/sysadmin/analytics/stats → 200")
    void sysadmin_analytics_allowed() throws Exception {
        assertWithToken("/api/sysadmin/analytics/stats", sysAdminToken, status().isOk());
    }

    @Test
    @DisplayName("3.5 Employee → /api/sysadmin/companies → 403")
    void sysadmin_employee_blocked() throws Exception {
        assertWithToken("/api/sysadmin/companies", employeeToken, status().isForbidden());
    }

    @Test
    @DisplayName("3.6 Admin → /api/sysadmin/companies → 403")
    void sysadmin_admin_blocked() throws Exception {
        assertWithToken("/api/sysadmin/companies", adminToken, status().isForbidden());
    }

    @Test
    @DisplayName("3.7 Employee → /api/sysadmin/users → 403")
    void sysadmin_users_employee_blocked() throws Exception {
        assertWithToken("/api/sysadmin/users", employeeToken, status().isForbidden());
    }

    @Test
    @DisplayName("3.8 Employee → /api/sysadmin/settings → 403")
    void sysadmin_settings_employee_blocked() throws Exception {
        assertWithToken("/api/sysadmin/settings", employeeToken, status().isForbidden());
    }

    @Test
    @DisplayName("3.9 Employee → /api/sysadmin/analytics/stats → 403")
    void sysadmin_analytics_employee_blocked() throws Exception {
        assertWithToken("/api/sysadmin/analytics/stats", employeeToken, status().isForbidden());
    }

    @Test
    @DisplayName("3.10 SysAdmin → /api/sysadmin/tenants/{id}/users → 200")
    void sysadmin_tenants_allowed() throws Exception {
        assertWithToken("/api/sysadmin/tenants/" + companyId + "/users", sysAdminToken, status().isOk());
    }

    @Test
    @DisplayName("3.11 SysAdmin → /api/sysadmin/tenants/{id}/projects → 200")
    void sysadmin_tenantProjects_allowed() throws Exception {
        assertWithToken("/api/sysadmin/tenants/" + companyId + "/projects", sysAdminToken, status().isOk());
    }

    @Test
    @DisplayName("3.12 SysAdmin → /api/sysadmin/analytics/growth → 200")
    void sysadmin_growth_allowed() throws Exception {
        assertWithToken("/api/sysadmin/analytics/growth", sysAdminToken, status().isOk());
    }
    // 🛡️ NHÓM 4: COMPANY ADMIN — Admin/Owner only

    @Test
    @DisplayName("4.1 Admin → /api/audit-logs → 200")
    void companyAdmin_auditLogs_allowed() throws Exception {
        assertWithToken("/api/audit-logs", adminToken, status().isOk());
    }

    @Test
    @DisplayName("4.2 Employee → /api/audit-logs → 403")
    void companyAdmin_auditLogs_employee_blocked() throws Exception {
        assertWithToken("/api/audit-logs", employeeToken, status().isForbidden());
    }

    @Test
    @DisplayName("4.3 Admin → /api/audit-logs/critical → không 403")
    void companyAdmin_auditLogsCritical_allowed() throws Exception {
        // May return 500 in H2 due to DDL issues, but should NOT be 403
        int s = mockMvc.perform(get("/api/audit-logs/critical")
                .header("Authorization", "Bearer " + adminToken)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn().getResponse().getStatus();
        assertNotEquals(403, s, "Admin should NOT get 403 on audit-logs/critical, got: " + s);
    }

    @Test
    @DisplayName("4.4 Employee → /api/audit-logs/critical → 403")
    void companyAdmin_auditLogsCritical_employee_blocked() throws Exception {
        assertWithToken("/api/audit-logs/critical", employeeToken, status().isForbidden());
    }

    @Test
    @DisplayName("4.5 Admin → /api/admin/sync/firebase (POST) → không 403")
    void companyAdmin_syncFirebase_allowed() throws Exception {
        // Firebase sync may fail with 500 (no Firebase in test), but should NOT be 403
        int s = mockMvc.perform(post("/api/admin/sync/firebase")
                .header("Authorization", "Bearer " + adminToken)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(403, s, "Admin should NOT get 403 on sync, got: " + s);
    }

    @Test
    @DisplayName("4.6 Employee → /api/admin/sync/firebase (POST) → 403")
    void companyAdmin_syncFirebase_employee_blocked() throws Exception {
        assertPostWithToken("/api/admin/sync/firebase", employeeToken, "{}", status().isForbidden());
    }
    // 👤 NHÓM 5: HR MODULE — @FeatureFlag("HR")

    @Test
    @DisplayName("5.1 Employee → /api/employees → 200")
    void hr_employee_list() throws Exception {
        assertWithToken("/api/employees", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("5.2 Admin → /api/employees → 200")
    void hr_admin_list() throws Exception {
        assertWithToken("/api/employees", adminToken, status().isOk());
    }

    @Test
    @DisplayName("5.3 Employee → /api/employees/page?page=0&size=10 → 200")
    void hr_employee_page() throws Exception {
        assertWithToken("/api/employees/page?page=0&size=10", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("5.4 Employee → /api/employees/search?keyword=test → 200")
    void hr_employee_search() throws Exception {
        assertWithToken("/api/employees/search?keyword=test", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("5.5 Employee → /api/departments → 200")
    void hr_departments() throws Exception {
        assertWithToken("/api/departments", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("5.6 Employee → /api/positions → 200")
    void hr_positions() throws Exception {
        assertWithToken("/api/positions", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("5.7 Employee → /api/dashboard/overview → 200")
    void hr_dashboard_overview() throws Exception {
        assertWithToken("/api/dashboard/overview", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("5.8 Employee → /api/dashboard/stats → 200")
    void hr_dashboard_stats() throws Exception {
        assertWithToken("/api/dashboard/stats", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("5.9 Employee → /api/dashboard/employee-by-gender → 200")
    void hr_dashboard_gender() throws Exception {
        assertWithToken("/api/dashboard/employee-by-gender", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("5.10 Employee → /api/dashboard/employee-by-age → 200")
    void hr_dashboard_age() throws Exception {
        assertWithToken("/api/dashboard/employee-by-age", employeeToken, status().isOk());
    }
    // 📋 NHÓM 6: HR SUB-FEATURES — Attendance, Leave, Salary, etc.

    @Test
    @DisplayName("6.1 Employee → /api/attendance → 200")
    void hrSub_attendance() throws Exception {
        assertWithToken("/api/attendance", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.2 Employee → /api/attendance/my-history → 200")
    void hrSub_attendanceHistory() throws Exception {
        assertWithToken("/api/attendance/my-history", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.3 Employee → /api/leave-requests → 200")
    void hrSub_leaveRequests() throws Exception {
        assertWithToken("/api/leave-requests", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.4 Employee → /api/leave-requests/pending → 200")
    void hrSub_leaveRequestsPending() throws Exception {
        assertWithToken("/api/leave-requests/pending", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.5 Employee → /api/salaries → 200")
    void hrSub_salaries() throws Exception {
        assertWithToken("/api/salaries", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.6 Employee → /api/contracts → 200")
    void hrSub_contracts() throws Exception {
        assertWithToken("/api/contracts", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.7 Employee → /api/reviews → 200 (hrManageReviews=true)")
    void hrSub_reviews() throws Exception {
        assertWithToken("/api/reviews", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.8 Employee → /api/reviews/pending → 200")
    void hrSub_reviewsPending() throws Exception {
        assertWithToken("/api/reviews/pending", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.9 Employee → /api/okrs → 200")
    void hrSub_okrs() throws Exception {
        assertWithToken("/api/okrs", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.10 Employee → /api/okrs/my → 200")
    void hrSub_okrsMy() throws Exception {
        assertWithToken("/api/okrs/my", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.11 Employee → /api/skills → 200")
    void hrSub_skills() throws Exception {
        assertWithToken("/api/skills", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.12 Employee → /api/skills/matrix → 200")
    void hrSub_skillsMatrix() throws Exception {
        assertWithToken("/api/skills/matrix", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.13 Employee → /api/onboarding/templates → 200")
    void hrSub_onboardingTemplates() throws Exception {
        assertWithToken("/api/onboarding/templates", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("6.14 Employee → /api/onboarding/instances → 200")
    void hrSub_onboardingInstances() throws Exception {
        assertWithToken("/api/onboarding/instances", employeeToken, status().isOk());
    }
    // 📂 NHÓM 7: PROJECT MODULE — @FeatureFlag("PROJECT")

    @Test
    @DisplayName("7.1 Employee → /api/projects → 200")
    void project_list() throws Exception {
        assertWithToken("/api/projects", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("7.2 Employee → /api/projects/my-projects → 200")
    void project_myProjects() throws Exception {
        assertWithToken("/api/projects/my-projects", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("7.3 Employee → /api/issues/my-issues → 200")
    void project_myIssues() throws Exception {
        assertWithToken("/api/issues/my-issues", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("7.4 Employee → /api/issues/my-reported → 200")
    void project_myReported() throws Exception {
        assertWithToken("/api/issues/my-reported", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("7.5 Employee → /api/project-dashboard/my-projects → 200")
    void project_dashboard_myProjects() throws Exception {
        assertWithToken("/api/project-dashboard/my-projects", employeeToken, status().isOk());
    }
    // 💬 NHÓM 8: CHAT MODULE — @FeatureFlag("CHAT")

    @Test
    @DisplayName("8.1 Employee → /api/chat/rooms → 200")
    void chat_rooms() throws Exception {
        assertWithToken("/api/chat/rooms", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("8.2 Employee → /api/chat/me → 200")
    void chat_me() throws Exception {
        assertWithToken("/api/chat/me", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("8.3 Employee → /api/chat/health → 200")
    void chat_health() throws Exception {
        assertWithToken("/api/chat/health", employeeToken, status().isOk());
    }
    // 📦 NHÓM 9: STORAGE MODULE — @FeatureFlag("STORAGE")

    @Test
    @DisplayName("9.1 Employee → /api/storage/files/my-files → 200")
    void storage_myFiles() throws Exception {
        assertWithToken("/api/storage/files/my-files", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("9.2 Employee → /api/storage/stats → 200")
    void storage_stats() throws Exception {
        assertWithToken("/api/storage/stats", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("9.3 Employee → /api/storage/folders/my-folders → 200")
    void storage_myFolders() throws Exception {
        assertWithToken("/api/storage/folders/my-folders", employeeToken, status().isOk());
    }
    // 🌐 NHÓM 10: WORKSPACE, PROFILE, PERSONAL TASKS

    @Test
    @DisplayName("10.1 Employee → /api/workspaces → 200")
    void workspace_list() throws Exception {
        mockMvc.perform(get("/api/workspaces")
                .header("Authorization", "Bearer " + employeeToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("10.2 Employee → /api/workspaces/personal → không 401/403")
    void workspace_personal() throws Exception {
        // PersonalWorkspace may not exist in test → 404 is OK, but 401/403 is NOT
        int s = mockMvc.perform(get("/api/workspaces/personal")
                .header("Authorization", "Bearer " + employeeToken)
                .header("X-Workspace-Type", "PERSONAL")
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn().getResponse().getStatus();
        assertTrue(s != 401 && s != 403, "Employee should NOT get auth error on personal workspace, got: " + s);
    }

    @Test
    @DisplayName("10.3 Employee → /api/me/tasks → không 401/403")
    void personalTasks_list() throws Exception {
        // PersonalTask table may be empty → 200 with empty list or 404, but NOT 401/403
        int s = mockMvc.perform(get("/api/me/tasks")
                .header("Authorization", "Bearer " + employeeToken)
                .header("X-Workspace-Type", "PERSONAL")
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn().getResponse().getStatus();
        assertTrue(s != 401 && s != 403, "Employee should NOT get auth error on personal tasks, got: " + s);
    }

    @Test
    @DisplayName("10.4 Employee → /api/me/tasks/stats → không 401/403")
    void personalTasks_stats() throws Exception {
        int s = mockMvc.perform(get("/api/me/tasks/stats")
                .header("Authorization", "Bearer " + employeeToken)
                .header("X-Workspace-Type", "PERSONAL")
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn().getResponse().getStatus();
        assertTrue(s != 401 && s != 403, "Employee should NOT get auth error on personal task stats, got: " + s);
    }

    @Test
    @DisplayName("10.5 Employee → /api/notifications → 200")
    void notifications_list() throws Exception {
        assertWithToken("/api/notifications", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("10.6 Employee → /api/notifications/unread-count → 200")
    void notifications_unread() throws Exception {
        assertWithToken("/api/notifications/unread-count", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("10.7 Employee → /api/calendar/events → không 403")
    void calendar_events() throws Exception {
        // Calendar may need mock data setup, accept anything except 403
        int s = mockMvc.perform(get("/api/calendar/events")
                .header("Authorization", "Bearer " + employeeToken)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn().getResponse().getStatus();
        assertNotEquals(403, s, "Employee should NOT get 403 on calendar, got: " + s);
    }

    @Test
    @DisplayName("10.8 Employee → /api/search?q=test → không 403")
    void search_global() throws Exception {
        // Search may error in H2, accept anything except 403
        int s = mockMvc.perform(get("/api/search?q=test")
                .header("Authorization", "Bearer " + employeeToken)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON))
                .andReturn().getResponse().getStatus();
        assertNotEquals(403, s, "Employee should NOT get 403 on search, got: " + s);
    }
    // 🏢 NHÓM 11: COMPANY MANAGEMENT

    @Test
    @DisplayName("11.1 Employee → /api/companies/my → 200")
    void company_my() throws Exception {
        mockMvc.perform(get("/api/companies/my")
                .header("Authorization", "Bearer " + employeeToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("11.2 Employee → /api/companies/{id} → 200")
    void company_get() throws Exception {
        assertWithToken("/api/companies/" + companyId, employeeToken, status().isOk());
    }

    @Test
    @DisplayName("11.3 Employee → /api/companies/{id}/settings → 200")
    void company_settings() throws Exception {
        assertWithToken("/api/companies/" + companyId + "/settings", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("11.4 Employee → /api/companies/quota → 200")
    void company_quota() throws Exception {
        assertWithToken("/api/companies/quota", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("11.5 Employee → /api/companies/{id}/limits → 200")
    void company_limits() throws Exception {
        assertWithToken("/api/companies/" + companyId + "/limits", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("11.6 Admin → /api/companies/admin/all → chỉ SysAdmin")
    void company_adminAll_admin_blocked() throws Exception {
        assertWithToken("/api/companies/admin/all", adminToken, status().isForbidden());
    }

    @Test
    @DisplayName("11.7 Employee → /api/companies/admin/all → 403")
    void company_adminAll_employee_blocked() throws Exception {
        assertWithToken("/api/companies/admin/all", employeeToken, status().isForbidden());
    }
    // 👥 NHÓM 12: COMPANY MEMBERS

    @Test
    @DisplayName("12.1 Employee → /api/companies/{id}/members → 200")
    void members_list() throws Exception {
        assertWithToken("/api/companies/" + companyId + "/members", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("12.2 Outsider → /api/companies/{id}/members → 403")
    void members_outsider_blocked() throws Exception {
        assertWithToken("/api/companies/" + companyId + "/members", outsiderToken, status().isForbidden());
    }
    // 🔌 NHÓM 13: INTEGRATIONS — checkAdminPermission

    @Test
    @DisplayName("13.1 Employee → /api/integrations/available → 200")
    void integrations_available() throws Exception {
        assertWithToken("/api/integrations/available", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("13.2 Employee → /api/integrations → 200")
    void integrations_list() throws Exception {
        assertWithToken("/api/integrations", employeeToken, status().isOk());
    }

    @Test
    @DisplayName("13.3 Employee → POST /api/integrations/connect → 403 (admin only)")
    void integrations_connect_employee_blocked() throws Exception {
        assertPostWithToken("/api/integrations/connect", employeeToken,
                "{\"integrationType\":\"SLACK\"}", status().isForbidden());
    }

    @Test
    @DisplayName("13.4 Admin → POST /api/integrations/connect → không 403")
    void integrations_connect_admin_allowed() throws Exception {
        int s = mockMvc.perform(post("/api/integrations/connect")
                .header("Authorization", "Bearer " + adminToken)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"integrationType\":\"SLACK\"}"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(403, s, "Admin should NOT get 403, but got: " + s);
    }
    // 🔐 NHÓM 14: SSO — checkAdminPermission

    @Test
    @DisplayName("14.1 Employee → /api/auth/sso/providers → 403 (admin only)")
    void sso_providers_employee_blocked() throws Exception {
        assertWithToken("/api/auth/sso/providers", employeeToken, status().isForbidden());
    }

    @Test
    @DisplayName("14.2 Admin → /api/auth/sso/providers → 200")
    void sso_providers_admin_allowed() throws Exception {
        assertWithToken("/api/auth/sso/providers", adminToken, status().isOk());
    }
    // 🔄 NHÓM 15: FEATURE FLAG TOGGLE
    // Dùng Admin token (admin bypass permission check, focus on feature flag only)
    // TẮT feature → gọi API → phải bị 403
    // BẬT lại feature → gọi API → phải được 200

    @Test
    @DisplayName("15.1 TẮT HR → /api/employees → 403")
    void featureToggle_disableHR() throws Exception {
        // Step 1: Verify it works while enabled
        assertWithToken("/api/employees", adminToken, status().isOk());

        // Step 2: Disable HR module + evict cache
        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setHrModuleEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            // Step 3: Should now be 403
            assertWithToken("/api/employees", adminToken, status().isForbidden());
        } finally {
            // Step 4: Re-enable HR + evict cache
            settings.setHrModuleEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.2 TẮT PROJECT → /api/projects → 403")
    void featureToggle_disableProject() throws Exception {
        assertWithToken("/api/projects", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setProjectModuleEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/projects", adminToken, status().isForbidden());
        } finally {
            settings.setProjectModuleEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.3 TẮT CHAT → /api/chat/rooms → 403")
    void featureToggle_disableChat() throws Exception {
        assertWithToken("/api/chat/rooms", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setChatModuleEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/chat/rooms", adminToken, status().isForbidden());
        } finally {
            settings.setChatModuleEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.4 TẮT STORAGE → /api/storage/files/my-files → 403")
    void featureToggle_disableStorage() throws Exception {
        assertWithToken("/api/storage/files/my-files", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setStorageModuleEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/storage/files/my-files", adminToken, status().isForbidden());
        } finally {
            settings.setStorageModuleEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.5 TẮT ATTENDANCE → /api/attendance → 403")
    void featureToggle_disableAttendance() throws Exception {
        assertWithToken("/api/attendance", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setAttendanceEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/attendance", adminToken, status().isForbidden());
        } finally {
            settings.setAttendanceEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.6 TẮT LEAVE → /api/leave-requests → 403")
    void featureToggle_disableLeave() throws Exception {
        assertWithToken("/api/leave-requests", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setLeaveEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/leave-requests", adminToken, status().isForbidden());
        } finally {
            settings.setLeaveEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.7 TẮT SALARY → /api/salaries → 403")
    void featureToggle_disableSalary() throws Exception {
        assertWithToken("/api/salaries", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setSalaryEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/salaries", adminToken, status().isForbidden());
        } finally {
            settings.setSalaryEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.8 TẮT CONTRACT → /api/contracts → 403")
    void featureToggle_disableContract() throws Exception {
        assertWithToken("/api/contracts", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setContractEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/contracts", adminToken, status().isForbidden());
        } finally {
            settings.setContractEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.9 TẮT REVIEW → /api/reviews → 403")
    void featureToggle_disableReview() throws Exception {
        assertWithToken("/api/reviews", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setReviewEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/reviews", adminToken, status().isForbidden());
        } finally {
            settings.setReviewEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.10 TẮT OKR → /api/okrs → 403")
    void featureToggle_disableOkr() throws Exception {
        assertWithToken("/api/okrs", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setOkrEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/okrs", adminToken, status().isForbidden());
        } finally {
            settings.setOkrEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.11 TẮT SKILLS_MATRIX → /api/skills → 403")
    void featureToggle_disableSkills() throws Exception {
        assertWithToken("/api/skills", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setSkillsMatrixEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/skills", adminToken, status().isForbidden());
        } finally {
            settings.setSkillsMatrixEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }

    @Test
    @DisplayName("15.12 TẮT ONBOARDING → /api/onboarding/templates → 403")
    void featureToggle_disableOnboarding() throws Exception {
        assertWithToken("/api/onboarding/templates", adminToken, status().isOk());

        CompanySettings settings = settingsRepository.findById(companyId).orElseThrow();
        settings.setOnboardingEnabled(false);
        settingsRepository.save(settings);
        evictSettingsCache();

        try {
            assertWithToken("/api/onboarding/templates", adminToken, status().isForbidden());
        } finally {
            settings.setOnboardingEnabled(true);
            settingsRepository.save(settings);
            evictSettingsCache();
        }
    }
}
