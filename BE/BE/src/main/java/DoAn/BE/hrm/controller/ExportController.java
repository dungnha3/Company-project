package DoAn.BE.hrm.controller;

import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.service.ExportService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

// [Controller for exporting reports to Excel] (Role: Manager/Admin)
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

        private final ExportService exportService;
        private final AccessControlService accessControlService;

        // ==================== EXCEL EXPORTS ====================

        // [Export employee list to Excel] (Role: HR Manager)
        @GetMapping("/employees/excel")
        public ResponseEntity<byte[]> exportEmployeesToExcel(@AuthenticationPrincipal User currentUser)
                        throws IOException {
                accessControlService.checkHRPermission(currentUser);

                byte[] excelData = exportService.exportEmployeesToExcel();
                String filename = "EmployeeList_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"))
                                + ".xlsx";

                return createExcelResponse(excelData, filename);
        }

        // [Export attendance by month to Excel] (Role: HR/Accounting/Admin)
        @GetMapping("/attendance/excel")
        public ResponseEntity<byte[]> exportAttendanceToExcel(
                        @RequestParam int month,
                        @RequestParam int year) throws IOException {
                if (!accessControlService.isHRManager() && !accessControlService.isAccountingManager()
                                && !accessControlService.isOwnerOrAdmin()) {
                        throw new ForbiddenException(
                                        "Only HR Manager, Accounting Manager and Admin can export attendance");
                }

                byte[] excelData = exportService.exportAttendanceToExcel(month, year);
                String filename = "Attendance_" + String.format("%02d%d", month, year) + ".xlsx";

                return createExcelResponse(excelData, filename);
        }

        // [Export salary by month to Excel] (Role: HR/Accounting/Admin)
        @GetMapping("/salary/excel")
        public ResponseEntity<byte[]> exportSalaryToExcel(
                        @RequestParam int month,
                        @RequestParam int year) throws IOException {
                if (!accessControlService.isHRManager() && !accessControlService.isAccountingManager()
                                && !accessControlService.isOwnerOrAdmin()) {
                        throw new ForbiddenException(
                                        "Only HR Manager, Accounting Manager and Admin can export salary");
                }

                byte[] excelData = exportService.exportSalaryToExcel(month, year);
                String filename = "Salary_" + String.format("%02d%d", month, year) + ".xlsx";

                return createExcelResponse(excelData, filename);
        }

        // [Export leave requests to Excel] (Role: Manager/Admin)
        @GetMapping("/leaves/excel")
        public ResponseEntity<byte[]> exportLeavesToExcel(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate)
                        throws IOException {
                if (!accessControlService.isAnyManager()) {
                        throw new ForbiddenException("Only Manager and Admin can export leave requests");
                }

                byte[] excelData = exportService.exportLeavesToExcel(startDate, endDate);
                String filename = "LeaveRequests_" + startDate.format(DateTimeFormatter.ofPattern("ddMMyyyy")) +
                                "_" + endDate.format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";

                return createExcelResponse(excelData, filename);
        }

        // ==================== HELPER METHODS ====================

        // [Create Excel response with headers] (Role: Internal)
        private ResponseEntity<byte[]> createExcelResponse(byte[] data, String filename) {
                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                                .contentType(MediaType.parseMediaType(
                                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                                .body(data);
        }
}
