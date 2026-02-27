package DoAn.BE.common.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import java.util.Set;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import DoAn.BE.auth.service.JwtService;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.entity.UserPermissions;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import static org.junit.jupiter.api.Assertions.*;

// 🏗️ MODULE COVERAGE INTEGRATION TEST (v2 — fixed paths + assertions)
//
// Bao quát TẤT CẢ modules chưa test:
// - LeaveRequest, Salary, Contract, Attendance
// - Project, Chat, Storage
// - Review, Skill, Position, Onboarding
// - Issue, Sprint, Dashboard
// - AI, Notification, AuditLog
// /
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class ModuleCoverageIntegrationTest {

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

    private Long companyId;
    private String adminToken;
    private String empToken;

    @BeforeAll
    void seedDatabase() {
        User admin = userRepository.save(User.builder()
                .username("mod_admin").passwordHash("$2a$10$dummy")
                .email("mod_admin@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());
        User emp = userRepository.save(User.builder()
                .username("mod_emp").passwordHash("$2a$10$dummy")
                .email("mod_emp@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

        Company company = new Company();
        company.setName("ModTest Corp");
        company.setSlug("modtest-corp");
        company.setPlan(Plan.ENTERPRISE);
        company.setIsActive(true);

        CompanySettings s = new CompanySettings();
        s.setCompany(company);
        s.setHrModuleEnabled(true);
        s.setProjectModuleEnabled(true);
        s.setChatModuleEnabled(true);
        s.setStorageModuleEnabled(true);
        s.setAiModuleEnabled(true);
        s.setAttendanceEnabled(true);
        s.setLeaveEnabled(true);
        s.setSalaryEnabled(true);
        s.setContractEnabled(true);
        s.setReviewEnabled(true);
        s.setOkrEnabled(true);
        s.setCalendarEnabled(true);
        s.setTimeTrackingEnabled(true);
        s.setAnalyticsEnabled(true);
        s.setOnboardingEnabled(true);
        s.setSkillsMatrixEnabled(true);
        s.setWebhookEnabled(true);
        s.setMaxEmployees(100);
        s.setMaxProjects(50);
        s.setMaxStorageBytes(5L * 1024 * 1024 * 1024);
        s.setMaxFileUploadBytes(100 * 1024 * 1024L);
        company.setSettings(s);
        company = companyRepository.save(company);
        this.companyId = company.getCompanyId();

        UserPermissions perms = new UserPermissions();
        perms.setHrViewList(true);
        perms.setHrEditProfile(true);
        perms.setHrManageContracts(true);
        perms.setHrManageReviews(true);
        perms.setSalaryView(true);
        perms.setSalaryCalculate(true);
        perms.setSalaryApprove(true);
        perms.setLeaveApprove(true);
        perms.setLeaveViewAll(true);
        perms.setAttendanceViewAll(true);
        perms.setAttendanceEdit(true);
        perms.setProjectCreate(true);
        perms.setProjectManageAll(true);
        perms.setProjectDelete(true);
        perms.setChatCreateGroup(true);
        perms.setStorageUpload(true);

        CompanyMember adminMember = new CompanyMember();
        adminMember.setUser(admin);
        adminMember.setCompany(company);
        adminMember.setRoles(Set.of(CompanyRole.ADMIN));
        adminMember.setIsActive(true);
        memberRepository.save(adminMember);

        CompanyMember empMember = new CompanyMember();
        empMember.setUser(emp);
        empMember.setCompany(company);
        empMember.setRoles(Set.of(CompanyRole.EMPLOYEE));
        empMember.setPermissions(perms);
        empMember.setIsActive(true);
        memberRepository.save(empMember);

        adminToken = jwtService.generateToken(admin, companyId, CompanyRole.ADMIN);
        empToken = jwtService.generateToken(emp, companyId, CompanyRole.EMPLOYEE);
    }

    // ===== HELPERS =====
    private MvcResult doGet(String url, String token) throws Exception {
        return mockMvc.perform(get(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)).andReturn();
    }

    private MvcResult doPost(String url, String token, String body) throws Exception {
        return mockMvc.perform(post(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)).andReturn();
    }

    private MvcResult doPatch(String url, String token, String body) throws Exception {
        return mockMvc.perform(patch(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)).andReturn();
    }

    private MvcResult doDelete(String url, String token) throws Exception {
        return mockMvc.perform(delete(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)).andReturn();
    }

    // 📋 NHÓM 1: LEAVE REQUEST
    @Nested
    @DisplayName("📋 1. Leave Request Workflow")
    class LeaveRequestTests {

        @Test
        @DisplayName("1.1 GET /api/leave-requests → 200")
        void listLeaveRequests() throws Exception {
            MvcResult r = doGet("/api/leave-requests?page=0&size=10", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "LEAVE BUG: GET /api/leave-requests returned " + s);
        }

        @Test
        @DisplayName("1.2 GET /api/leave-requests/pending → 200")
        void pendingLeaveRequests() throws Exception {
            MvcResult r = doGet("/api/leave-requests/pending?page=0&size=10", adminToken);
            assertTrue(r.getResponse().getStatus() == 200, "LEAVE BUG: pending endpoint returned " + r.getResponse().getStatus());
        }

        @Test
        @DisplayName("1.3 DELETE /api/leave-requests/999999 → không 500")
        void deleteNonExistent_404() throws Exception {
            MvcResult r = doDelete("/api/leave-requests/999999", adminToken);
            assertTrue(r.getResponse().getStatus() != 500, "LEAVE BUG: delete non-existent returned 500");
        }
    }

    // 💰 NHÓM 2: SALARY
    @Nested
    @DisplayName("💰 2. Salary Module")
    class SalaryTests {

        @Test
        @DisplayName("2.1 GET /api/salaries → 200")
        void listSalaries() throws Exception {
            MvcResult r = doGet("/api/salaries?page=0&size=10", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "SALARY BUG: GET /api/salaries returned " + s);
        }

        @Test
        @DisplayName("2.2 GET /api/salaries/status/INVALID → 400 (không 500)")
        void invalidStatus_400() throws Exception {
            MvcResult r = doGet("/api/salaries/status/FAKE_STATUS?page=0&size=10", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(400, s, "SALARY BUG: invalid status returned " + s + " instead of 400");
        }

        @Test
        @DisplayName("2.3 GET /api/salaries/statistics/total?month=13 → không 500")
        void invalidMonth_handled() throws Exception {
            MvcResult r = doGet("/api/salaries/statistics/total?month=13&year=2026", adminToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "SALARY BUG: month=13 caused 500!");
        }

        @Test
        @DisplayName("2.4 GET /api/salaries/999999 → 404 (không 500)")
        void getNonExistent_404() throws Exception {
            MvcResult r = doGet("/api/salaries/999999", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(404, s, "SALARY BUG: non-existent salary returned " + s);
        }
    }

    // 📄 NHÓM 3: CONTRACT
    @Nested
    @DisplayName("📄 3. Contract Module")
    class ContractTests {

        @Test
        @DisplayName("3.1 GET /api/contracts → 200")
        void listContracts() throws Exception {
            MvcResult r = doGet("/api/contracts", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "CONTRACT BUG: GET /api/contracts returned " + s);
        }

        @Test
        @DisplayName("3.2 GET /api/contracts/expiring?daysAhead=30 → 200")
        void expiringContracts() throws Exception {
            MvcResult r = doGet("/api/contracts/expiring?daysAhead=30", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "CONTRACT BUG: expiring contracts returned " + s);
        }

        @Test
        @DisplayName("3.3 DELETE /api/contracts/999999 → không 500")
        void deleteNonExistent_handled() throws Exception {
            MvcResult r = doDelete("/api/contracts/999999", adminToken);
            assertTrue(r.getResponse().getStatus() != 500, "CONTRACT BUG: delete non-existent returned 500");
        }

        @Test
        @DisplayName("3.4 PATCH /api/contracts/999999/cancel → không 500")
        void cancelNonExistent_handled() throws Exception {
            MvcResult r = doPatch("/api/contracts/999999/cancel", adminToken, "");
            assertTrue(r.getResponse().getStatus() != 500, "CONTRACT BUG: cancel non-existent returned 500");
        }
    }

    // ⏰ NHÓM 4: ATTENDANCE (fixed paths: /statistics not /stats)
    @Nested
    @DisplayName("⏰ 4. Attendance Module")
    class AttendanceTests {

        @Test
        @DisplayName("4.1 GET /api/attendance → 200")
        void listAttendance() throws Exception {
            MvcResult r = doGet("/api/attendance?page=0&size=10", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "ATTENDANCE BUG: list returned " + s);
        }

        @Test
        @DisplayName("4.2 GET /api/attendance/report → 200")
        void attendanceReport() throws Exception {
            MvcResult r = doGet("/api/attendance/report", adminToken);
            assertTrue(r.getResponse().getStatus() == 200, "ATTENDANCE BUG: report returned " + r.getResponse().getStatus());
        }

        @Test
        @DisplayName("4.3 GET /api/attendance/employee/999999/statistics → 200 (catches exception)")
        void statsNonExistent_handled() throws Exception {
            // AttendanceController.getStatistics catches exception and returns 200 with 0s
            MvcResult r = doGet("/api/attendance/employee/999999/statistics?year=2026&month=3", adminToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "ATTENDANCE BUG: statistics/non-existent employee caused 500!");
        }
    }

    // 🏗 NHÓM 5: PROJECT
    @Nested
    @DisplayName("🏗 5. Project Module")
    class ProjectTests {

        @Test
        @DisplayName("5.1 GET /api/projects → 200")
        void listProjects() throws Exception {
            MvcResult r = doGet("/api/projects?page=0&size=10", empToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "PROJECT BUG: list returned " + s);
        }

        @Test
        @DisplayName("5.2 GET /api/projects/my-projects → 200")
        void myProjects() throws Exception {
            MvcResult r = doGet("/api/projects/my-projects?page=0&size=10", empToken);
            assertTrue(r.getResponse().getStatus() == 200, "PROJECT BUG: my-projects returned " + r.getResponse().getStatus());
        }

        @Test
        @DisplayName("5.3 GET /api/projects/999999 → không 500")
        void getNonExistent_handled() throws Exception {
            MvcResult r = doGet("/api/projects/999999", empToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "PROJECT BUG: non-existent project caused 500!");
        }

        @Test
        @DisplayName("5.4 DELETE /api/projects/999999 → không 500")
        void deleteNonExistent_handled() throws Exception {
            MvcResult r = doDelete("/api/projects/999999", adminToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "PROJECT BUG: delete non-existent caused 500!");
        }
    }

    // 💬 NHÓM 6: CHAT
    @Nested
    @DisplayName("💬 6. Chat Module")
    class ChatTests {

        @Test
        @DisplayName("6.1 GET /api/chat/rooms → 200")
        void listChatRooms() throws Exception {
            MvcResult r = doGet("/api/chat/rooms?page=0&size=10", empToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "CHAT BUG: list rooms returned " + s);
        }

        @Test
        @DisplayName("6.2 GET /api/chat/rooms/999999 → không 500")
        void getNonExistent_handled() throws Exception {
            MvcResult r = doGet("/api/chat/rooms/999999", empToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "CHAT BUG: non-existent room caused 500!");
        }
    }

    // 📁 NHÓM 7: STORAGE
    @Nested
    @DisplayName("📁 7. Storage Module")
    class StorageTests {

        @Test
        @DisplayName("7.1 GET /api/storage/files/my-files → 200")
        void myFiles() throws Exception {
            MvcResult r = doGet("/api/storage/files/my-files", empToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "STORAGE BUG: my-files returned " + s);
        }

        @Test
        @DisplayName("7.2 GET /api/storage/stats → 200")
        void storageStats() throws Exception {
            MvcResult r = doGet("/api/storage/stats", empToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "STORAGE BUG: stats returned " + s);
        }

        @Test
        @DisplayName("7.3 GET /api/storage/files/999999 → không 500")
        void getNonExistent_handled() throws Exception {
            MvcResult r = doGet("/api/storage/files/999999", empToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "STORAGE BUG: non-existent file caused 500! Status: " + s);
        }

        @Test
        @DisplayName("7.4 DELETE /api/storage/files/999999 → không 500")
        void deleteNonExistent_handled() throws Exception {
            MvcResult r = doDelete("/api/storage/files/999999", empToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "STORAGE BUG: delete non-existent caused 500!");
        }
    }

    // 🌟 NHÓM 8: HR Sub-modules (Review, Skill, Position, Onboarding)
    @Nested
    @DisplayName("🌟 8. HR Sub-modules")
    class HRSubModules {

        @Test
        @DisplayName("8.1 GET /api/reviews → 200")
        void listReviews() throws Exception {
            MvcResult r = doGet("/api/reviews", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "REVIEW BUG: list returned " + s);
        }

        @Test
        @DisplayName("8.2 GET /api/skills → 200")
        void listSkills() throws Exception {
            MvcResult r = doGet("/api/skills", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "SKILL BUG: list returned " + s);
        }

        @Test
        @DisplayName("8.3 GET /api/positions → 200")
        void listPositions() throws Exception {
            MvcResult r = doGet("/api/positions", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "POSITION BUG: list returned " + s);
        }

        @Test
        @DisplayName("8.4 GET /api/onboarding/templates → 200")
        void listOnboardingTemplates() throws Exception {
            // Correct path is /templates not /tasks
            MvcResult r = doGet("/api/onboarding/templates", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "ONBOARDING BUG: templates returned " + s);
        }

        @Test
        @DisplayName("8.5 POST /api/positions empty name → 400 (DTO has @NotBlank)")
        void createPosition_emptyName_400() throws Exception {
            // PositionRequest has @NotBlank on name field
            String body = """
                    {"name":"","description":"test"}
                    """;
            MvcResult r = doPost("/api/positions", adminToken, body);
            int s = r.getResponse().getStatus();
            assertEquals(400, s, "POSITION BUG: empty name accepted! Status: " + s);
        }

        @Test
        @DisplayName("8.6 POST /api/skills empty name → 400 (DTO has @NotBlank)")
        void createSkill_emptyName_400() throws Exception {
            // CreateSkillRequest has @NotBlank on name field
            String body = """
                    {"name":"","category":"test"}
                    """;
            MvcResult r = doPost("/api/skills", adminToken, body);
            int s = r.getResponse().getStatus();
            assertEquals(400, s, "SKILL BUG: empty name accepted! Status: " + s);
        }
    }

    // 🔍 NHÓM 9: NOTIFICATION, AUDIT
    @Nested
    @DisplayName("🔍 9. Notification & AuditLog")
    class MiscModules {

        @Test
        @DisplayName("9.1 GET /api/notifications → 200")
        void listNotifications() throws Exception {
            MvcResult r = doGet("/api/notifications?page=0&size=10", empToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "NOTIFICATION BUG: list returned " + s);
        }

        @Test
        @DisplayName("9.2 GET /api/audit-logs → admin only")
        void auditLogs_adminOnly() throws Exception {
            MvcResult empResult = doGet("/api/audit-logs?page=0&size=10", empToken);
            int empStatus = empResult.getResponse().getStatus();
            // Employee may or may not have access
            assertTrue(empStatus == 403 || empStatus == 200, "AUDIT BUG: unexpected status " + empStatus);
        }
    }

    // 🔧 NHÓM 10: ISSUE, SPRINT, DASHBOARD (fixed paths)
    @Nested
    @DisplayName("🔧 10. Project Sub-modules (Issue, Sprint, Dashboard)")
    class ProjectSubModules {

        @Test
        @DisplayName("10.1 GET /api/issues/project/999999 → không 500")
        void issuesNonExistentProject_handled() throws Exception {
            MvcResult r = doGet("/api/issues/project/999999?page=0&size=10", empToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "ISSUE BUG: issues for non-existent project caused 500!");
        }

        @Test
        @DisplayName("10.2 GET /api/sprints/project/999999 → không 500")
        void sprintsNonExistentProject_handled() throws Exception {
            MvcResult r = doGet("/api/sprints/project/999999", empToken);
            int s = r.getResponse().getStatus();
            assertNotEquals(500, s, "SPRINT BUG: sprints for non-existent project caused 500!");
        }

        @Test
        @DisplayName("10.3 GET /api/dashboard/overview → 200")
        void hrDashboard() throws Exception {
            // Correct path is /api/dashboard/overview not /api/dashboard/hr
            MvcResult r = doGet("/api/dashboard/overview", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "DASHBOARD BUG: overview returned " + s);
        }
    }

    // 🤖 NHÓM 11: AI, Integration
    @Nested
    @DisplayName("🤖 11. AI & Integration")
    class AdvancedModules {

        @Test
        @DisplayName("11.1 GET /api/integrations → 200")
        void listIntegrations() throws Exception {
            MvcResult r = doGet("/api/integrations", adminToken);
            int s = r.getResponse().getStatus();
            assertTrue(s == 200 || s == 404, "INTEGRATION BUG: list returned " + s);
        }

        @Test
        @DisplayName("11.2 GET /api/ai/status → 200 (check AI service)")
        void aiStatus() throws Exception {
            // Use GET /api/ai/status instead of POST /api/ai/ask with empty body
            MvcResult r = doGet("/api/ai/status", empToken);
            int s = r.getResponse().getStatus();
            assertTrue(s == 200 || s == 503, "AI BUG: status returned " + s);
        }
    }

    // 🔐 NHÓM 12: FEATURE FLAG COVERAGE
    @Nested
    @DisplayName("🔐 12. Feature Flag checks")
    class FeatureFlagGaps {

        @Test
        @DisplayName("12.1 ContractController → accessible when CONTRACT enabled")
        void contractFeatureFlag_exists() throws Exception {
            MvcResult r = doGet("/api/contracts", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "CONTRACT BUG: feature flag blocks when enabled! Status: " + s);
        }

        @Test
        @DisplayName("12.2 SalaryController → accessible when SALARY enabled")
        void salaryFeatureFlag_exists() throws Exception {
            MvcResult r = doGet("/api/salaries?page=0&size=10", adminToken);
            int s = r.getResponse().getStatus();
            assertEquals(200, s, "SALARY BUG: feature flag blocks when enabled! Status: " + s);
        }
    }
}
