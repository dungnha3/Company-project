package DoAn.BE.common.service;

import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.hrm.repository.ReviewRepository;
import DoAn.BE.timetracking.repository.TimeLogRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.common.exception.ForbiddenException;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ReviewRepository reviewRepository;
    private final TimeLogRepository timeLogRepository;
    private final IssueRepository issueRepository;
    private final ProjectMemberRepository projectMemberRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // ========== EMPLOYEES EXPORT ==========

    public byte[] exportEmployeesExcel(Long companyId) throws IOException {
        List<Employee> employees = employeeRepository.findByCompanyId(companyId);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("NhanVien");

            // Header style
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);

            // Headers
            String[] headers = { "STT", "Mã NV", "Họ tên", "Email", "SĐT", "Ngày sinh", "Giới tính",
                    "Địa chỉ", "Ngày vào làm", "Trạng thái", "Lương cơ bản", "Phụ cấp", "Số ngày nghỉ" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data
            int rowNum = 1;
            for (Employee emp : employees) {
                Row row = sheet.createRow(rowNum++);
                User user = emp.getUser();

                int col = 0;
                row.createCell(col++).setCellValue(rowNum - 1); // STT
                row.createCell(col++).setCellValue(emp.getEmployeeId()); // Ma NV
                row.createCell(col++).setCellValue(emp.getFullName()); // Ho ten

                Cell emailCell = row.createCell(col++);
                emailCell.setCellValue(user != null ? (user.getEmail() != null ? user.getEmail() : "") : "");
                Cell phoneCell = row.createCell(col++);
                phoneCell.setCellValue(emp.getPhone() != null ? emp.getPhone() : "");

                Cell dobCell = row.createCell(col++);
                if (emp.getDateOfBirth() != null) {
                    dobCell.setCellValue(emp.getDateOfBirth().format(DATE_FMT));
                    dobCell.setCellStyle(dateStyle);
                } else {
                    dobCell.setCellValue("");
                }
                row.createCell(col++).setCellValue(emp.getGender() != null ? emp.getGender().name() : "");
                row.createCell(col++).setCellValue(emp.getAddress() != null ? emp.getAddress() : "");

                Cell hireCell = row.createCell(col++);
                if (emp.getHireDate() != null) {
                    hireCell.setCellValue(emp.getHireDate().format(DATE_FMT));
                    hireCell.setCellStyle(dateStyle);
                } else {
                    hireCell.setCellValue("");
                }
                row.createCell(col++).setCellValue(emp.getStatus() != null ? emp.getStatus().name() : "");

                Cell salaryCell = row.createCell(col++);
                if (emp.getBaseSalary() != null) {
                    salaryCell.setCellValue(emp.getBaseSalary().doubleValue());
                    salaryCell.setCellStyle(currencyStyle);
                } else {
                    salaryCell.setCellValue(0.0);
                }

                Cell allowanceCell = row.createCell(col++);
                if (emp.getAllowance() != null) {
                    allowanceCell.setCellValue(emp.getAllowance().doubleValue());
                    allowanceCell.setCellStyle(currencyStyle);
                } else {
                    allowanceCell.setCellValue(0.0);
                }

                row.createCell(col++).setCellValue(emp.getLeaveBalance() != null ? emp.getLeaveBalance() : 0);
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== LEAVE REQUESTS EXPORT ==========

    public byte[] exportLeavesExcel(Long companyId, LocalDate startDate, LocalDate endDate) throws IOException {
        List<LeaveRequest> leaves;
        if (startDate != null && endDate != null) {
            leaves = leaveRequestRepository.findApprovedInDateRangeByCompany(startDate, endDate, companyId);
        } else {
            leaves = leaveRequestRepository.findAll();
        }

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("NghiPhep");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);

            String[] headers = { "STT", "Mã đơn", "Họ tên NV", "Loại nghỉ", "Từ ngày", "Đến ngày",
                    "Số ngày", "Lý do", "Trạng thái", "Người duyệt", "Ngày duyệt", "Ghi chú duyệt" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (LeaveRequest lr : leaves) {
                Row row = sheet.createRow(rowNum++);

                int col = 0;
                row.createCell(col++).setCellValue(rowNum - 1);
                row.createCell(col++).setCellValue(lr.getLeaveRequestId());
                row.createCell(col++).setCellValue(lr.getEmployee() != null ? lr.getEmployee().getFullName() : "");
                row.createCell(col++).setCellValue(lr.getLeaveType() != null ? lr.getLeaveType().name() : "");

                Cell startCell = row.createCell(col++);
                if (lr.getStartDate() != null) {
                    startCell.setCellValue(lr.getStartDate().format(DATE_FMT));
                    startCell.setCellStyle(dateStyle);
                } else {
                    startCell.setCellValue("");
                }

                Cell endCell = row.createCell(col++);
                if (lr.getEndDate() != null) {
                    endCell.setCellValue(lr.getEndDate().format(DATE_FMT));
                    endCell.setCellStyle(dateStyle);
                } else {
                    endCell.setCellValue("");
                }

                row.createCell(col++).setCellValue(lr.getTotalDays() != null ? lr.getTotalDays() : 0);
                row.createCell(col++).setCellValue(lr.getReason() != null ? lr.getReason() : "");
                row.createCell(col++).setCellValue(lr.getStatus() != null ? lr.getStatus().name() : "");

                User approver = lr.getApprover();
                row.createCell(col++).setCellValue(approver != null && approver.getFullName() != null ? approver.getFullName() : "");

                Cell approvedCell = row.createCell(col++);
                if (lr.getApprovedAt() != null) {
                    approvedCell.setCellValue(lr.getApprovedAt().format(DATE_TIME_FMT));
                    approvedCell.setCellStyle(dateStyle);
                } else {
                    approvedCell.setCellValue("");
                }

                row.createCell(col++).setCellValue(lr.getApprovalNote() != null ? lr.getApprovalNote() : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== REVIEWS EXPORT ==========

    public byte[] exportReviewsExcel(Long companyId) throws IOException {
        List<Review> reviews = reviewRepository.findByCompanyId(companyId);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("DanhGia");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle scoreStyle = createScoreStyle(workbook);

            String[] headers = { "STT", "Mã DG", "Nhân viên", "Người đánh giá", "Dự án", "Loại",
                    "Kỳ đánh giá", "Điểm KT", "Điểm TL", "Điểm SS", "Điểm TM", "Tổng điểm",
                    "Xếp loại", "Trạng thái", "Từ ngày", "Đến ngày", "Ngày hoàn thành", "Bình luận" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (Review r : reviews) {
                Row row = sheet.createRow(rowNum++);

                int col = 0;
                row.createCell(col++).setCellValue(rowNum - 1);
                row.createCell(col++).setCellValue(r.getReviewId());
                row.createCell(col++).setCellValue(r.getEmployee() != null ? r.getEmployee().getFullName() : "");
                row.createCell(col++).setCellValue(r.getReviewer() != null ? r.getReviewer().getFullName() : "");
                row.createCell(col++).setCellValue(r.getProjectName() != null ? r.getProjectName() : "");
                row.createCell(col++).setCellValue(r.getReviewType() != null ? r.getReviewType().name() : "");
                row.createCell(col++).setCellValue(r.getReviewPeriod() != null ? r.getReviewPeriod() : "");

                Cell techCell = row.createCell(col++);
                setScoreCell(techCell, r.getTechnicalScore(), scoreStyle);
                Cell attCell = row.createCell(col++);
                setScoreCell(attCell, r.getAttitudeScore(), scoreStyle);
                Cell softCell = row.createCell(col++);
                setScoreCell(softCell, r.getSoftSkillsScore(), scoreStyle);
                Cell teamCell = row.createCell(col++);
                setScoreCell(teamCell, r.getTeamworkScore(), scoreStyle);
                Cell totalCell = row.createCell(col++);
                setScoreCell(totalCell, r.getTotalScore(), scoreStyle);

                row.createCell(col++).setCellValue(r.getRating() != null ? r.getRating().name() : "");
                row.createCell(col++).setCellValue(r.getStatus() != null ? r.getStatus().name() : "");

                Cell startCell = row.createCell(col++);
                if (r.getStartDate() != null) {
                    startCell.setCellValue(r.getStartDate().format(DATE_FMT));
                    startCell.setCellStyle(dateStyle);
                } else {
                    startCell.setCellValue("");
                }

                Cell endCell = row.createCell(col++);
                if (r.getEndDate() != null) {
                    endCell.setCellValue(r.getEndDate().format(DATE_FMT));
                    endCell.setCellStyle(dateStyle);
                } else {
                    endCell.setCellValue("");
                }

                Cell compCell = row.createCell(col++);
                if (r.getCompletedDate() != null) {
                    compCell.setCellValue(r.getCompletedDate().format(DATE_FMT));
                    compCell.setCellStyle(dateStyle);
                } else {
                    compCell.setCellValue("");
                }

                row.createCell(col++).setCellValue(r.getComments() != null ? r.getComments() : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== TIME LOGS EXPORT ==========

    public byte[] exportTimeLogsExcel(Long companyId, Integer month, Integer year) throws IOException {
        List<DoAn.BE.timetracking.entity.TimeLog> logs;
        if (month != null && year != null) {
            LocalDate start = LocalDate.of(year, month, 1);
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            logs = timeLogRepository.findByCompanyAndMonth(companyId, start, end);
        } else {
            logs = timeLogRepository.findByCompany_CompanyId(companyId);
        }

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("ChamCong");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle hourStyle = createHourStyle(workbook);

            String[] headers = { "STT", "Mã log", "Mã NV", "Họ tên", "Mã công việc", "Ngày làm",
                    "Giờ log", "Mô tả", "Ghi chú" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (DoAn.BE.timetracking.entity.TimeLog log : logs) {
                Row row = sheet.createRow(rowNum++);

                int col = 0;
                row.createCell(col++).setCellValue(rowNum - 1);
                row.createCell(col++).setCellValue(log.getLogId());
                row.createCell(col++).setCellValue(log.getUser() != null ? log.getUser().getUserId() : null);
                row.createCell(col++).setCellValue(log.getUser() != null ? log.getUser().getFullName() : "");
                row.createCell(col++).setCellValue(log.getIssue() != null ? log.getIssue().getIssueKey() : "");

                Cell dateCell = row.createCell(col++);
                if (log.getWorkDate() != null) {
                    dateCell.setCellValue(log.getWorkDate().format(DATE_FMT));
                    dateCell.setCellStyle(dateStyle);
                } else {
                    dateCell.setCellValue("");
                }

                Cell hoursCell = row.createCell(col++);
                if (log.getLoggedHours() != null) {
                    hoursCell.setCellValue(log.getLoggedHours().doubleValue());
                    hoursCell.setCellStyle(hourStyle);
                } else {
                    hoursCell.setCellValue(0.0);
                }

                row.createCell(col++).setCellValue(log.getDescription() != null ? log.getDescription() : "");
                row.createCell(col++).setCellValue(log.getDescription() != null ? log.getDescription() : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== PROJECT ISSUES EXPORT ==========

    public byte[] exportProjectIssuesExcel(Long projectId, Long userId) throws IOException {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ForbiddenException("Bạn không có quyền truy cập dự án này"));

        List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("CongViec");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dateStyle = createDateStyle(workbook);
            CellStyle hourStyle = createHourStyle(workbook);

            String[] headers = { "STT", "Mã công việc", "Tiêu đề", "Mô tả", "Trạng thái", "Độ ưu tiên",
                    "Loại", "Người thực hiện (Email)", "Người thực hiện (Tên)", "Giờ ước lượng", "Giờ thực tế", "Ngày bắt đầu", "Ngày hết hạn",
                    "Trọng số", "Quan trọng", "Khẩn cấp", "Người tạo (Email)" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (Issue issue : issues) {
                Row row = sheet.createRow(rowNum++);

                int col = 0;
                row.createCell(col++).setCellValue(rowNum - 1); // STT
                row.createCell(col++).setCellValue(issue.getIssueKey()); // Ma cong viec
                row.createCell(col++).setCellValue(issue.getTitle() != null ? issue.getTitle() : ""); // Tieu de
                row.createCell(col++).setCellValue(issue.getDescription() != null ? issue.getDescription() : ""); // Mo ta
                row.createCell(col++).setCellValue(issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : ""); // Trang thai
                row.createCell(col++).setCellValue(issue.getPriority() != null ? issue.getPriority().name() : ""); // Do uu tien
                row.createCell(col++).setCellValue(issue.getIssueType() != null ? issue.getIssueType().name() : ""); // Loai

                User assignee = issue.getAssignee();
                row.createCell(col++).setCellValue(assignee != null && assignee.getEmail() != null ? assignee.getEmail() : "");
                row.createCell(col++).setCellValue(assignee != null && assignee.getFullName() != null ? assignee.getFullName() : "");

                Cell estCell = row.createCell(col++);
                if (issue.getEstimatedHours() != null) {
                    estCell.setCellValue(issue.getEstimatedHours().doubleValue());
                    estCell.setCellStyle(hourStyle);
                } else {
                    estCell.setCellValue("");
                }

                Cell actCell = row.createCell(col++);
                if (issue.getActualHours() != null) {
                    actCell.setCellValue(issue.getActualHours().doubleValue());
                    actCell.setCellStyle(hourStyle);
                } else {
                    actCell.setCellValue("");
                }

                Cell startCell = row.createCell(col++);
                if (issue.getStartDate() != null) {
                    startCell.setCellValue(issue.getStartDate().format(DATE_FMT));
                    startCell.setCellStyle(dateStyle);
                } else {
                    startCell.setCellValue("");
                }

                Cell dueCell = row.createCell(col++);
                if (issue.getDueDate() != null) {
                    dueCell.setCellValue(issue.getDueDate().format(DATE_FMT));
                    dueCell.setCellStyle(dateStyle);
                } else {
                    dueCell.setCellValue("");
                }

                row.createCell(col++).setCellValue(issue.getWeight() != null ? issue.getWeight() : 0);
                row.createCell(col++).setCellValue(Boolean.TRUE.equals(issue.getIsImportant()) ? "Có" : "Không");
                row.createCell(col++).setCellValue(Boolean.TRUE.equals(issue.getIsUrgent()) ? "Có" : "Không");

                User reporter = issue.getReporter();
                row.createCell(col++).setCellValue(reporter != null && reporter.getEmail() != null ? reporter.getEmail() : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== HELPER STYLES ==========

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        style.setDataFormat(createHelper.createDataFormat().getFormat("dd/MM/yyyy"));
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        style.setDataFormat(createHelper.createDataFormat().getFormat("#,##0.00"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        return style;
    }

    private CellStyle createScoreStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createHourStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        CreationHelper createHelper = workbook.getCreationHelper();
        style.setDataFormat(createHelper.createDataFormat().getFormat("#,##0.0"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        return style;
    }

    private void setScoreCell(Cell cell, BigDecimal score, CellStyle style) {
        if (score != null) {
            cell.setCellValue(score.doubleValue());
            cell.setCellStyle(style);
        } else {
            cell.setCellValue("");
        }
    }
}
