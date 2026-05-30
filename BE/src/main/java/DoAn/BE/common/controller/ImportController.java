package DoAn.BE.common.controller;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.service.ImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;
    private final AccessControlService accessControlService;

    @PostMapping(value = "/employees/excel", consumes = "multipart/form-data")
    public ResponseEntity<?> importEmployeesExcel(
            @RequestParam("file") MultipartFile file) {
        Long companyId = accessControlService.getCurrentCompanyId();
        try {
            ImportService.EmployeeImportResult result = importService.importEmployeesExcel(file, companyId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "successCount", result.successCount(),
                    "errorCount", result.errorCount(),
                    "message", "Đã nhập " + result.successCount() + " nhân viên. " + result.errorCount() + " lỗi.",
                    "errors", result.errors()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Lỗi khi nhập file: " + e.getMessage()
            ));
        }
    }

    @PostMapping(value = "/leaves/excel", consumes = "multipart/form-data")
    public ResponseEntity<?> importLeavesExcel(
            @RequestParam("file") MultipartFile file) {
        Long companyId = accessControlService.getCurrentCompanyId();
        try {
            ImportService.LeaveImportResult result = importService.importLeavesExcel(file, companyId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "successCount", result.successCount(),
                    "errorCount", result.errorCount(),
                    "message", "�ã nhập " + result.successCount() + " đơn nghỉ phép. " + result.errorCount() + " lỗi.",
                    "errors", result.errors()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Lỗi khi nhập file: " + e.getMessage()
            ));
        }
    }

    @PostMapping(value = "/reviews/excel", consumes = "multipart/form-data")
    public ResponseEntity<?> importReviewsExcel(
            @RequestParam("file") MultipartFile file) {
        Long companyId = accessControlService.getCurrentCompanyId();
        try {
            ImportService.ReviewImportResult result = importService.importReviewsExcel(file, companyId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "successCount", result.successCount(),
                    "errorCount", result.errorCount(),
                    "message", "Đã nhập " + result.successCount() + " đánh giá. " + result.errorCount() + " lỗi.",
                    "errors", result.errors()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Lỗi khi nhập file: " + e.getMessage()
            ));
        }
    }

    @PostMapping(value = "/attendance/excel", consumes = "multipart/form-data")
    public ResponseEntity<?> importAttendanceExcel(
            @RequestParam("file") MultipartFile file) {
        Long companyId = accessControlService.getCurrentCompanyId();
        try {
            ImportService.AttendanceImportResult result = importService.importAttendanceExcel(file, companyId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "successCount", result.successCount(),
                    "errorCount", result.errorCount(),
                    "message", "Đã nhập " + result.successCount() + " bản ghi chấm công. " + result.errorCount() + " lỗi.",
                    "errors", result.errors()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Lỗi khi nhập file: " + e.getMessage()
            ));
        }
    }
}
