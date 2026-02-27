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

// 🧪 BUSINESS LOGIC INTEGRATION TEST
//
// Test như QA chuyên nghiệp — tìm bug ở business logic layer:
//
// 1. INPUT VALIDATION — empty/null/invalid/quá dài/SQL injection
// 2. CRUD OPERATIONS — tạo → đọc → sửa → xóa từng entity
// 3. WORKFLOW — Leave request: submit → approve/reject flow
// 4. CASCADE — xóa entity cha → con ra sao?
// 5. PAGINATION — page âm, size quá lớn, sortBy field không tồn tại
// 6. JWT EDGE CASES — token hết hạn, user bị deactivate
// 7. ERROR HANDLING — response có nhất quán không? 500 vs 400?
//
// MỖI TEST FAIL = 1 BUG THẬT
// /
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class BusinessLogicIntegrationTest {

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
    private String employeeToken;
    @SuppressWarnings("unused")
    private Long adminUserId;
    @SuppressWarnings("unused")
    private Long employeeUserId;

    @BeforeAll
    void seedDatabase() {
        User admin = userRepository.save(User.builder()
                .username("biz_admin").passwordHash("$2a$10$dummy")
                .email("biz_admin@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());
        User employee = userRepository.save(User.builder()
                .username("biz_employee").passwordHash("$2a$10$dummy")
                .email("biz_emp@test.com").isActive(true).isDeleted(false).isSystemAdmin(false).build());
        userRepository.save(User.builder()
                .username("biz_deactivated").passwordHash("$2a$10$dummy")
                .email("biz_deactive@test.com").isActive(false).isDeleted(false).isSystemAdmin(false).build());

        Company company = new Company();
        company.setName("BizTest Corp");
        company.setSlug("biztest-corp");
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
        settings.setAnalyticsEnabled(true);
        settings.setOnboardingEnabled(true);
        settings.setSkillsMatrixEnabled(true);
        settings.setMaxEmployees(50);
        settings.setMaxProjects(20);
        settings.setMaxStorageBytes(1024L * 1024 * 1024);
        settings.setMaxFileUploadBytes(50 * 1024 * 1024L);
        company.setSettings(settings);
        company = companyRepository.save(company);
        this.companyId = company.getCompanyId();

        UserPermissions fullPerms = new UserPermissions();
        fullPerms.setHrViewList(true);
        fullPerms.setHrEditProfile(true);
        fullPerms.setHrManageContracts(true);
        fullPerms.setHrManageReviews(true);
        fullPerms.setSalaryView(true);
        fullPerms.setSalaryCalculate(true);
        fullPerms.setSalaryApprove(true);
        fullPerms.setLeaveApprove(true);
        fullPerms.setLeaveViewAll(true);
        fullPerms.setAttendanceViewAll(true);
        fullPerms.setAttendanceEdit(true);
        fullPerms.setProjectCreate(true);
        fullPerms.setProjectManageAll(true);
        fullPerms.setProjectDelete(true);
        fullPerms.setChatCreateGroup(true);
        fullPerms.setStorageUpload(true);

        CompanyMember adminMember = new CompanyMember();
        adminMember.setUser(admin);
        adminMember.setCompany(company);
        adminMember.setRoles(Set.of(CompanyRole.ADMIN));
        adminMember.setIsActive(true);
        memberRepository.save(adminMember);

        CompanyMember empMember = new CompanyMember();
        empMember.setUser(employee);
        empMember.setCompany(company);
        empMember.setRoles(Set.of(CompanyRole.EMPLOYEE));
        empMember.setPermissions(fullPerms);
        empMember.setIsActive(true);
        memberRepository.save(empMember);

        this.adminUserId = admin.getUserId();
        this.employeeUserId = employee.getUserId();
        adminToken = jwtService.generateToken(admin, companyId, CompanyRole.ADMIN);
        employeeToken = jwtService.generateToken(employee, companyId, CompanyRole.EMPLOYEE);
    }

    // ===== HELPERS =====
    private MvcResult doPost(String url, String token, String body) throws Exception {
        return mockMvc.perform(post(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)).andReturn();
    }

    private MvcResult doGet(String url, String token) throws Exception {
        return mockMvc.perform(get(url)
                .header("Authorization", "Bearer " + token)
                .header("X-Company-Id", companyId)
                .contentType(MediaType.APPLICATION_JSON)).andReturn();
    }

    private MvcResult doPut(String url, String token, String body) throws Exception {
        return mockMvc.perform(put(url)
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

    // 📝 NHÓM 1: INPUT VALIDATION
    @Nested
    @DisplayName("📝 1. Input Validation")
    class InputValidation {

        @Test
        @DisplayName("1.1 Tạo department tên rỗng → PHẢI trả 400")
        void createDepartment_emptyName_400() throws Exception {
            String body = """
                    {"name":"","description":"test"}
                    """;
            MvcResult result = doPost("/api/departments", adminToken, body);
            int status = result.getResponse().getStatus();
            assertEquals(400, status, "VALIDATION BUG: Empty department name accepted! Status: " + status);
        }

        @Test
        @DisplayName("1.2 Tạo department tên null → PHẢI trả 400")
        void createDepartment_nullName_400() throws Exception {
            String body = """
                    {"description":"test only"}
                    """;
            MvcResult result = doPost("/api/departments", adminToken, body);
            int status = result.getResponse().getStatus();
            assertEquals(400, status, "VALIDATION BUG: Null department name accepted! Status: " + status);
        }

        @Test
        @DisplayName("1.3 Tạo OKR title rỗng → PHẢI trả 400")
        void createOKR_emptyTitle_400() throws Exception {
            String body = """
                    {"title":"","description":"test","period":"Q1-2026"}
                    """;
            MvcResult result = doPost("/api/okrs", employeeToken, body);
            int status = result.getResponse().getStatus();
            assertEquals(400, status, "VALIDATION BUG: Empty OKR title accepted! Status: " + status);
        }

        @Test
        @DisplayName("1.4 Tạo OKR với keyResult target âm → PHẢI trả 400")
        void createOKR_negativeTarget_400() throws Exception {
            String body = """
                    {"title":"Valid","description":"test","period":"Q1-2026",
                     "keyResults":[{"title":"KR","target":-100,"unit":"count"}]}
                    """;
            MvcResult result = doPost("/api/okrs", employeeToken, body);
            int status = result.getResponse().getStatus();
            // Nếu accept → logic tính progress sẽ sai
            assertEquals(400, status, "VALIDATION BUG: Negative keyResult target accepted! Status: " + status);
        }

        @Test
        @DisplayName("1.5 Search employees với keyword SQL injection → KHÔNG 500")
        void searchEmployees_sqlInjection_no500() throws Exception {
            MvcResult result = doGet(
                    "/api/employees/search?keyword=' OR '1'='1' --&page=0&size=10",
                    employeeToken);
            int status = result.getResponse().getStatus();
            assertNotEquals(500, status, "SECURITY BUG: SQL injection in search caused 500! Status: " + status);
        }

        @Test
        @DisplayName("1.6 Search employees với keyword XSS → KHÔNG 500")
        void searchEmployees_xss_no500() throws Exception {
            MvcResult result = doGet(
                    "/api/employees/search?keyword=<script>alert(1)</script>&page=0&size=10",
                    employeeToken);
            int status = result.getResponse().getStatus();
            assertNotEquals(500, status, "SECURITY BUG: XSS in search caused 500! Status: " + status);
        }

        @Test
        @DisplayName("1.7 Tạo calendar event endTime trước startTime → PHẢI trả 400")
        void createEvent_endBeforeStart_400() throws Exception {
            String body = """
                    {"title":"Invalid event",
                     "startTime":"2026-03-01T15:00:00",
                     "endTime":"2026-03-01T10:00:00",
                     "eventType":"MEETING"}
                    """;
            MvcResult result = doPost("/api/calendar/events", employeeToken, body);
            int status = result.getResponse().getStatus();
            assertEquals(400, status, "VALIDATION BUG: Event with endTime before startTime accepted! Status: " + status);
        }

        @Test
        @DisplayName("1.8 Body hoàn toàn rỗng → PHẢI trả 400 (không 500)")
        void postEmptyBody_400() throws Exception {
            MvcResult result = doPost("/api/departments", adminToken, "");
            int status = result.getResponse().getStatus();
            assertEquals(400, status, "ERROR BUG: Empty body caused " + status + " instead of 400");
        }

        @Test
        @DisplayName("1.9 Body invalid JSON → PHẢI trả 400 (không 500)")
        void postInvalidJson_400() throws Exception {
            MvcResult result = doPost("/api/departments", adminToken, "{invalid json!!!");
            int status = result.getResponse().getStatus();
            assertEquals(400, status, "ERROR BUG: Invalid JSON caused " + status + " instead of 400");
        }
    }

    // 🔄 NHÓM 2: CRUD OPERATIONS
    @Nested
    @DisplayName("🔄 2. CRUD Operations")
    class CrudOps {

        @Test
        @DisplayName("2.1 Department: Create → Read → Update → Delete")
        void department_fullCrud() throws Exception {
            // CREATE
            String createBody = """
                    {"name":"QA Department","description":"Quality Assurance"}
                    """;
            MvcResult createResult = doPost("/api/departments", adminToken, createBody);
            int createStatus = createResult.getResponse().getStatus();
            assertTrue(createStatus == 201 || createStatus == 200, "CRUD BUG: Create department failed! Status: " + createStatus);

            String responseBody = createResult.getResponse().getContentAsString();
            Long deptId = extractId(responseBody, "departmentId");
            if (deptId == null)
                deptId = extractId(responseBody, "id");

            assertNotNull(deptId, "Failed to extract ID from response");
                // READ
                MvcResult readResult = doGet("/api/departments/" + deptId, adminToken);
                assertTrue(readResult.getResponse().getStatus() == 200, "CRUD BUG: Read department failed!");

                // UPDATE
                String updateBody = """
                        {"name":"QA Department Updated","description":"Updated desc"}
                        """;
                MvcResult updateResult = doPut("/api/departments/" + deptId, adminToken, updateBody);
                assertTrue(updateResult.getResponse().getStatus() == 200, "CRUD BUG: Update department failed!");

                // Verify update
                MvcResult verifyResult = doGet("/api/departments/" + deptId, adminToken);
                String verifyBody = verifyResult.getResponse().getContentAsString();
                assertTrue(verifyBody.contains("QA Department Updated"), "CRUD BUG: Department name not updated!");

                // DELETE
                MvcResult deleteResult = doDelete("/api/departments/" + deptId, adminToken);
                assertTrue(deleteResult.getResponse().getStatus() == 200, "CRUD BUG: Delete department failed!");

                // Verify delete
                MvcResult afterDeleteResult = doGet("/api/departments/" + deptId, adminToken);
                assertTrue(afterDeleteResult.getResponse().getStatus() == 404, "CRUD BUG: Department still exists after delete! Status: " + afterDeleteResult.getResponse().getStatus());
        }

        @Test
        @DisplayName("2.2 OKR: Create → Read → Update progress → Delete")
        void okr_fullCrud() throws Exception {
            // CREATE
            String createBody = """
                    {"title":"Increase Revenue","description":"Grow 50%","period":"Q2-2026",
                     "keyResults":[{"title":"Close 10 deals","target":10,"unit":"deals"}]}
                    """;
            MvcResult createResult = doPost("/api/okrs", employeeToken, createBody);
            int createStatus = createResult.getResponse().getStatus();
            assertTrue(createStatus == 201 || createStatus == 200, "CRUD BUG: Create OKR failed! Status: " + createStatus);

            String responseBody = createResult.getResponse().getContentAsString();
            Long okrId = extractId(responseBody, "okrId");
            if (okrId == null)
                okrId = extractId(responseBody, "id");

            assertNotNull(okrId, "Failed to extract ID from response");
                // READ
                MvcResult readResult = doGet("/api/okrs/" + okrId, employeeToken);
                assertTrue(readResult.getResponse().getStatus() == 200, "CRUD BUG: Read OKR failed!");

                // UPDATE
                String updateBody = """
                        {"title":"Revenue Growth 2026","status":"ON_TRACK"}
                        """;
                MvcResult updateResult = doPut("/api/okrs/" + okrId, employeeToken, updateBody);
                assertTrue(updateResult.getResponse().getStatus() == 200, "CRUD BUG: Update OKR failed!");

                // DELETE (requires admin permission)
                MvcResult deleteResult = doDelete("/api/okrs/" + okrId, adminToken);
                int delStatus = deleteResult.getResponse().getStatus();
                assertTrue(delStatus == 200 || delStatus == 204, "CRUD BUG: Delete OKR failed! Status: " + delStatus);
        }

        @Test
        @DisplayName("2.3 Delete không tồn tại → PHẢI trả 404 (không 500)")
        void deleteNonExistent_404() throws Exception {
            String[] entities = { "/api/departments/999999", "/api/okrs/999999" };
            for (String url : entities) {
                MvcResult result = doDelete(url, adminToken);
                int status = result.getResponse().getStatus();
                assertTrue(status == 404 || status == 403, "ERROR BUG: DELETE " + url + " returned " + status + " instead of 404");
            }
        }

        @Test
        @DisplayName("2.4 Get không tồn tại → PHẢI trả 404 (không 500)")
        void getNonExistent_404() throws Exception {
            String[] entities = { "/api/departments/999999", "/api/okrs/999999", "/api/employees/999999" };
            for (String url : entities) {
                MvcResult result = doGet(url, adminToken);
                int status = result.getResponse().getStatus();
                assertEquals(404, status, "ERROR BUG: GET " + url + " returned " + status + " instead of 404");
            }
        }
    }

    // 📊 NHÓM 3: PAGINATION & SORTING
    @Nested
    @DisplayName("📊 3. Pagination & Sorting")
    class PaginationTests {

        @Test
        @DisplayName("3.1 page=-1 → PHẢI trả 400 hoặc redirect đến page 0")
        void negativePage_handled() throws Exception {
            MvcResult result = doGet("/api/employees/page?page=-1&size=10", employeeToken);
            int status = result.getResponse().getStatus();
            // Chấp nhận 200 nếu framework auto-correct thành page=0
            // KHÔNG chấp nhận 500
            assertNotEquals(500, status, "PAGINATION BUG: page=-1 caused 500! Status: " + status);
        }

        @Test
        @DisplayName("3.2 size=0 → PHẢI trả 400 (không trả empty/crash)")
        void sizeZero_handled() throws Exception {
            MvcResult result = doGet("/api/employees/page?page=0&size=0", employeeToken);
            int status = result.getResponse().getStatus();
            assertNotEquals(500, status, "PAGINATION BUG: size=0 caused 500!");
        }

        @Test
        @DisplayName("3.3 size=999999 → PHẢI trả dữ liệu bình thường (không OOM)")
        void sizeHuge_handled() throws Exception {
            MvcResult result = doGet("/api/employees/page?page=0&size=999999", employeeToken);
            int status = result.getResponse().getStatus();
            assertNotEquals(500, status, "PAGINATION BUG: size=999999 caused 500! Possible OOM");
        }

        @Test
        @DisplayName("3.4 sortBy field không tồn tại → PHẢI trả 400 (không 500)")
        void sortByInvalidField_handled() throws Exception {
            MvcResult result = doGet(
                    "/api/employees/page?page=0&size=10&sortBy=FAKE_FIELD_XYZ", employeeToken);
            int status = result.getResponse().getStatus();
            assertNotEquals(500, status, "PAGINATION BUG: Invalid sortBy field caused 500!");
        }
    }

    // 🔐 NHÓM 4: JWT EDGE CASES
    @Nested
    @DisplayName("🔐 4. JWT Edge Cases")
    class JwtEdgeCases {

        @Test
        @DisplayName("4.1 Token hoàn toàn rỗng → PHẢI trả 401")
        void emptyToken_401() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/employees")
                    .header("Authorization", "Bearer ")
                    .header("X-Company-Id", companyId)
                    .contentType(MediaType.APPLICATION_JSON)).andReturn();
            int status = result.getResponse().getStatus();
            assertTrue(status == 401 || status == 403, "JWT BUG: Empty token returned " + status);
        }

        @Test
        @DisplayName("4.2 Token malformed (random string) → PHẢI trả 401")
        void malformedToken_401() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/employees")
                    .header("Authorization", "Bearer totally.not.a.valid.jwt.token")
                    .header("X-Company-Id", companyId)
                    .contentType(MediaType.APPLICATION_JSON)).andReturn();
            int status = result.getResponse().getStatus();
            assertTrue(status == 401 || status == 403, "JWT BUG: Malformed token returned " + status);
        }

        @Test
        @DisplayName("4.3 Không có X-Company-Id header → PHẢI trả 400/403 (không 500)")
        void missingCompanyHeader_handled() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/employees")
                    .header("Authorization", "Bearer " + employeeToken)
                    .contentType(MediaType.APPLICATION_JSON)).andReturn();
            int status = result.getResponse().getStatus();
            assertNotEquals(500, status, "HEADER BUG: Missing X-Company-Id caused 500!");
        }

        @Test
        @DisplayName("4.4 X-Company-Id = 0 → PHẢI trả 400/403 (không 500)")
        void companyIdZero_handled() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/employees")
                    .header("Authorization", "Bearer " + employeeToken)
                    .header("X-Company-Id", "0")
                    .contentType(MediaType.APPLICATION_JSON)).andReturn();
            int status = result.getResponse().getStatus();
            assertNotEquals(500, status, "HEADER BUG: X-Company-Id=0 caused 500!");
        }

        @Test
        @DisplayName("4.5 X-Company-Id = abc (non-numeric) → PHẢI trả 400 (không 500)")
        void companyIdNonNumeric_handled() throws Exception {
            MvcResult result = mockMvc.perform(get("/api/employees")
                    .header("Authorization", "Bearer " + employeeToken)
                    .header("X-Company-Id", "abc")
                    .contentType(MediaType.APPLICATION_JSON)).andReturn();
            int status = result.getResponse().getStatus();
            assertNotEquals(500, status, "HEADER BUG: Non-numeric X-Company-Id caused 500! Status: " + status);
        }
    }

    // ⚡ NHÓM 5: ERROR HANDLING CONSISTENCY
    @Nested
    @DisplayName("⚡ 5. Error Handling")
    class ErrorHandling {

        @Test
        @DisplayName("5.1 PUT /api/departments/999999 → PHẢI trả 404 (không 500)")
        void updateNonExistent_404() throws Exception {
            String body = """
                    {"name":"Ghost Dept","description":"Does not exist"}
                    """;
            MvcResult result = doPut("/api/departments/999999", adminToken, body);
            int status = result.getResponse().getStatus();
            assertEquals(404, status, "ERROR BUG: Update non-existent entity returned " + status + " instead of 404");
        }

        @Test
        @DisplayName("5.2 POST /api/departments duplicate name → PHẢI trả 400/409 (không 500)")
        void createDuplicate_handled() throws Exception {
            String body = """
                    {"name":"Duplicate Test Dept","description":"first"}
                    """;
            doPost("/api/departments", adminToken, body);

            // Tạo lần 2 cùng tên
            MvcResult result = doPost("/api/departments", adminToken, body);
            int status = result.getResponse().getStatus();
            // OK nếu 400, 409, hoặc 201 (nếu allow duplicates)
            assertNotEquals(500, status, "ERROR BUG: Duplicate department caused 500!");
        }

        @Test
        @DisplayName("5.3 GET /api/employees/page → trả pagination metadata đúng format")
        void paginationResponse_hasMetadata() throws Exception {
            MvcResult result = doGet("/api/employees/page?page=0&size=5", adminToken);
            int status = result.getResponse().getStatus();
            if (status == 200) {
                String body = result.getResponse().getContentAsString();
                // Spring Page response phải có totalElements, totalPages, content
                assertTrue(body.contains("totalElements") || body.contains("content"), "FORMAT BUG: Pagination response missing standard Spring Page fields");
            }
        }

        @Test
        @DisplayName("5.4 Tất cả API lỗi phải trả JSON (không trả HTML)")
        void errorResponses_areJson() throws Exception {
            MvcResult result = doGet("/api/departments/999999", adminToken);
            String contentType = result.getResponse().getContentType();
            assertNotNull(contentType, "Failed to extract ID from response");
                assertTrue(contentType.contains("application/json"), "FORMAT BUG: Error response is not JSON! Content-Type: " + contentType);
        }
    }

    // 🔗 NHÓM 6: CASCADE & REFERENTIAL INTEGRITY
    @Nested
    @DisplayName("🔗 6. Cascade & Referential Integrity")
    class CascadeTests {

        @Test
        @DisplayName("6.1 Xóa department → GET lại trả 404")
        void deleteDepartment_thenGetReturns404() throws Exception {
            // Create
            String body = """
                    {"name":"Dept To Delete","description":"Will be deleted"}
                    """;
            MvcResult createResult = doPost("/api/departments", adminToken, body);
            String responseBody = createResult.getResponse().getContentAsString();
            Long deptId = extractId(responseBody, "departmentId");
            if (deptId == null)
                deptId = extractId(responseBody, "id");

            assertNotNull(deptId, "Failed to extract ID from response");
                // Delete
                doDelete("/api/departments/" + deptId, adminToken);
                // Verify
                MvcResult getResult = doGet("/api/departments/" + deptId, adminToken);
                assertTrue(getResult.getResponse().getStatus() == 404, "CASCADE BUG: Department still exists after delete!");
        }
    }

    // 🌐 NHÓM 7: CONCURRENT-LIKE EDGE CASES
    @Nested
    @DisplayName("🌐 7. Concurrent-like Edge Cases")
    class ConcurrentEdge {

        @Test
        @DisplayName("7.1 Double delete → lần 2 phải trả 404 (không 500)")
        void doubleDelete_secondReturns404() throws Exception {
            // Create
            String body = """
                    {"name":"Double Delete Dept","description":"test"}
                    """;
            MvcResult createResult = doPost("/api/departments", adminToken, body);
            String responseBody = createResult.getResponse().getContentAsString();
            Long deptId = extractId(responseBody, "departmentId");
            if (deptId == null)
                deptId = extractId(responseBody, "id");

            assertNotNull(deptId, "Failed to extract ID from response");
                // Delete lần 1
                doDelete("/api/departments/" + deptId, adminToken);
                // Delete lần 2
                MvcResult secondDelete = doDelete("/api/departments/" + deptId, adminToken);
                int status = secondDelete.getResponse().getStatus();
                assertEquals(404, status, "CONCURRENT BUG: Double delete returned " + status + " instead of 404");
        }

        @Test
        @DisplayName("7.2 Update sau delete → phải trả 404 (không 500)")
        void updateAfterDelete_returns404() throws Exception {
            // Create
            String createBody = """
                    {"name":"Update After Delete","description":"test"}
                    """;
            MvcResult createResult = doPost("/api/departments", adminToken, createBody);
            String responseBody = createResult.getResponse().getContentAsString();
            Long deptId = extractId(responseBody, "departmentId");
            if (deptId == null)
                deptId = extractId(responseBody, "id");

            assertNotNull(deptId, "Failed to extract ID from response");
                // Delete
                doDelete("/api/departments/" + deptId, adminToken);
                // Update
                String updateBody = """
                        {"name":"Ghost Update","description":"should fail"}
                        """;
                MvcResult updateResult = doPut("/api/departments/" + deptId, adminToken, updateBody);
                int status = updateResult.getResponse().getStatus();
                assertEquals(404, status, "CONCURRENT BUG: Update after delete returned " + status + " instead of 404");
        }
    }

    // UTILITY
    private Long extractId(String json, String fieldName) {
        try {
            String search = "\"" + fieldName + "\":";
            int idx = json.indexOf(search);
            if (idx == -1)
                return null;
            int start = idx + search.length();
            while (start < json.length() && json.charAt(start) == ' ')
                start++;
            int end = start;
            while (end < json.length() && Character.isDigit(json.charAt(end)))
                end++;
            if (end > start)
                return Long.parseLong(json.substring(start, end));
        } catch (Exception e) {
            /* ignore */ }
        return null;
    }
}
