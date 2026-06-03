package DoAn.BE.common.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
@RequiredArgsConstructor
public class TemplateService {

    // ========== EMPLOYEES TEMPLATE ==========

    public byte[] getEmployeeTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("NhanVien");
            CellStyle headerStyle = createHeaderStyle(workbook);

            String[] headers = { "Email", "Họ tên", "Ngày sinh", "Giới tính", "Địa chỉ", "SĐT", "Ngày vào làm", "Lương cơ bản", "Phụ cấp", "Số ngày nghỉ", "Trạng thái" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Sample row
            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("nguyen.van.a@email.com");
            sample.createCell(1).setCellValue("Nguyễn Văn A");
            sample.createCell(2).setCellValue("01/01/1990");
            sample.createCell(3).setCellValue("Nam");
            sample.createCell(4).setCellValue("TP. HCM");
            sample.createCell(5).setCellValue("0909123456");
            sample.createCell(6).setCellValue("01/01/2024");
            sample.createCell(7).setCellValue(15000000.0);
            sample.createCell(8).setCellValue(2000000.0);
            sample.createCell(9).setCellValue(12.0);
            sample.createCell(10).setCellValue("ACTIVE");

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== LEAVES TEMPLATE ==========

    public byte[] getLeaveTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("NghiPhep");
            CellStyle headerStyle = createHeaderStyle(workbook);

            String[] headers = { "Email nhân viên", "Họ tên NV", "Loại nghỉ", "Từ ngày", "Đến ngày", "Lý do", "Trạng thái" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("nguyen.van.a@email.com");
            sample.createCell(1).setCellValue("Nguyễn Văn A");
            sample.createCell(2).setCellValue("ANNUAL");
            sample.createCell(3).setCellValue("01/06/2026");
            sample.createCell(4).setCellValue("05/06/2026");
            sample.createCell(5).setCellValue("Nghỉ phép năm");
            sample.createCell(6).setCellValue("PENDING");

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== REVIEWS TEMPLATE ==========

    public byte[] getReviewTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("DanhGia");
            CellStyle headerStyle = createHeaderStyle(workbook);

            String[] headers = { "Email nhân viên", "Họ tên NV", "Email người đánh giá", "Kỳ đánh giá", "Loại", "Điểm KT", "Điểm TL", "Điểm SS", "Điểm TM", "Bình luận", "Trạng thái" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("nguyen.van.a@email.com");
            sample.createCell(1).setCellValue("Nguyễn Văn A");
            sample.createCell(2).setCellValue("truong.pham@email.com");
            sample.createCell(3).setCellValue("Q2-2026");
            sample.createCell(4).setCellValue("PERIODIC");
            sample.createCell(5).setCellValue(8.0);
            sample.createCell(6).setCellValue(8.5);
            sample.createCell(7).setCellValue(7.5);
            sample.createCell(8).setCellValue(9.0);
            sample.createCell(9).setCellValue("Đánh giá tốt");
            sample.createCell(10).setCellValue("IN_PROGRESS");

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== ATTENDANCE TEMPLATE ==========

    public byte[] getAttendanceTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("ChamCong");
            CellStyle headerStyle = createHeaderStyle(workbook);

            String[] headers = { "Email", "Họ tên", "Ngày làm", "Giờ log", "Mô tả" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("nguyen.van.a@email.com");
            sample.createCell(1).setCellValue("Nguyễn Văn A");
            sample.createCell(2).setCellValue("28/05/2026");
            sample.createCell(3).setCellValue(8.0);
            sample.createCell(4).setCellValue("Làm việc bình thường");

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== ISSUES TEMPLATE ==========

    public byte[] getIssueTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("CongViec");
            CellStyle headerStyle = createHeaderStyle(workbook);

            String[] headers = { "Tiêu đề", "Mô tả", "Trạng thái", "Độ ưu tiên", "Loại", "Người thực hiện (Email)",
                    "Giờ ước lượng", "Ngày bắt đầu", "Ngày hết hạn", "Trọng số", "Quan trọng (Có/Không)", "Khẩn cấp (Có/Không)" };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Thiết kế giao diện Kanban Board");
            sample.createCell(1).setCellValue("Thiết kế bảng Kanban và các nút nhập/xuất Excel");
            sample.createCell(2).setCellValue("To Do");
            sample.createCell(3).setCellValue("MEDIUM");
            sample.createCell(4).setCellValue("TASK");
            sample.createCell(5).setCellValue("member@company.com");
            sample.createCell(6).setCellValue(8.0);
            sample.createCell(7).setCellValue("04/06/2026");
            sample.createCell(8).setCellValue("10/06/2026");
            sample.createCell(9).setCellValue(3);
            sample.createCell(10).setCellValue("Có");
            sample.createCell(11).setCellValue("Không");

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ========== STYLES ==========

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }
}
