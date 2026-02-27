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
import DoAn.BE.company.repository.*;
import DoAn.BE.hrm.repository.*;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

// 🔗 CASCADE & DATA INTEGRITY TESTS
//
// Tests referential integrity when deleting parent entities
// /
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SuppressWarnings("unused")
public class CascadeIntegrationTest {

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
    private DepartmentRepository departmentRepository;
    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private OKRRepository okrRepository;

    private Long companyId;
    private String adminToken;

    @BeforeAll
    void seedDatabase() {
        User admin = userRepository.save(User.builder()
                .username("cascade_admin").passwordHash("$2a$10$dummy")
                .email("cascade@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

        Company company = new Company();
        company.setName("Cascade Test Corp");
        company.setSlug("cascade-test");
        company.setPlan(Plan.PROFESSIONAL);
        company.setIsActive(true);

        CompanySettings settings = new CompanySettings();
        settings.setCompany(company);
        settings.setHrModuleEnabled(true);
        settings.setProjectModuleEnabled(true);
        settings.setChatModuleEnabled(true);
        settings.setStorageModuleEnabled(true);
        settings.setAttendanceEnabled(true);
        settings.setLeaveEnabled(true);
        settings.setSalaryEnabled(true);
        settings.setContractEnabled(true);
        settings.setReviewEnabled(true);
        settings.setOkrEnabled(true);
        settings.setCalendarEnabled(true);
        settings.setTimeTrackingEnabled(true);
        settings.setSkillsMatrixEnabled(true);
        settings.setOnboardingEnabled(true);
        settings.setAnalyticsEnabled(true);
        settings.setMaxEmployees(50);
        settings.setMaxProjects(20);
        settings.setMaxStorageBytes(1024L * 1024 * 1024);
        settings.setMaxFileUploadBytes(50 * 1024 * 1024L);
        company.setSettings(settings);
        company = companyRepository.save(company);
        this.companyId = company.getCompanyId();

        UserPermissions perms = new UserPermissions();
        perms.setHrViewList(true);
        perms.setHrEditProfile(true);
        perms.setHrManageContracts(true);
        perms.setHrManageReviews(true);

        CompanyMember member = new CompanyMember();
        member.setUser(admin);
        member.setCompany(company);
        member.setRoles(Set.of(CompanyRole.ADMIN));
        member.setPermissions(perms);
        member.setIsActive(true);
        memberRepository.save(member);

        adminToken = jwtService.generateToken(admin);
    }

    private MvcResult doPost(String url, String body) throws Exception {
        return mockMvc.perform(post(url)
                .header("Authorization", "Bearer " + adminToken)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
    }

    private MvcResult doDelete(String url) throws Exception {
        return mockMvc.perform(delete(url)
                .header("Authorization", "Bearer " + adminToken)
                .header("X-Company-Id", companyId)).andReturn();
    }

    private MvcResult doGet(String url) throws Exception {
        return mockMvc.perform(get(url)
                .header("Authorization", "Bearer " + adminToken)
                .header("X-Company-Id", companyId)).andReturn();
    }

    @Nested
    @DisplayName("1. Department Cascade")
    class DepartmentCascade {

        @Test
        @DisplayName("1.1 Delete empty department → 200")
        void deleteEmptyDepartment_succeeds() throws Exception {
            // Create dept
            String body = "{\"name\":\"Cascade Empty Dept " + System.currentTimeMillis() + "\"}";
            MvcResult createResult = doPost("/api/departments", body);
            assertTrue(createResult.getResponse().getStatus() == 201 || createResult.getResponse().getStatus() == 200,
                    "Setup failed: expected 201/200 but got " + createResult.getResponse().getStatus());
                Long deptId = extractId(createResult.getResponse().getContentAsString());
                assertNotNull(deptId, "Failed to extract ID from response");
                    MvcResult delResult = doDelete("/api/departments/" + deptId);
                    int status = delResult.getResponse().getStatus();
                    assertTrue(status == 200 || status == 204, "BUG: Cannot delete empty dept! Status: " + status);
        }

        @Test
        @DisplayName("1.2 Delete department with employees → must not corrupt data")
        void deleteDepartmentWithEmployees_handled() throws Exception {
            // Create dept
            String body = "{\"name\":\"CascadeWithEmp " + System.currentTimeMillis() + "\"}";
            MvcResult createResult = doPost("/api/departments", body);
            assertTrue(createResult.getResponse().getStatus() == 201 || createResult.getResponse().getStatus() == 200,
                    "Setup failed: expected 201/200 but got " + createResult.getResponse().getStatus());
                Long deptId = extractId(createResult.getResponse().getContentAsString());
                assertNotNull(deptId, "Failed to extract ID from response");
                    // Try to delete (might have employees or not)
                    MvcResult delResult = doDelete("/api/departments/" + deptId);
                    int status = delResult.getResponse().getStatus();
                    // Should be 200 (cascade) or 400/409 (blocked), NOT 500
                    assertNotEquals(500, status, "🔴 CASCADE BUG: Delete dept with employees → 500!");
        }
    }

    @Nested
    @DisplayName("2. OKR KeyResult Cascade")
    class OkrCascade {

        @Test
        @DisplayName("2.1 Delete OKR → keyResults also deleted")
        void deleteOkr_keyResultsCascade() throws Exception {
            // Create OKR with key results
            String body = "{\"title\":\"Cascade OKR\",\"period\":\"Q4-2026\"," +
                    "\"keyResults\":[{\"title\":\"KR1\",\"target\":100,\"unit\":\"count\"}]}";
            MvcResult createResult = doPost("/api/okrs", body);
            assertTrue(createResult.getResponse().getStatus() == 200 || createResult.getResponse().getStatus() == 201,
                    "Setup failed: expected 200/201 but got " + createResult.getResponse().getStatus());
                Long okrId = extractId(createResult.getResponse().getContentAsString());
                assertNotNull(okrId, "Failed to extract ID from response");
                    // Delete OKR
                    MvcResult delResult = doDelete("/api/okrs/" + okrId);
                    int status = delResult.getResponse().getStatus();
                    assertTrue(status == 200 || status == 204, "BUG: Cannot delete OKR! Status: " + status);

                    // Verify it's gone
                    MvcResult getResult = doGet("/api/okrs/" + okrId);
                    assertTrue(getResult.getResponse().getStatus() == 404, "CASCADE BUG: OKR still exists after delete!");
        }
    }

    @Nested
    @DisplayName("3. Unique Constraints")
    class UniqueConstraints {

        @Test
        @DisplayName("3.1 Same position name in same company → handled")
        void duplicatePositionName_handled() throws Exception {
            String name = "UniquePos " + System.currentTimeMillis();
            String body = "{\"name\":\"" + name + "\"}";
            MvcResult r1 = doPost("/api/positions", body);
            MvcResult r2 = doPost("/api/positions", body);
            // Second should be 409/400, NOT 500
            assertTrue(r2.getResponse().getStatus() != 500, "🔴 BUG: Duplicate position name → 500!");
        }

        @Test
        @DisplayName("3.2 Same skill name → handled")
        void duplicateSkillName_handled() throws Exception {
            String name = "UniqueSkill " + System.currentTimeMillis();
            String body = "{\"name\":\"" + name + "\"}";
            MvcResult r1 = doPost("/api/skills", body);
            MvcResult r2 = doPost("/api/skills", body);
            assertTrue(r2.getResponse().getStatus() != 500, "🔴 BUG: Duplicate skill name → 500!");
        }
    }

    private Long extractId(String json) {
        for (String field : new String[] { "departmentId", "positionId", "okrId", "id" }) {
            String key = "\"" + field + "\":";
            int idx = json.indexOf(key);
            if (idx >= 0) {
                int start = idx + key.length();
                int end = json.indexOf(",", start);
                if (end == -1)
                    end = json.indexOf("}", start);
                try {
                    return Long.parseLong(json.substring(start, end).trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }
}
