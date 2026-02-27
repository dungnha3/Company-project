package DoAn.BE.common.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.junit.jupiter.api.Assertions.*;

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
import DoAn.BE.hrm.entity.*;
import DoAn.BE.hrm.repository.*;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import java.time.LocalDate;
import java.util.Set;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SuppressWarnings("unused")
public class WorkflowIntegrationTest {

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
    private EmployeeRepository employeeRepository;
    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    private Long companyId;
    private String adminToken;
    private Long employeeId;

    @BeforeAll
    void seedDatabase() {
        User admin = userRepository.save(User.builder()
                .username("wf_admin").passwordHash("$2a$10$dummy")
                .email("wf_admin@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

        Company company = new Company();
        company.setName("Workflow Test Corp");
        company.setSlug("wf-test");
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
        perms.setLeaveApprove(true);

        CompanyMember member = new CompanyMember();
        member.setUser(admin);
        member.setCompany(company);
        member.setRoles(Set.of(CompanyRole.ADMIN));
        member.setPermissions(perms);
        member.setIsActive(true);
        memberRepository.save(member);

        Employee emp = new Employee();
        emp.setUser(admin);
        emp.setCompany(company);
        emp.setFullName("Workflow Employee");
        emp.setDateOfBirth(LocalDate.of(1990, 1, 1));
        emp.setHireDate(LocalDate.of(2023, 1, 1));
        emp.setGender(Employee.Gender.MALE);
        emp.setStatus(Employee.EmployeeStatus.ACTIVE);
        emp.setIdCard("WF_EMP_" + System.currentTimeMillis());
        emp = employeeRepository.save(emp);
        this.employeeId = emp.getEmployeeId();

        adminToken = jwtService.generateToken(admin);
    }

    private MvcResult doPost(String url, String body) throws Exception {
        return mockMvc.perform(post(url)
                .header("Authorization", "Bearer " + adminToken)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
    }

    private MvcResult doPatch(String url, String body) throws Exception {
        return mockMvc.perform(patch(url)
                .header("Authorization", "Bearer " + adminToken)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON).content(body != null ? body : "{}")).andReturn();
    }

    // ===== 1. Leave Request Workflow =====

    @Nested
    @DisplayName("1. Leave Request Workflow")
    class LeaveWorkflow {

        @Test
        @DisplayName("1.1 Create leave -> Approve -> APPROVED")
        void leave_create_then_approve() throws Exception {
            String body = "{\"employeeId\":" + employeeId + ",\"leaveType\":\"ANNUAL\",\"startDate\":\"2026-08-01\"," +
                    "\"endDate\":\"2026-08-03\",\"reason\":\"Workflow test\"}";
            MvcResult createResult = doPost("/api/leave-requests", body);
            int createStatus = createResult.getResponse().getStatus();
            assertTrue(createStatus == 200 || createStatus == 201,
                    "Leave creation failed: " + createStatus + " body: "
                            + createResult.getResponse().getContentAsString().substring(0,
                                    Math.min(200, createResult.getResponse().getContentAsString().length())));

            Long leaveId = extractId(createResult.getResponse().getContentAsString(), "leaveRequestId", "id");
            assertNotNull(leaveId, "Failed to extract leave ID from response");

            MvcResult approveResult = doPatch("/api/leave-requests/" + leaveId + "/approve",
                    "{\"comment\":\"Approved\"}");
            assertEquals(200, approveResult.getResponse().getStatus(),
                    "Approve failed: " + approveResult.getResponse().getStatus());
        }

        @Test
        @DisplayName("1.2 Reject already-approved leave -> must return 400/409")
        void leave_rejectApproved_handled() throws Exception {
            String body = "{\"employeeId\":" + employeeId + ",\"leaveType\":\"ANNUAL\",\"startDate\":\"2026-09-01\"," +
                    "\"endDate\":\"2026-09-02\",\"reason\":\"Reject test\"}";
            MvcResult createResult = doPost("/api/leave-requests", body);
            assertTrue(createResult.getResponse().getStatus() == 200 || createResult.getResponse().getStatus() == 201,
                    "Leave creation failed: " + createResult.getResponse().getStatus());

            Long leaveId = extractId(createResult.getResponse().getContentAsString(), "leaveRequestId", "id");
            assertNotNull(leaveId, "Failed to extract leave ID");

            doPatch("/api/leave-requests/" + leaveId + "/approve", "{\"comment\":\"OK\"}");

            MvcResult rejectResult = doPatch("/api/leave-requests/" + leaveId + "/reject",
                    "{\"comment\":\"Changed mind\"}");
            int status = rejectResult.getResponse().getStatus();
            // Invalid state transition must return 400/409, NOT 200 (silently succeed) or
            // 500 (crash)
            assertTrue(status == 400 || status == 409,
                    "Reject-after-approve should be 400/409 but got: " + status);
        }
    }

    // ===== 2. Contract Workflow =====

    @Nested
    @DisplayName("2. Contract Workflow")
    class ContractWorkflow {

        @Test
        @DisplayName("2.1 Cancel contract -> must succeed")
        void contract_cancel_handled() throws Exception {
            String body = "{\"employeeId\":" + employeeId + ",\"contractType\":\"FIXED_TERM\"," +
                    "\"startDate\":\"2026-07-01\",\"endDate\":\"2026-12-31\",\"salary\":5000}";
            MvcResult createResult = doPost("/api/contracts", body);
            assertTrue(createResult.getResponse().getStatus() == 200 || createResult.getResponse().getStatus() == 201,
                    "Contract creation failed: " + createResult.getResponse().getStatus());

            Long contractId = extractId(createResult.getResponse().getContentAsString(), "contractId", "id");
            assertNotNull(contractId, "Failed to extract contract ID");

            MvcResult cancelResult = doPatch("/api/contracts/" + contractId + "/cancel", null);
            int status = cancelResult.getResponse().getStatus();
            assertTrue(status == 200 || status == 204,
                    "Cancel should be 200/204 but got: " + status);
        }

        @Test
        @DisplayName("2.2 Cancel already-cancelled -> handled gracefully")
        void contract_doubleCancelHandled() throws Exception {
            String body = "{\"employeeId\":" + employeeId + ",\"contractType\":\"PROBATION\"," +
                    "\"startDate\":\"2026-10-01\",\"endDate\":\"2026-12-31\",\"salary\":3000}";
            MvcResult createResult = doPost("/api/contracts", body);
            assertTrue(createResult.getResponse().getStatus() == 200 || createResult.getResponse().getStatus() == 201,
                    "Contract creation failed: " + createResult.getResponse().getStatus());

            Long contractId = extractId(createResult.getResponse().getContentAsString(), "contractId", "id");
            assertNotNull(contractId, "Failed to extract contract ID");

            doPatch("/api/contracts/" + contractId + "/cancel", null);
            MvcResult secondCancel = doPatch("/api/contracts/" + contractId + "/cancel", null);
            int status = secondCancel.getResponse().getStatus();
            // Double cancel: 400/409 (proper error) or 200 (idempotent) are acceptable
            assertTrue(status == 400 || status == 409 || status == 200,
                    "Double cancel should be 400/409/200 but got: " + status);
        }
    }

    // ===== 3. Salary Workflow =====

    @Nested
    @DisplayName("3. Salary Workflow")
    class SalaryWorkflow {

        @Test
        @DisplayName("3.1 Create -> Mark paid -> Cancel paid -> checked")
        void salary_fullLifecycle() throws Exception {
            String body = "{\"employeeId\":" + employeeId + ",\"month\":7,\"year\":2026," +
                    "\"baseSalary\":5000,\"allowance\":500}";
            MvcResult createResult = doPost("/api/salaries", body);
            assertTrue(createResult.getResponse().getStatus() == 200 || createResult.getResponse().getStatus() == 201,
                    "Salary creation failed: " + createResult.getResponse().getStatus());

            Long salaryId = extractId(createResult.getResponse().getContentAsString(), "salaryId", "id");
            assertNotNull(salaryId, "Failed to extract salary ID");

            MvcResult paidResult = doPatch("/api/salaries/" + salaryId + "/mark-paid", null);
            assertTrue(paidResult.getResponse().getStatus() == 200 || paidResult.getResponse().getStatus() == 204,
                    "Mark paid should be 200/204 but got: " + paidResult.getResponse().getStatus());

            MvcResult cancelResult = doPatch("/api/salaries/" + salaryId + "/cancel", null);
            int cancelStatus = cancelResult.getResponse().getStatus();
            assertTrue(cancelStatus == 400 || cancelStatus == 409 || cancelStatus == 200,
                    "Cancel paid salary should be 400/409/200 but got: " + cancelStatus);
        }
    }

    // ===== 4. Review Workflow =====

    @Nested
    @DisplayName("4. Review Workflow")
    class ReviewWorkflow {

        @Test
        @DisplayName("4.1 Create -> Submit -> Approve lifecycle")
        void review_fullLifecycle() throws Exception {
            String body = "{\"employeeId\":" + employeeId +
                    ",\"reviewPeriod\":\"2026-H1\",\"reviewType\":\"ANNUAL\"" +
                    ",\"technicalScore\":8.0,\"attitudeScore\":7.5" +
                    ",\"softSkillsScore\":7.0,\"teamworkScore\":8.5" +
                    ",\"startDate\":\"2026-01-01\",\"endDate\":\"2026-06-30\"}";
            MvcResult createResult = doPost("/api/reviews", body);
            assertTrue(createResult.getResponse().getStatus() == 200 || createResult.getResponse().getStatus() == 201,
                    "Review creation failed: " + createResult.getResponse().getStatus());

            Long reviewId = extractId(createResult.getResponse().getContentAsString(), "reviewId", "id");
            assertNotNull(reviewId, "Failed to extract review ID");

            MvcResult submitResult = doPatch("/api/reviews/" + reviewId + "/submit", null);
            assertNotEquals(500, submitResult.getResponse().getStatus(), "Review submit crashed with 500!");

            MvcResult approveResult = doPatch("/api/reviews/" + reviewId + "/approve",
                    "{\"note\":\"Confirmed\"}");
            assertNotEquals(500, approveResult.getResponse().getStatus(), "Review approve crashed with 500!");
        }
    }

    // ===== Utilities =====

    private Long extractId(String json, String... fieldNames) {
        for (String field : fieldNames) {
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
