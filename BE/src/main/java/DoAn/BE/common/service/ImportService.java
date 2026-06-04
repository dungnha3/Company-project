package DoAn.BE.common.service;

import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.UserPermissions;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanyMemberRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.hrm.repository.ReviewRepository;
import DoAn.BE.timetracking.repository.TimeLogRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import java.time.LocalDateTime;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportService {

    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ReviewRepository reviewRepository;
    private final TimeLogRepository timeLogRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final IssueRepository issueRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final PasswordEncoder passwordEncoder;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter[] DATE_FMTS = {
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy")
    };

    // ========== EMPLOYEES IMPORT ==========

    public record EmployeeImportResult(
            int successCount,
            int errorCount,
            List<String> errors
    ) {}

    public EmployeeImportResult importEmployeesExcel(MultipartFile file, Long companyId) throws IOException {
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int errorCount = 0;

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                errors.add("Sheet not found in Excel file");
                return new EmployeeImportResult(0, 1, errors);
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                errors.add("Header row not found");
                return new EmployeeImportResult(0, 1, errors);
            }

            Map<String, Integer> headerMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    headerMap.put(getCellStringValue(cell).toLowerCase().trim(), i);
                }
            }

            Integer emailIdx = headerMap.get("email");
            Integer fullNameIdx = headerMap.get("họ tên");
            if (fullNameIdx == null) fullNameIdx = headerMap.get("ho ten");
            if (fullNameIdx == null) fullNameIdx = headerMap.get("full_name");
            Integer dobIdx = headerMap.get("ngày sinh");
            if (dobIdx == null) dobIdx = headerMap.get("date_of_birth");
            Integer genderIdx = headerMap.get("giới tính");
            if (genderIdx == null) genderIdx = headerMap.get("gender");
            Integer phoneIdx = headerMap.get("sđt");
            if (phoneIdx == null) phoneIdx = headerMap.get("phone");
            Integer addressIdx = headerMap.get("địa chỉ");
            if (addressIdx == null) addressIdx = headerMap.get("address");
            Integer hireDateIdx = headerMap.get("ngày vào làm");
            if (hireDateIdx == null) hireDateIdx = headerMap.get("hire_date");
            Integer salaryIdx = headerMap.get("lương cơ bản");
            if (salaryIdx == null) salaryIdx = headerMap.get("base_salary");
            Integer allowanceIdx = headerMap.get("phụ cấp");
            if (allowanceIdx == null) allowanceIdx = headerMap.get("allowance");
            Integer leaveBalanceIdx = headerMap.get("số ngày nghỉ");
            if (leaveBalanceIdx == null) leaveBalanceIdx = headerMap.get("leave_balance");
            Integer statusIdx = headerMap.get("trạng thái");
            if (statusIdx == null) statusIdx = headerMap.get("status");

            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowEmpty(row)) continue;

                try {
                    String email = emailIdx != null ? getCellStringValue(row.getCell(emailIdx)) : null;
                    String fullName = fullNameIdx != null ? getCellStringValue(row.getCell(fullNameIdx)) : null;

                    if (email == null || email.isBlank()) {
                        errors.add("Row " + (rowNum + 1) + ": Email is required");
                        errorCount++;
                        continue;
                    }
                    if (fullName == null || fullName.isBlank()) {
                        errors.add("Row " + (rowNum + 1) + ": Full name is required");
                        errorCount++;
                        continue;
                    }

                    // Find or create user
                    User user = userRepository.findByEmail(email).orElse(null);
                    if (user == null) {
                        user = userRepository.findByUsername(email).orElse(null);
                    }

                    Company company = companyRepository.findById(companyId)
                            .orElseThrow(() -> new ResourceNotFoundException("Company not found"));

                    CompanyMember member = null;
                    if (user == null) {
                        // Create shadow user
                        user = new User();
                        user.setEmail(email);
                        user.setUsername(email);
                        user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
                        user.setStatus(User.UserStatus.PENDING_ACTIVATION);
                        user.setActivationToken(java.util.UUID.randomUUID().toString());
                        user.setIsActive(false);
                        user = userRepository.save(user);

                        // Create company member
                        member = new CompanyMember();
                        member.setUser(user);
                        member.setCompany(company);
                        member.getRoles().add(CompanyRole.EMPLOYEE);
                        member.setPermissions(UserPermissions.defaultFor(CompanyRole.EMPLOYEE));
                        member.setInvitedAt(LocalDateTime.now());
                        member.setJoinedAt(LocalDateTime.now());
                        member.setIsActive(false);
                        member = companyMemberRepository.save(member);
                    } else {
                        // If user exists, check if they are a member of the company
                        member = companyMemberRepository.findByUser_UserIdAndCompany_CompanyId(user.getUserId(), companyId).orElse(null);
                        if (member == null) {
                            member = new CompanyMember();
                            member.setUser(user);
                            member.setCompany(company);
                            member.getRoles().add(CompanyRole.EMPLOYEE);
                            member.setPermissions(UserPermissions.defaultFor(CompanyRole.EMPLOYEE));
                            member.setInvitedAt(LocalDateTime.now());
                            member.setJoinedAt(LocalDateTime.now());
                            member.setIsActive(true); // already active user
                            member = companyMemberRepository.save(member);
                        }
                    }

                    if (employeeRepository.findByUser_UserIdAndCompany_CompanyId(user.getUserId(), companyId).isPresent()) {
                        errors.add("Row " + (rowNum + 1) + ": Employee already exists for user '" + email + "'");
                        errorCount++;
                        continue;
                    }

                    Employee emp = new Employee();
                    emp.setUser(user);
                    emp.setCompanyMember(member);
                    emp.setCompany(company);
                    emp.setFullName(fullName);

                    if (dobIdx != null) {
                        String dobStr = getCellStringValue(row.getCell(dobIdx));
                        if (dobStr != null && !dobStr.isBlank()) {
                            emp.setDateOfBirth(parseDate(dobStr));
                        }
                    }
                    if (emp.getDateOfBirth() == null) {
                        errors.add("Row " + (rowNum + 1) + ": Date of birth is required");
                        errorCount++;
                        continue;
                    }

                    if (genderIdx != null) {
                        String genderStr = getCellStringValue(row.getCell(genderIdx));
                        if (genderStr != null && !genderStr.isBlank()) {
                            emp.setGender(parseGender(genderStr));
                        }
                    }
                    if (emp.getGender() == null) {
                        emp.setGender(Employee.Gender.OTHER);
                    }

                    if (phoneIdx != null) {
                        emp.setPhone(getCellStringValue(row.getCell(phoneIdx)));
                    }

                    if (addressIdx != null) {
                        emp.setAddress(getCellStringValue(row.getCell(addressIdx)));
                    }

                    if (hireDateIdx != null) {
                        String hireStr = getCellStringValue(row.getCell(hireDateIdx));
                        if (hireStr != null && !hireStr.isBlank()) {
                            emp.setHireDate(parseDate(hireStr));
                        }
                    }
                    if (emp.getHireDate() == null) {
                        emp.setHireDate(LocalDate.now());
                    }

                    if (salaryIdx != null) {
                        String salaryStr = getCellStringValue(row.getCell(salaryIdx));
                        if (salaryStr != null && !salaryStr.isBlank()) {
                            emp.setBaseSalary(new BigDecimal(salaryStr.replace(",", "").replace(" ", "")));
                        }
                    }

                    if (allowanceIdx != null) {
                        String allowStr = getCellStringValue(row.getCell(allowanceIdx));
                        if (allowStr != null && !allowStr.isBlank()) {
                            emp.setAllowance(new BigDecimal(allowStr.replace(",", "").replace(" ", "")));
                        }
                    }

                    if (leaveBalanceIdx != null) {
                        String lbStr = getCellStringValue(row.getCell(leaveBalanceIdx));
                        if (lbStr != null && !lbStr.isBlank()) {
                            emp.setLeaveBalance(Integer.parseInt(lbStr.trim()));
                        }
                    }
                    if (emp.getLeaveBalance() == null) {
                        emp.setLeaveBalance(12);
                    }

                    if (statusIdx != null) {
                        String statusStr = getCellStringValue(row.getCell(statusIdx));
                        if (statusStr != null && !statusStr.isBlank()) {
                            emp.setStatus(parseEmployeeStatus(statusStr));
                        }
                    }
                    if (emp.getStatus() == null) {
                        emp.setStatus(Employee.EmployeeStatus.ACTIVE);
                    }

                    employeeRepository.save(emp);
                    successCount++;

                } catch (Exception e) {
                    errors.add("Row " + (rowNum + 1) + ": " + e.getMessage());
                    errorCount++;
                }
            }
        }

        return new EmployeeImportResult(successCount, errorCount, errors);
    }

    // ========== LEAVES IMPORT ==========

    public record LeaveImportResult(
            int successCount,
            int errorCount,
            List<String> errors
    ) {}

    public LeaveImportResult importLeavesExcel(MultipartFile file, Long companyId) throws IOException {
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int errorCount = 0;

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                errors.add("Sheet not found in Excel file");
                return new LeaveImportResult(0, 1, errors);
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                errors.add("Header row not found");
                return new LeaveImportResult(0, 1, errors);
            }

            Map<String, Integer> headerMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    headerMap.put(getCellStringValue(cell).toLowerCase().trim(), i);
                }
            }

            Integer emailIdx = headerMap.get("email nhân viên");
            if (emailIdx == null) emailIdx = headerMap.get("email");
            Integer empNameIdx = headerMap.get("họ tên nv");
            if (empNameIdx == null) empNameIdx = headerMap.get("họ tên");
            Integer leaveTypeIdx = headerMap.get("loại nghỉ");
            if (leaveTypeIdx == null) leaveTypeIdx = headerMap.get("leave_type");
            Integer startDateIdx = headerMap.get("từ ngày");
            if (startDateIdx == null) startDateIdx = headerMap.get("start_date");
            Integer endDateIdx = headerMap.get("đến ngày");
            if (endDateIdx == null) endDateIdx = headerMap.get("end_date");
            Integer reasonIdx = headerMap.get("lý do");
            if (reasonIdx == null) reasonIdx = headerMap.get("reason");
            Integer statusIdx = headerMap.get("trạng thái");
            if (statusIdx == null) statusIdx = headerMap.get("status");

            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowEmpty(row)) continue;

                try {
                    String emailOrName = emailIdx != null ? getCellStringValue(row.getCell(emailIdx)) : null;
                    if (emailOrName == null) emailOrName = empNameIdx != null ? getCellStringValue(row.getCell(empNameIdx)) : null;

                    Employee employee = findEmployeeByEmailOrName(emailOrName, companyId);
                    if (employee == null) {
                        errors.add("Row " + (rowNum + 1) + ": Employee not found for '" + emailOrName + "'");
                        errorCount++;
                        continue;
                    }

                    String startDateStr = startDateIdx != null ? getCellStringValue(row.getCell(startDateIdx)) : null;
                    String endDateStr = endDateIdx != null ? getCellStringValue(row.getCell(endDateIdx)) : null;

                    if (startDateStr == null || startDateStr.isBlank()) {
                        errors.add("Row " + (rowNum + 1) + ": Start date is required");
                        errorCount++;
                        continue;
                    }
                    if (endDateStr == null || endDateStr.isBlank()) {
                        errors.add("Row " + (rowNum + 1) + ": End date is required");
                        errorCount++;
                        continue;
                    }

                    LeaveRequest leave = new LeaveRequest();
                    leave.setEmployee(employee);

                    Company company = new Company();
                    company.setCompanyId(companyId);
                    leave.setCompany(company);

                    leave.setStartDate(parseDate(startDateStr));
                    leave.setEndDate(parseDate(endDateStr));

                    if (leave.getStartDate() == null || leave.getEndDate() == null) {
                        errors.add("Row " + (rowNum + 1) + ": Invalid date format");
                        errorCount++;
                        continue;
                    }

                    if (leaveTypeIdx != null) {
                        String ltStr = getCellStringValue(row.getCell(leaveTypeIdx));
                        if (ltStr != null && !ltStr.isBlank()) {
                            leave.setLeaveType(parseLeaveType(ltStr));
                        }
                    }
                    if (leave.getLeaveType() == null) {
                        leave.setLeaveType(LeaveRequest.LeaveType.OTHER);
                    }

                    if (reasonIdx != null) {
                        leave.setReason(getCellStringValue(row.getCell(reasonIdx)));
                    }

                    if (statusIdx != null) {
                        String stStr = getCellStringValue(row.getCell(statusIdx));
                        if (stStr != null && !stStr.isBlank()) {
                            leave.setStatus(parseLeaveStatus(stStr));
                        }
                    }
                    if (leave.getStatus() == null) {
                        leave.setStatus(LeaveRequest.LeaveStatus.PENDING);
                    }

                    // Check for duplicate: overlapping leave for same employee
                    List<LeaveRequest> overlapping = leaveRequestRepository
                            .findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                                    leave.getEndDate(), leave.getStartDate());
                    boolean isDuplicate = overlapping.stream()
                            .anyMatch(lr -> lr.getEmployee() != null
                                    && lr.getEmployee().getEmployeeId() != null
                                    && lr.getEmployee().getEmployeeId().equals(employee.getEmployeeId())
                                    && lr.getStatus() != LeaveRequest.LeaveStatus.REJECTED);
                    if (isDuplicate) {
                        errors.add("Row " + (rowNum + 1) + ": Nhân viên '" + (employee.getFullName() != null ? employee.getFullName() : emailOrName) + "' đã có đơn nghỉ trùng thời gian (" + startDateStr + " → " + endDateStr + "). Bỏ qua.");
                        errorCount++;
                        continue;
                    }

                    // calculateDays will be called by @PrePersist
                    leaveRequestRepository.save(leave);
                    successCount++;

                } catch (Exception e) {
                    errors.add("Row " + (rowNum + 1) + ": " + e.getMessage());
                    errorCount++;
                }
            }
        }

        return new LeaveImportResult(successCount, errorCount, errors);
    }

    // ========== REVIEWS IMPORT ==========

    public record ReviewImportResult(
            int successCount,
            int errorCount,
            List<String> errors
    ) {}

    public ReviewImportResult importReviewsExcel(MultipartFile file, Long companyId) throws IOException {
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int errorCount = 0;

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                errors.add("Sheet not found in Excel file");
                return new ReviewImportResult(0, 1, errors);
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                errors.add("Header row not found");
                return new ReviewImportResult(0, 1, errors);
            }

            Map<String, Integer> headerMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    headerMap.put(getCellStringValue(cell).toLowerCase().trim(), i);
                }
            }

            Integer empEmailIdx = headerMap.get("email nhân viên");
            if (empEmailIdx == null) empEmailIdx = headerMap.get("email");
            Integer empNameIdx = headerMap.get("họ tên nv");
            if (empNameIdx == null) empNameIdx = headerMap.get("họ tên");
            Integer revEmailIdx = headerMap.get("email người đánh giá");
            if (revEmailIdx == null) revEmailIdx = headerMap.get("reviewer email");
            Integer periodIdx = headerMap.get("kỳ đánh giá");
            if (periodIdx == null) periodIdx = headerMap.get("review_period");
            Integer typeIdx = headerMap.get("loại");
            if (typeIdx == null) typeIdx = headerMap.get("review_type");
            Integer techScoreIdx = headerMap.get("điểm kt");
            if (techScoreIdx == null) techScoreIdx = headerMap.get("technical_score");
            Integer attScoreIdx = headerMap.get("điểm tl");
            if (attScoreIdx == null) attScoreIdx = headerMap.get("attitude_score");
            Integer softScoreIdx = headerMap.get("điểm ss");
            if (softScoreIdx == null) softScoreIdx = headerMap.get("soft_skills_score");
            Integer teamScoreIdx = headerMap.get("điểm tm");
            if (teamScoreIdx == null) teamScoreIdx = headerMap.get("teamwork_score");
            Integer commentsIdx = headerMap.get("bình luận");
            if (commentsIdx == null) commentsIdx = headerMap.get("comments");
            Integer statusIdx = headerMap.get("trạng thái");
            if (statusIdx == null) statusIdx = headerMap.get("status");

            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowEmpty(row)) continue;

                try {
                    String empEmail = empEmailIdx != null ? getCellStringValue(row.getCell(empEmailIdx)) : null;
                    String empName = empNameIdx != null ? getCellStringValue(row.getCell(empNameIdx)) : null;
                    Employee employee = findEmployeeByEmailOrName(empEmail != null ? empEmail : empName, companyId);
                    if (employee == null) {
                        errors.add("Row " + (rowNum + 1) + ": Employee not found for '" + (empEmail != null ? empEmail : empName) + "'");
                        errorCount++;
                        continue;
                    }

                    Employee reviewer = null;
                    String revEmail = revEmailIdx != null ? getCellStringValue(row.getCell(revEmailIdx)) : null;
                    if (revEmail != null && !revEmail.isBlank()) {
                        reviewer = findEmployeeByEmail(revEmail, companyId);
                    }
                    if (reviewer == null) {
                        reviewer = employee; // default to self-review
                    }

                    Review review = new Review();
                    review.setEmployee(employee);
                    review.setReviewer(reviewer);

                    Company company = new Company();
                    company.setCompanyId(companyId);
                    review.setCompany(company);

                    if (periodIdx != null) {
                        String p = getCellStringValue(row.getCell(periodIdx));
                        if (p != null && !p.isBlank()) review.setReviewPeriod(p);
                    }
                    if (review.getReviewPeriod() == null) {
                        review.setReviewPeriod("IMPORTS-" + LocalDate.now().getYear());
                    }

                    if (typeIdx != null) {
                        String t = getCellStringValue(row.getCell(typeIdx));
                        if (t != null && !t.isBlank()) review.setReviewType(parseReviewType(t));
                    }
                    if (review.getReviewType() == null) {
                        review.setReviewType(Review.ReviewType.PERIODIC);
                    }

                    if (techScoreIdx != null) {
                        String s = getCellStringValue(row.getCell(techScoreIdx));
                        if (s != null && !s.isBlank()) review.setTechnicalScore(new BigDecimal(s.trim()));
                    }
                    if (attScoreIdx != null) {
                        String s = getCellStringValue(row.getCell(attScoreIdx));
                        if (s != null && !s.isBlank()) review.setAttitudeScore(new BigDecimal(s.trim()));
                    }
                    if (softScoreIdx != null) {
                        String s = getCellStringValue(row.getCell(softScoreIdx));
                        if (s != null && !s.isBlank()) review.setSoftSkillsScore(new BigDecimal(s.trim()));
                    }
                    if (teamScoreIdx != null) {
                        String s = getCellStringValue(row.getCell(teamScoreIdx));
                        if (s != null && !s.isBlank()) review.setTeamworkScore(new BigDecimal(s.trim()));
                    }

                    if (commentsIdx != null) {
                        review.setComments(getCellStringValue(row.getCell(commentsIdx)));
                    }

                    if (statusIdx != null) {
                        String st = getCellStringValue(row.getCell(statusIdx));
                        if (st != null && !st.isBlank()) review.setStatus(parseReviewStatus(st));
                    }
                    if (review.getStatus() == null) {
                        review.setStatus(Review.ReviewStatus.IN_PROGRESS);
                    }

                    // Check for duplicate: same employee + same period + same type
                    if (employee.getEmployeeId() != null && review.getReviewPeriod() != null && review.getReviewType() != null) {
                        Optional<Review> existing = reviewRepository.findByEmployeeAndPeriodAndType(
                                employee.getEmployeeId(), review.getReviewPeriod(), review.getReviewType());
                        if (existing.isPresent()) {
                            errors.add("Row " + (rowNum + 1) + ": Đã tồn tại đánh giá '" + review.getReviewPeriod() + "' cho nhân viên '" + (empEmail != null ? empEmail : empName) + "'. Bỏ qua.");
                            errorCount++;
                            continue;
                        }
                    }

                    reviewRepository.save(review);
                    successCount++;

                } catch (Exception e) {
                    errors.add("Row " + (rowNum + 1) + ": " + e.getMessage());
                    errorCount++;
                }
            }
        }

        return new ReviewImportResult(successCount, errorCount, errors);
    }

    // ========== ATTENDANCE (TIME LOGS) IMPORT ==========

    public record AttendanceImportResult(
            int successCount,
            int errorCount,
            List<String> errors
    ) {}

    public AttendanceImportResult importAttendanceExcel(MultipartFile file, Long companyId) throws IOException {
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int errorCount = 0;

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                errors.add("Sheet not found in Excel file");
                return new AttendanceImportResult(0, 1, errors);
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                errors.add("Header row not found");
                return new AttendanceImportResult(0, 1, errors);
            }

            Map<String, Integer> headerMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    headerMap.put(getCellStringValue(cell).toLowerCase().trim(), i);
                }
            }

            Integer emailIdx = headerMap.get("email");
            Integer empNameIdx = headerMap.get("họ tên");
            Integer workDateIdx = headerMap.get("ngày làm");
            if (workDateIdx == null) workDateIdx = headerMap.get("work_date");
            Integer hoursIdx = headerMap.get("giờ log");
            if (hoursIdx == null) hoursIdx = headerMap.get("logged_hours");
            Integer descIdx = headerMap.get("mô tả");
            if (descIdx == null) descIdx = headerMap.get("description");

            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowEmpty(row)) continue;

                try {
                    String emailOrName = emailIdx != null ? getCellStringValue(row.getCell(emailIdx)) : null;
                    if (emailOrName == null) emailOrName = empNameIdx != null ? getCellStringValue(row.getCell(empNameIdx)) : null;

                    Employee employee = findEmployeeByEmailOrName(emailOrName, companyId);
                    if (employee == null) {
                        errors.add("Row " + (rowNum + 1) + ": Employee not found for '" + emailOrName + "'");
                        errorCount++;
                        continue;
                    }

                    User user = employee.getUser();
                    if (user == null) {
                        errors.add("Row " + (rowNum + 1) + ": User not found for employee");
                        errorCount++;
                        continue;
                    }

                    String workDateStr = workDateIdx != null ? getCellStringValue(row.getCell(workDateIdx)) : null;
                    if (workDateStr == null || workDateStr.isBlank()) {
                        errors.add("Row " + (rowNum + 1) + ": Work date is required");
                        errorCount++;
                        continue;
                    }

                    String hoursStr = hoursIdx != null ? getCellStringValue(row.getCell(hoursIdx)) : null;
                    if (hoursStr == null || hoursStr.isBlank()) {
                        errors.add("Row " + (rowNum + 1) + ": Hours is required");
                        errorCount++;
                        continue;
                    }

                    Company company = new Company();
                    company.setCompanyId(companyId);

                    DoAn.BE.timetracking.entity.TimeLog log = DoAn.BE.timetracking.entity.TimeLog.builder()
                            .user(user)
                            .company(company)
                            .workDate(parseDate(workDateStr))
                            .loggedHours(new BigDecimal(hoursStr.trim().replace(",", "")))
                            .description(descIdx != null ? getCellStringValue(row.getCell(descIdx)) : null)
                            .createdAt(java.time.LocalDateTime.now())
                            .build();

                    timeLogRepository.save(log);
                    successCount++;

                } catch (Exception e) {
                    errors.add("Row " + (rowNum + 1) + ": " + e.getMessage());
                    errorCount++;
                }
            }
        }

        return new AttendanceImportResult(successCount, errorCount, errors);
    }

    // ========== HELPER METHODS ==========

    private String getCellStringValue(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING -> { return cell.getStringCellValue(); }
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().format(DATE_FMT);
                }
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val)) {
                    return String.valueOf((long) val);
                }
                return String.valueOf(val);
            }
            case BOOLEAN -> { return String.valueOf(cell.getBooleanCellValue()); }
            case FORMULA -> {
                try {
                    return new DataFormatter().formatCellValue(cell);
                } catch (Exception e) {
                    return cell.getStringCellValue();
                }
            }
            default -> { return null; }
        }
    }

    private boolean isRowEmpty(Row row) {
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getCellStringValue(cell);
                if (val != null && !val.trim().isEmpty()) return false;
            }
        }
        return true;
    }

    private LocalDate parseDate(String str) {
        if (str == null || str.isBlank()) return null;
        String cleaned = str.trim();
        for (DateTimeFormatter fmt : DATE_FMTS) {
            try {
                return LocalDate.parse(cleaned, fmt);
            } catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    private Employee.Gender parseGender(String str) {
        if (str == null) return null;
        String s = str.trim().toUpperCase();
        if (s.contains("NAM") || s.equals("M") || s.equals("MALE")) return Employee.Gender.MALE;
        if (s.contains("NU") || s.equals("F") || s.equals("FEMALE")) return Employee.Gender.FEMALE;
        return Employee.Gender.OTHER;
    }

    private Employee.EmployeeStatus parseEmployeeStatus(String str) {
        if (str == null) return null;
        String s = str.trim().toUpperCase();
        if (s.contains("ACTIVE") || s.contains("DANG_LAM") || s.contains("ĐANG LÀM")) return Employee.EmployeeStatus.ACTIVE;
        if (s.contains("RESIGNED") || s.contains("NGHI_VIEC") || s.contains("NGHỈ")) return Employee.EmployeeStatus.RESIGNED;
        if (s.contains("ON_LEAVE") || s.contains("TAM_NGHI") || s.contains("TẠM NGHỈ")) return Employee.EmployeeStatus.ON_LEAVE;
        return Employee.EmployeeStatus.ACTIVE;
    }

    private LeaveRequest.LeaveType parseLeaveType(String str) {
        if (str == null) return LeaveRequest.LeaveType.OTHER;
        String s = str.trim().toUpperCase();
        if (s.contains("ANNUAL") || s.contains("PHEP_NAM") || s.contains("PHÉP NĂM")) return LeaveRequest.LeaveType.ANNUAL;
        if (s.contains("SICK") || s.contains("OM") || s.contains("ỐM")) return LeaveRequest.LeaveType.SICK;
        if (s.contains("UNPAID") || s.contains("KO_LUONG") || s.contains("KHÔNG LƯƠNG")) return LeaveRequest.LeaveType.UNPAID;
        return LeaveRequest.LeaveType.OTHER;
    }

    private LeaveRequest.LeaveStatus parseLeaveStatus(String str) {
        if (str == null) return LeaveRequest.LeaveStatus.PENDING;
        String s = str.trim().toUpperCase();
        if (s.contains("APPROVED") || s.contains("DA_DUYET") || s.contains("ĐÃ DUYỆT")) return LeaveRequest.LeaveStatus.APPROVED;
        if (s.contains("REJECTED") || s.contains("TU_CHOI") || s.contains("TỪ CHỐI")) return LeaveRequest.LeaveStatus.REJECTED;
        return LeaveRequest.LeaveStatus.PENDING;
    }

    private Review.ReviewType parseReviewType(String str) {
        if (str == null) return Review.ReviewType.PERIODIC;
        String s = str.trim().toUpperCase();
        if (s.contains("SPRINT")) return Review.ReviewType.SPRINT_REVIEW;
        if (s.contains("PROJECT_COMPLETION")) return Review.ReviewType.PROJECT_COMPLETION;
        if (s.contains("PERIODIC") || s.contains("KY")) return Review.ReviewType.PERIODIC;
        if (s.contains("PROJECT") || s.contains("DU_AN")) return Review.ReviewType.PROJECT;
        if (s.contains("PROMOTION") || s.contains("THANG_CHUC")) return Review.ReviewType.PROMOTION;
        return Review.ReviewType.PERIODIC;
    }

    private Review.ReviewStatus parseReviewStatus(String str) {
        if (str == null) return Review.ReviewStatus.IN_PROGRESS;
        String s = str.trim().toUpperCase();
        if (s.contains("APPROVED") || s.contains("DA_DUYET") || s.contains("ĐÃ DUYỆT")) return Review.ReviewStatus.APPROVED;
        if (s.contains("REJECTED") || s.contains("TU_CHOI") || s.contains("TỪ CHỐI")) return Review.ReviewStatus.REJECTED;
        if (s.contains("PENDING") || s.contains("CHO_DUYET") || s.contains("CHỜ DUYỆT")) return Review.ReviewStatus.PENDING;
        return Review.ReviewStatus.IN_PROGRESS;
    }

    private Employee findEmployeeByEmailOrName(String identifier, Long companyId) {
        if (identifier == null || identifier.isBlank()) return null;
        String id = identifier.trim();

        // Try email first
        User user = userRepository.findByEmail(id).orElse(null);
        if (user != null) {
            return employeeRepository.findByUser_UserIdAndCompany_CompanyId(user.getUserId(), companyId).orElse(null);
        }

        // Try by full name
        List<Employee> emps = employeeRepository.findByCompanyId(companyId);
        for (Employee emp : emps) {
            if (emp.getFullName() != null && emp.getFullName().equalsIgnoreCase(id)) {
                return emp;
            }
        }

        return null;
    }

    private Employee findEmployeeByEmail(String email, Long companyId) {
        if (email == null || email.isBlank()) return null;
        User user = userRepository.findByEmail(email.trim()).orElse(null);
        if (user == null) return null;
        return employeeRepository.findByUser_UserIdAndCompany_CompanyId(user.getUserId(), companyId).orElse(null);
    }

    // ========== PROJECT ISSUES IMPORT ==========

    public record IssueImportResult(
            int successCount,
            int errorCount,
            List<String> errors
    ) {}

    public IssueImportResult importIssuesExcel(MultipartFile file, Long projectId, Long userId) throws IOException {
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int errorCount = 0;

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));
        
        ProjectMember currentMember = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ForbiddenException("Bạn không có quyền truy cập dự án này"));

        if (!currentMember.canManageProject() && !currentUserHasAdminRole(userId)) {
            throw new ForbiddenException("Bạn không có quyền quản lý dự án này để nhập công việc");
        }

        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người tạo"));

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                errors.add("Sheet not found in Excel file");
                return new IssueImportResult(0, 1, errors);
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                errors.add("Header row not found");
                return new IssueImportResult(0, 1, errors);
            }

            Map<String, Integer> headerMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    headerMap.put(getCellStringValue(cell).toLowerCase().trim(), i);
                }
            }

            Integer titleIdx = headerMap.get("tiêu đề");
            if (titleIdx == null) titleIdx = headerMap.get("title");
            Integer descIdx = headerMap.get("mô tả");
            if (descIdx == null) descIdx = headerMap.get("description");
            Integer statusIdx = headerMap.get("trạng thái");
            if (statusIdx == null) statusIdx = headerMap.get("status");
            Integer priorityIdx = headerMap.get("độ ưu tiên");
            if (priorityIdx == null) priorityIdx = headerMap.get("priority");
            Integer typeIdx = headerMap.get("loại");
            if (typeIdx == null) typeIdx = headerMap.get("type");
            Integer assigneeIdx = headerMap.get("người thực hiện (email)");
            if (assigneeIdx == null) assigneeIdx = headerMap.get("người thực hiện");
            if (assigneeIdx == null) assigneeIdx = headerMap.get("assignee");
            Integer estIdx = headerMap.get("giờ ước lượng");
            if (estIdx == null) estIdx = headerMap.get("estimated_hours");
            Integer startIdx = headerMap.get("ngày bắt đầu");
            if (startIdx == null) startIdx = headerMap.get("start_date");
            Integer dueIdx = headerMap.get("ngày hết hạn");
            if (dueIdx == null) dueIdx = headerMap.get("due_date");
            Integer weightIdx = headerMap.get("trọng số");
            if (weightIdx == null) weightIdx = headerMap.get("weight");
            Integer impIdx = headerMap.get("quan trọng");
            if (impIdx == null) impIdx = headerMap.get("is_important");
            Integer urgIdx = headerMap.get("khẩn cấp");
            if (urgIdx == null) urgIdx = headerMap.get("is_urgent");

            if (titleIdx == null) {
                errors.add("Không tìm thấy cột 'Tiêu đề' trong file Excel");
                return new IssueImportResult(0, 1, errors);
            }

            Long maxNumber = issueRepository.findMaxIssueNumberByProjectId(projectId);
            long nextNumber = (maxNumber != null ? maxNumber : 0) + 1;

            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowEmpty(row)) continue;

                try {
                    String title = getCellStringValue(row.getCell(titleIdx));
                    if (title == null || title.isBlank()) {
                        errors.add("Dòng " + (rowNum + 1) + ": Tiêu đề không được để trống");
                        errorCount++;
                        continue;
                    }

                    Issue issue = new Issue();
                    issue.setProject(project);
                    issue.setReporter(reporter);
                    issue.setTitle(title.trim());
                    issue.setIssueKey(String.format("%s-%d", project.getKeyProject(), nextNumber++));

                    if (descIdx != null) {
                        issue.setDescription(getCellStringValue(row.getCell(descIdx)));
                    }

                    // Status
                    IssueStatus status = null;
                    if (statusIdx != null) {
                       String statusStr = getCellStringValue(row.getCell(statusIdx));
                       if (statusStr != null && !statusStr.isBlank()) {
                           status = issueStatusRepository.findByNameIgnoreCase(statusStr.trim()).orElse(null);
                       }
                    }
                    if (status == null) {
                        status = issueStatusRepository.findDefaultTodoStatus()
                               .orElseGet(() -> issueStatusRepository.findFirstByOrderByOrderIndexAsc().orElse(null));
                    }
                    issue.setIssueStatus(status);
                    if (status != null && ("In Progress".equalsIgnoreCase(status.getName()) || "Đang thực hiện".equalsIgnoreCase(status.getName()))) {
                        issue.setInProgressAt(LocalDateTime.now());
                    }

                    // Priority
                    Issue.Priority priority = Issue.Priority.MEDIUM;
                    if (priorityIdx != null) {
                        String pStr = getCellStringValue(row.getCell(priorityIdx));
                        if (pStr != null && !pStr.isBlank()) {
                            try {
                                priority = Issue.Priority.valueOf(pStr.trim().toUpperCase());
                            } catch (IllegalArgumentException ignored) {}
                        }
                    }
                    issue.setPriority(priority);

                    // Issue Type
                    Issue.IssueType type = Issue.IssueType.TASK;
                    if (typeIdx != null) {
                        String tStr = getCellStringValue(row.getCell(typeIdx));
                        if (tStr != null && !tStr.isBlank()) {
                            try {
                                type = Issue.IssueType.valueOf(tStr.trim().toUpperCase());
                            } catch (IllegalArgumentException ignored) {}
                        }
                    }
                    issue.setIssueType(type);

                    // Assignee
                    if (assigneeIdx != null) {
                        String email = getCellStringValue(row.getCell(assigneeIdx));
                        if (email != null && !email.isBlank()) {
                            User assignee = userRepository.findByEmail(email.trim()).orElse(null);
                            if (assignee == null) {
                                errors.add("Dòng " + (rowNum + 1) + ": Không tìm thấy người dùng có email '" + email + "'");
                                errorCount++;
                                continue;
                            }
                            Optional<ProjectMember> memberOpt = projectMemberRepository
                                    .findByProject_ProjectIdAndUser_UserId(projectId, assignee.getUserId());
                            if (memberOpt.isEmpty()) {
                                errors.add("Dòng " + (rowNum + 1) + ": Người dùng có email '" + email + "' không phải là thành viên dự án");
                                errorCount++;
                                continue;
                            }
                            issue.setAssignee(assignee);
                        }
                    }

                    // Estimated hours
                    if (estIdx != null) {
                        String estStr = getCellStringValue(row.getCell(estIdx));
                        if (estStr != null && !estStr.isBlank()) {
                            try {
                                issue.setEstimatedHours(new BigDecimal(estStr.trim().replace(",", "")));
                            } catch (NumberFormatException ignored) {}
                        }
                    }

                    // Start date & Due date
                    if (startIdx != null) {
                        String startStr = getCellStringValue(row.getCell(startIdx));
                        if (startStr != null && !startStr.isBlank()) {
                            issue.setStartDate(parseDate(startStr));
                        }
                    }
                    if (dueIdx != null) {
                        String dueStr = getCellStringValue(row.getCell(dueIdx));
                        if (dueStr != null && !dueStr.isBlank()) {
                            issue.setDueDate(parseDate(dueStr));
                        }
                    }

                    // Weight
                    if (weightIdx != null) {
                        String wStr = getCellStringValue(row.getCell(weightIdx));
                        if (wStr != null && !wStr.isBlank()) {
                            try {
                                issue.setWeight(Integer.parseInt(wStr.trim()));
                            } catch (NumberFormatException ignored) {}
                        }
                    }

                    // Eisenhower flags
                    boolean isImportant = false;
                    if (impIdx != null) {
                        String impStr = getCellStringValue(row.getCell(impIdx));
                        if (impStr != null) {
                            String clean = impStr.trim().toLowerCase();
                            isImportant = clean.equals("có") || clean.equals("yes") || clean.equals("true") || clean.equals("1");
                        }
                    }
                    issue.setIsImportant(isImportant);

                    boolean isUrgent = false;
                    if (urgIdx != null) {
                        String urgStr = getCellStringValue(row.getCell(urgIdx));
                        if (urgStr != null) {
                            String clean = urgStr.trim().toLowerCase();
                            isUrgent = clean.equals("có") || clean.equals("yes") || clean.equals("true") || clean.equals("1");
                        }
                    }
                    issue.setIsUrgent(isUrgent);

                    issueRepository.save(issue);
                    successCount++;

                } catch (Exception e) {
                    errors.add("Dòng " + (rowNum + 1) + ": " + e.getMessage());
                    errorCount++;
                }
            }
        }

        return new IssueImportResult(successCount, errorCount, errors);
    }

    private boolean currentUserHasAdminRole(Long userId) {
        return userRepository.findById(userId)
                .map(User::isSystemAdminAccount)
                .orElse(false);
    }
}
