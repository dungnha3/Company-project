package DoAn.BE.common.controller;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.service.ImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import DoAn.BE.user.entity.User;
import org.springframework.http.HttpStatus;

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

    @PostMapping(value = "/issues/excel", consumes = "multipart/form-data")
    public ResponseEntity<?> importIssuesExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") Long projectId) {
        User currentUser = accessControlService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Bạn cần đăng nhập để thực hiện hành động này"
            ));
        }
        try {
            ImportService.IssueImportResult result = importService.importIssuesExcel(file, projectId, currentUser.getUserId());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "successCount", result.successCount(),
                    "errorCount", result.errorCount(),
                    "message", "Đã nhập thành công " + result.successCount() + " công việc. " + result.errorCount() + " lỗi.",
                    "errors", result.errors()
            ));
        } catch (DoAn.BE.common.exception.ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Lỗi khi nhập file: " + e.getMessage()
            ));
        }
    }
}
