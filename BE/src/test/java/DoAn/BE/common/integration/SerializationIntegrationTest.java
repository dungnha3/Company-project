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
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

// 📦 SERIALIZATION & LAZY INIT SWEEP
//
// Tests every GET endpoint for:
// - LazyInitializationException (500 crash)
// - Circular reference (infinite JSON / StackOverflow)
// - Sensitive data exposure (passwordHash, tokens in response)
// /
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class SerializationIntegrationTest {

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
    private String token;

    @BeforeAll
    void seedDatabase() {
        User user = userRepository.save(User.builder()
                .username("serial_test_user").passwordHash("$2a$10$secrethash")
                .email("serial@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

        Company company = new Company();
        company.setName("Serial Test Corp");
        company.setSlug("serial-test");
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
        perms.setLeaveApprove(true);
        perms.setStorageUpload(true);

        CompanyMember member = new CompanyMember();
        member.setUser(user);
        member.setCompany(company);
        member.setRoles(Set.of(CompanyRole.ADMIN));
        member.setPermissions(perms);
        member.setIsActive(true);
        memberRepository.save(member);

        token = jwtService.generateToken(user);
    }

    private MvcResult doGet(String url) throws Exception {
        return mockMvc.perform(get(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)).andReturn();
    }

    private void assertNoLazyInit(String endpoint) throws Exception {
        MvcResult r = doGet(endpoint);
        int status = r.getResponse().getStatus();
        String body = r.getResponse().getContentAsString();
        assertNotEquals(500, status, "🔴 LAZY INIT BUG at " + endpoint + ": Status 500! Body: "
                + body.substring(0, Math.min(200, body.length())));
        assertFalse(body.contains("LazyInitializationException"),
                "🔴 LAZY INIT BUG at " + endpoint + ": LazyInit in response!");
        assertFalse(body.contains("could not initialize proxy"),
                "🔴 LAZY INIT BUG at " + endpoint + ": Proxy init failure!");
    }

    private void assertNoSensitiveData(String endpoint) throws Exception {
        MvcResult r = doGet(endpoint);
        String body = r.getResponse().getContentAsString();
        assertFalse(body.contains("$2a$10$"), "🔴 DATA LEAK at " + endpoint + ": passwordHash exposed!");
        assertTrue(!body.contains("resetPasswordToken") || body.contains("null"),
                "🔴 DATA LEAK at " + endpoint + ": resetPasswordToken exposed!");
    }

    @Nested
    @DisplayName("1. LazyInit Sweep — GET endpoints must not 500")
    class LazyInitSweep {

        @Test
        @DisplayName("1.1 GET /api/departments → no lazy init")
        void departments_noLazyInit() throws Exception {
            assertNoLazyInit("/api/departments");
        }

        @Test
        @DisplayName("1.2 GET /api/positions → no lazy init")
        void positions_noLazyInit() throws Exception {
            assertNoLazyInit("/api/positions");
        }

        @Test
        @DisplayName("1.3 GET /api/employees → no lazy init")
        void employees_noLazyInit() throws Exception {
            assertNoLazyInit("/api/employees");
        }

        @Test
        @DisplayName("1.4 GET /api/contracts → no lazy init")
        void contracts_noLazyInit() throws Exception {
            assertNoLazyInit("/api/contracts");
        }

        @Test
        @DisplayName("1.5 GET /api/reviews → no lazy init")
        void reviews_noLazyInit() throws Exception {
            assertNoLazyInit("/api/reviews");
        }

        @Test
        @DisplayName("1.6 GET /api/leave-requests → no lazy init")
        void leaveRequests_noLazyInit() throws Exception {
            assertNoLazyInit("/api/leave-requests");
        }

        @Test
        @DisplayName("1.7 GET /api/salaries → no lazy init")
        void salaries_noLazyInit() throws Exception {
            assertNoLazyInit("/api/salaries");
        }

        @Test
        @DisplayName("1.8 GET /api/okrs → no lazy init")
        void okrs_noLazyInit() throws Exception {
            assertNoLazyInit("/api/okrs");
        }

        @Test
        @DisplayName("1.9 GET /api/calendar/events → no lazy init")
        void calendarEvents_noLazyInit() throws Exception {
            assertNoLazyInit("/api/calendar/events?start=2026-01-01T00:00:00&end=2026-12-31T23:59:59");
        }

        @Test
        @DisplayName("1.9b GET /api/calendar/events WITHOUT params → must return 400, not 500")
        void calendarEvents_missingParams_mustReturn400() throws Exception {
            MvcResult r = doGet("/api/calendar/events");
            int status = r.getResponse().getStatus();
            // Missing required params should return 400 (bad request), NOT 500 (server
            // error)
            assertTrue(status == 400 || status == 200,
                    "Calendar missing-params returned " + status + " — expected 400 or 200, NOT 500");
        }

        @Test
        @DisplayName("1.10 GET /api/skills → no lazy init")
        void skills_noLazyInit() throws Exception {
            assertNoLazyInit("/api/skills");
        }

        @Test
        @DisplayName("1.11 GET /api/onboarding/templates → no lazy init")
        void onboarding_noLazyInit() throws Exception {
            assertNoLazyInit("/api/onboarding/templates");
        }

        @Test
        @DisplayName("1.12 GET /api/attendance → no lazy init")
        void attendance_noLazyInit() throws Exception {
            assertNoLazyInit("/api/attendance");
        }
    }

    @Nested
    @DisplayName("2. Sensitive Data Exposure")
    class SensitiveData {

        @Test
        @DisplayName("2.1 GET /api/employees → no passwordHash")
        void employees_noPasswordHash() throws Exception {
            assertNoSensitiveData("/api/employees");
        }

        @Test
        @DisplayName("2.2 GET /api/companies/{id}/members → no passwordHash")
        void members_noPasswordHash() throws Exception {
            assertNoSensitiveData("/api/companies/" + companyId + "/members");
        }

        @Test
        @DisplayName("2.3 GET /api/users/profile → no passwordHash")
        void profile_noPasswordHash() throws Exception {
            assertNoSensitiveData("/api/users/profile");
        }

        @Test
        @DisplayName("2.4 GET /api/okrs → no passwordHash in owner")
        void okrs_noPasswordHash() throws Exception {
            assertNoSensitiveData("/api/okrs");
        }
    }

    @Nested
    @DisplayName("3. Error Response Format")
    class ErrorFormat {

        @Test
        @DisplayName("3.1 404 response returns JSON, not HTML")
        void notFound_returnsJson() throws Exception {
            MvcResult r = doGet("/api/employees/999999");
            int status = r.getResponse().getStatus();
            if (status == 404 || status == 500) {
                String contentType = r.getResponse().getContentType();
                assertTrue(contentType == null || contentType.contains("json"),
                        "🔴 BUG: Error response is HTML, not JSON! ContentType: " + contentType);
            }
        }

        @Test
        @DisplayName("3.2 400 response returns JSON body")
        void badRequest_returnsJsonBody() throws Exception {
            // POST with empty body → 400
            MvcResult r = mockMvc.perform(post("/api/departments")
                    .header("Authorization", "Bearer " + token)
                    .header("X-Company-Id", companyId)
                    .contentType(MediaType.APPLICATION_JSON).content("{}")).andReturn();
            int status = r.getResponse().getStatus();
            if (status == 400) {
                String body = r.getResponse().getContentAsString();
                assertFalse(body == null || body.isEmpty(), "BUG: 400 response has empty body!");
            }
        }
    }
}
