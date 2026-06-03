package DoAn.BE.common.controller;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import DoAn.BE.user.entity.User;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;
    private final AccessControlService accessControlService;

    @GetMapping("/employees/excel")
    public ResponseEntity<byte[]> exportEmployeesExcel() throws IOException {
        Long companyId = accessControlService.getCurrentCompanyId();
        byte[] data = exportService.exportEmployeesExcel(companyId);
        String filename = "NhanVien_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";
        return buildExcelResponse(data, filename);
    }

    @GetMapping("/leaves/excel")
    public ResponseEntity<byte[]> exportLeavesExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) throws IOException {
        Long companyId = accessControlService.getCurrentCompanyId();
        byte[] data = exportService.exportLeavesExcel(companyId, startDate, endDate);
        String filename = "NghiPhep_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";
        return buildExcelResponse(data, filename);
    }

    @GetMapping("/reviews/excel")
    public ResponseEntity<byte[]> exportReviewsExcel() throws IOException {
        Long companyId = accessControlService.getCurrentCompanyId();
        byte[] data = exportService.exportReviewsExcel(companyId);
        String filename = "DanhGia_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";
        return buildExcelResponse(data, filename);
    }

    @GetMapping("/attendance/excel")
    public ResponseEntity<byte[]> exportAttendanceExcel(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) throws IOException {
        Long companyId = accessControlService.getCurrentCompanyId();
        byte[] data = exportService.exportTimeLogsExcel(companyId, month, year);
        String filename = "ChamCong_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";
        return buildExcelResponse(data, filename);
    }

    @GetMapping("/projects/{projectId}/issues/excel")
    public ResponseEntity<byte[]> exportProjectIssuesExcel(
            @PathVariable Long projectId) throws IOException {
        User user = accessControlService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        byte[] data = exportService.exportProjectIssuesExcel(projectId, user.getUserId());
        String filename = "CongViec_Project_" + projectId + "_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";
        return buildExcelResponse(data, filename);
    }

    private ResponseEntity<byte[]> buildExcelResponse(byte[] data, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(data.length)
                .body(data);
    }
}
