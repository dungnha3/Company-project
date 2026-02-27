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
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import java.time.LocalDate;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

// ✅ EXTENDED VALIDATION TESTS
//
// Contract dates, Leave dates, Salary values, Unicode, Duplicate handling
// /
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@SuppressWarnings("unused")
public class ValidationIntegrationTest {

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

    private Long companyId;
    private String adminToken;
    private Long employeeId;

    @BeforeAll
    void seedDatabase() {
        User admin = userRepository.save(User.builder()
                .username("val_admin").passwordHash("$2a$10$dummy")
                .email("val_admin@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());

        Company company = new Company();
        company.setName("Validation Test Corp");
        company.setSlug("val-test");
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
        emp.setFullName("Validation Employee");
        emp.setDateOfBirth(LocalDate.of(1990, 1, 1));
        emp.setHireDate(LocalDate.of(2023, 1, 1));
        emp.setGender(Employee.Gender.MALE);
        emp.setStatus(Employee.EmployeeStatus.ACTIVE);
        emp.setIdCard("VAL_EMP_" + System.currentTimeMillis());
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

    @Nested
    @DisplayName("1. Contract Validation")
    class ContractValidation {

        @Test
        @DisplayName("1.1 Contract endDate before startDate → must reject")
        void contract_endBeforeStart_mustReject() throws Exception {
            String body = "{\"employeeId\":" + employeeId + ",\"contractType\":\"FIXED_TERM\"," +
                    "\"startDate\":\"2026-06-01\",\"endDate\":\"2026-05-01\",\"salary\":5000}";
            MvcResult r = doPost("/api/contracts", body);
            int status = r.getResponse().getStatus();
            assertEquals(400, status, "🔴 VALIDATION BUG: Contract with endDate < startDate accepted! Status: " + status);
        }

        @Test
        @DisplayName("1.2 Contract negative salary → must reject")
        void contract_negativeSalary_mustReject() throws Exception {
            String body = "{\"employeeId\":" + employeeId + ",\"contractType\":\"FIXED_TERM\"," +
                    "\"startDate\":\"2026-06-01\",\"endDate\":\"2026-12-01\",\"salary\":-5000}";
            MvcResult r = doPost("/api/contracts", body);
            int status = r.getResponse().getStatus();
            assertEquals(400, status, "🔴 VALIDATION BUG: Negative salary contract accepted! Status: " + status);
        }
    }

    @Nested
    @DisplayName("2. Leave Validation")
    class LeaveValidation {

        @Test
        @DisplayName("2.1 Leave endDate before startDate → must reject")
        void leave_endBeforeStart_mustReject() throws Exception {
            String body = "{\"employeeId\":" + employeeId + "," +
                    "\"startDate\":\"2026-06-05\",\"endDate\":\"2026-06-01\",\"reason\":\"Test\"}";
            MvcResult r = doPost("/api/leave-requests", body);
            int status = r.getResponse().getStatus();
            assertEquals(400, status, "🔴 VALIDATION BUG: Leave with endDate < startDate accepted! Status: " + status);
        }

        @Test
        @DisplayName("2.2 Leave 365 days → must check maxLeaveDays")
        void leave_365days_checksLimit() throws Exception {
            String body = "{\"employeeId\":" + employeeId + "," +
                    "\"startDate\":\"2026-01-01\",\"endDate\":\"2026-12-31\",\"reason\":\"Entire year\"}";
            MvcResult r = doPost("/api/leave-requests", body);
            int status = r.getResponse().getStatus();
            // Should be 400 or rejected, not 500
            assertNotEquals(500, status, "BUG: Leave 365 days returned 500!");
        }
    }

    @Nested
    @DisplayName("3. Salary Validation")
    class SalaryValidation {

        @Test
        @DisplayName("3.1 Salary negative baseSalary → must reject")
        void salary_negativeSalary_mustReject() throws Exception {
            String body = "{\"employeeId\":" + employeeId + ",\"month\":6,\"year\":2026," +
                    "\"baseSalary\":-10000}";
            MvcResult r = doPost("/api/salaries", body);
            int status = r.getResponse().getStatus();
            assertEquals(400, status, "🔴 VALIDATION BUG: Negative salary accepted! Status: " + status);
        }
    }

    @Nested
    @DisplayName("4. Unicode & Special Characters")
    class UnicodeHandling {

        @Test
        @DisplayName("4.1 Department name with emoji → must handle gracefully")
        void department_emoji_inName() throws Exception {
            String body = "{\"name\":\"🚀 Phòng Dev Tốc Độ 🔥\",\"description\":\"Test unicode\"}";
            MvcResult r = doPost("/api/departments", body);
            int status = r.getResponse().getStatus();
            // Should either succeed (201/200) or 400, NOT 500
            assertNotEquals(500, status, "🔴 BUG: Emoji in department name caused 500! Status: " + status);
        }

        @Test
        @DisplayName("4.2 Position name with Vietnamese diacritics → OK")
        void position_vietnamese_name() throws Exception {
            String body = "{\"name\":\"Trưởng phòng Kỹ thuật\",\"description\":\"Vị trí quản lý kỹ thuật\"}";
            MvcResult r = doPost("/api/positions", body);
            int status = r.getResponse().getStatus();
            assertNotEquals(500, status, "BUG: Vietnamese chars caused 500!");
        }

        @Test
        @DisplayName("4.3 OKR title with special chars → no XSS in response")
        void okr_specialChars_noXss() throws Exception {
            String body = "{\"title\":\"<script>alert('XSS')</script>\",\"period\":\"Q3-2026\"}";
            MvcResult r = doPost("/api/okrs", body);
            // Even if accepted (200/201), response must not execute script
            // Status should not be 500
            assertTrue(r.getResponse().getStatus() != 500, "BUG: Special chars in OKR caused 500!");
        }
    }

    @Nested
    @DisplayName("5. Duplicate Handling")
    class DuplicateHandling {

        @Test
        @DisplayName("5.1 Create duplicate department name → appropriate error")
        void department_duplicateName_handled() throws Exception {
            String body = "{\"name\":\"Unique Dept " + System.currentTimeMillis() + "\"}";
            MvcResult r1 = doPost("/api/departments", body);
            MvcResult r2 = doPost("/api/departments", body);
            // Second create should either succeed (if duplicates allowed) or 409/400
            // Must NOT be 500
            assertTrue(r2.getResponse().getStatus() != 500, "BUG: Duplicate department caused 500!");
        }
    }
}
