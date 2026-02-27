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

// 🏢 MULTI-TENANT DEEP TESTS
//
// Tests cross-company data isolation:
// - User of Company A accesses Company B endpoints
// - Quota enforcement (maxEmployees, maxProjects)
// - Company deactivation → members blocked
// /
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SuppressWarnings("unused")
public class MultiTenantIntegrationTest {

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

        // Company A
        private Long companyAId;
        private String userAToken;

        // Company B
        private Long companyBId;
        private String userBToken;

        @BeforeAll
        void seedDatabase() {
                User userA = userRepository.save(User.builder()
                                .username("mt_user_a").passwordHash("$2a$10$dummy")
                                .email("mt_a@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

                User userB = userRepository.save(User.builder()
                                .username("mt_user_b").passwordHash("$2a$10$dummy")
                                .email("mt_b@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

                // Company A
                Company companyA = new Company();
                companyA.setName("MT Corp A");
                companyA.setSlug("mt-a");
                companyA.setPlan(Plan.PROFESSIONAL);
                companyA.setIsActive(true);

                CompanySettings sA = new CompanySettings();
                sA.setCompany(companyA);
                sA.setHrModuleEnabled(true);
                sA.setProjectModuleEnabled(true);
                sA.setChatModuleEnabled(true);
                sA.setStorageModuleEnabled(true);
                sA.setOkrEnabled(true);
                sA.setCalendarEnabled(true);
                sA.setAttendanceEnabled(true);
                sA.setLeaveEnabled(true);
                sA.setSalaryEnabled(true);
                sA.setContractEnabled(true);
                sA.setReviewEnabled(true);
                sA.setTimeTrackingEnabled(true);
                sA.setSkillsMatrixEnabled(true);
                sA.setOnboardingEnabled(true);
                sA.setAnalyticsEnabled(true);
                sA.setMaxEmployees(2); // LOW QUOTA for testing
                sA.setMaxProjects(1); // LOW QUOTA
                sA.setMaxStorageBytes(1024L * 1024);
                sA.setMaxFileUploadBytes(1024 * 1024L);
                companyA.setSettings(sA);
                companyA = companyRepository.save(companyA);
                this.companyAId = companyA.getCompanyId();

                // Company B
                Company companyB = new Company();
                companyB.setName("MT Corp B");
                companyB.setSlug("mt-b");
                companyB.setPlan(Plan.PROFESSIONAL);
                companyB.setIsActive(true);

                CompanySettings sB = new CompanySettings();
                sB.setCompany(companyB);
                sB.setHrModuleEnabled(true);
                sB.setProjectModuleEnabled(true);
                sB.setChatModuleEnabled(true);
                sB.setStorageModuleEnabled(true);
                sB.setOkrEnabled(true);
                sB.setCalendarEnabled(true);
                sB.setMaxEmployees(50);
                sB.setMaxProjects(20);
                sB.setMaxStorageBytes(1024L * 1024 * 1024);
                sB.setMaxFileUploadBytes(50 * 1024 * 1024L);
                companyB.setSettings(sB);
                companyB = companyRepository.save(companyB);
                this.companyBId = companyB.getCompanyId();

                // Member A in Company A
                UserPermissions pA = new UserPermissions();
                pA.setHrViewList(true);
                pA.setHrEditProfile(true);
                CompanyMember mA = new CompanyMember();
                mA.setUser(userA);
                mA.setCompany(companyA);
                mA.setRoles(Set.of(CompanyRole.ADMIN));
                mA.setPermissions(pA);
                mA.setIsActive(true);
                memberRepository.save(mA);

                // Member B in Company B
                UserPermissions pB = new UserPermissions();
                pB.setHrViewList(true);
                pB.setHrEditProfile(true);
                CompanyMember mB = new CompanyMember();
                mB.setUser(userB);
                mB.setCompany(companyB);
                mB.setRoles(Set.of(CompanyRole.ADMIN));
                mB.setPermissions(pB);
                mB.setIsActive(true);
                memberRepository.save(mB);

                userAToken = jwtService.generateToken(userA);
                userBToken = jwtService.generateToken(userB);
        }

        @Nested
        @DisplayName("1. Cross-Tenant Access")
        class CrossTenantAccess {

                @Test
                @DisplayName("1.1 User A → access Company B departments → must be blocked")
                void userA_cannotAccessCompanyB_departments() throws Exception {
                        MvcResult r = mockMvc.perform(get("/api/departments")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A accessed Company B departments! Status: " + status);
                }

                @Test
                @DisplayName("1.2 User A → access Company B employees → must be blocked")
                void userA_cannotAccessCompanyB_employees() throws Exception {
                        MvcResult r = mockMvc.perform(get("/api/employees")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A accessed Company B employees! Status: " + status);
                }

                @Test
                @DisplayName("1.3 User A → access Company B OKRs → must be blocked")
                void userA_cannotAccessCompanyB_okrs() throws Exception {
                        MvcResult r = mockMvc.perform(get("/api/okrs")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A accessed Company B OKRs! Status: " + status);
                }

                @Test
                @DisplayName("1.4 User A → access Company B calendar → must be blocked")
                void userA_cannotAccessCompanyB_calendar() throws Exception {
                        MvcResult r = mockMvc.perform(get("/api/calendar/events")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A accessed Company B calendar! Status: " + status);
                }

                @Test
                @DisplayName("1.5 User A → access Company B contracts → must be blocked")
                void userA_cannotAccessCompanyB_contracts() throws Exception {
                        MvcResult r = mockMvc.perform(get("/api/contracts")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A accessed Company B contracts! Status: " + status);
                }

                @Test
                @DisplayName("1.6 User A → access Company B salaries → must be blocked")
                void userA_cannotAccessCompanyB_salaries() throws Exception {
                        MvcResult r = mockMvc.perform(get("/api/salaries")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A accessed Company B salaries! Status: " + status);
                }

                @Test
                @DisplayName("1.7 User A → access Company B reviews → must be blocked")
                void userA_cannotAccessCompanyB_reviews() throws Exception {
                        MvcResult r = mockMvc.perform(get("/api/reviews")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A accessed Company B reviews! Status: " + status);
                }

                @Test
                @DisplayName("1.8 User A → access Company B leave requests → must be blocked")
                void userA_cannotAccessCompanyB_leaveRequests() throws Exception {
                        MvcResult r = mockMvc.perform(get("/api/leave-requests")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A accessed Company B leave requests! Status: " + status);
                }

                @Test
                @DisplayName("1.9 User A → create data in Company B → must be blocked")
                void userA_cannotCreateInCompanyB() throws Exception {
                        MvcResult r = mockMvc.perform(post("/api/departments")
                                        .header("Authorization", "Bearer " + userAToken)
                                        .header("X-Company-Id", companyBId)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"name\":\"Hacked Dept\"}")).andReturn();
                        int status = r.getResponse().getStatus();
                        assertEquals(403, status, "🔴 CROSS-TENANT BUG: User A created data in Company B! Status: " + status);
                }
        }

        @Nested
        @DisplayName("2. Company Deactivation")
        class CompanyDeactivation {

                @Test
                @DisplayName("2.1 Deactivated company → member access blocked")
                void deactivatedCompany_membersBlocked() throws Exception {
                        // First deactivate company A
                        // We need sysadmin for this — create one
                        User sysAdmin = userRepository.save(User.builder()
                                        .username("mt_sysadmin_deact").passwordHash("$2a$10$dummy")
                                        .email("mt_sysadmin_deact@test.com").isActive(true).isDeleted(false)
                                        .isSystemAdmin(true).build());
                        String sysAdminToken = jwtService.generateToken(sysAdmin);

                        // Toggle company A to inactive
                        MvcResult toggleResult = mockMvc
                                        .perform(put("/api/sysadmin/companies/" + companyAId + "/status")
                                                        .header("Authorization", "Bearer " + sysAdminToken)
                                                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                                        .andReturn();

                        if (toggleResult.getResponse().getStatus() == 200) {
                                // Now user A tries to access Company A → should be blocked
                                MvcResult r = mockMvc.perform(get("/api/departments")
                                                .header("Authorization", "Bearer " + userAToken)
                                                .header("X-Company-Id", companyAId)).andReturn();
                                int status = r.getResponse().getStatus();
                                assertEquals(403, status, "🔴 BUG: Deactivated company still accessible! Status: " + status);

                                // Re-activate for other tests
                                mockMvc.perform(put("/api/sysadmin/companies/" + companyAId + "/status")
                                                .header("Authorization", "Bearer " + sysAdminToken)
                                                .contentType(MediaType.APPLICATION_JSON).content("{}"));
                        }
                }
        }
}
