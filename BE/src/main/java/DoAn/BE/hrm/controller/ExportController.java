package DoAn.BE.hrm.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.service.PdfExportService;
import DoAn.BE.hrm.service.HrmExportService;
import DoAn.BE.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

// Controller for exporting reports to Excel and PDF
// /
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
@Tag(name = "Export", description = "Export reports to Excel and PDF")
@FeatureFlag("HR")
@Transactional(readOnly = true)
public class ExportController {

        private final HrmExportService exportService;
        private final AccessControlService accessControlService;
        private final PdfExportService pdfExportService;

        @GetMapping("/employees/excel")
        @Operation(summary = "Export employee list to Excel")
        public ResponseEntity<byte[]> exportEmployeesToExcel(@AuthenticationPrincipal User currentUser)
                        throws IOException {
                accessControlService.checkHrExportPermission();

                byte[] excelData = exportService.exportEmployeesToExcel();
                String filename = "EmployeeList_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"))
                                + ".xlsx";

                return createExcelResponse(excelData, filename);
        }

        @GetMapping("/attendance/excel")
        @Operation(summary = "Export attendance by month to Excel")
        public ResponseEntity<byte[]> exportAttendanceToExcel(
                        @RequestParam int month,
                        @RequestParam int year) throws IOException {
                accessControlService.checkAttendanceViewAllPermission();

                byte[] excelData = exportService.exportAttendanceToExcel(month, year);
                String filename = "Attendance_" + String.format("%02d%d", month, year) + ".xlsx";

                return createExcelResponse(excelData, filename);
        }

        @GetMapping("/salary/excel")
        @Operation(summary = "Export salary by month to Excel")
        public ResponseEntity<byte[]> exportSalaryToExcel(
                        @RequestParam int month,
                        @RequestParam int year) throws IOException {
                accessControlService.checkSalaryViewPermission();

                byte[] excelData = exportService.exportSalaryToExcel(month, year);
                String filename = "Salary_" + String.format("%02d%d", month, year) + ".xlsx";

                return createExcelResponse(excelData, filename);
        }

        @GetMapping("/leaves/excel")
        @Operation(summary = "Export leave requests to Excel")
        public ResponseEntity<byte[]> exportLeavesToExcel(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate)
                        throws IOException {
                accessControlService.checkLeaveViewAllPermission();

                byte[] excelData = exportService.exportLeavesToExcel(startDate, endDate);
                String filename = "LeaveRequests_" + startDate.format(DateTimeFormatter.ofPattern("ddMMyyyy")) +
                                "_" + endDate.format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";

                return createExcelResponse(excelData, filename);
        }

        @GetMapping("/employees/pdf")
        @Operation(summary = "Export employee list to PDF")
        public ResponseEntity<byte[]> exportEmployeesToPdf(@AuthenticationPrincipal User currentUser) {
                accessControlService.checkHrExportPermission();

                byte[] pdfData = exportService.exportEmployeesToPdf(pdfExportService);
                String filename = "EmployeeList_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"))
                                + ".pdf";

                return createPdfResponse(pdfData, filename);
        }

        @GetMapping("/salary/pdf")
        @Operation(summary = "Export salary report to PDF")
        public ResponseEntity<byte[]> exportSalaryToPdf(
                        @RequestParam int month,
                        @RequestParam int year) {
                accessControlService.checkSalaryViewPermission();

                byte[] pdfData = exportService.exportSalaryToPdf(pdfExportService, month, year);
                String filename = "SalaryReport_" + String.format("%02d%d", month, year) + ".pdf";

                return createPdfResponse(pdfData, filename);
        }

        private ResponseEntity<byte[]> createExcelResponse(byte[] data, String filename) {
                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                                .contentType(MediaType.parseMediaType(
                                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                                .body(data);
        }

        private ResponseEntity<byte[]> createPdfResponse(byte[] data, String filename) {
                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                                .contentType(MediaType.APPLICATION_PDF)
                                .body(data);
        }
}