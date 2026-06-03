package DoAn.BE.common.controller;

import DoAn.BE.common.service.TemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping("/employees")
    public ResponseEntity<byte[]> downloadEmployeeTemplate(@AuthenticationPrincipal UserDetails user) {
        try {
            byte[] template = templateService.getEmployeeTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Template_NhanVien.xlsx");
            return ResponseEntity.ok().headers(headers).body(template);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/leaves")
    public ResponseEntity<byte[]> downloadLeaveTemplate(@AuthenticationPrincipal UserDetails user) {
        try {
            byte[] template = templateService.getLeaveTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Template_NghiPhep.xlsx");
            return ResponseEntity.ok().headers(headers).body(template);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/reviews")
    public ResponseEntity<byte[]> downloadReviewTemplate(@AuthenticationPrincipal UserDetails user) {
        try {
            byte[] template = templateService.getReviewTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Template_DanhGia.xlsx");
            return ResponseEntity.ok().headers(headers).body(template);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/attendance")
    public ResponseEntity<byte[]> downloadAttendanceTemplate(@AuthenticationPrincipal UserDetails user) {
        try {
            byte[] template = templateService.getAttendanceTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Template_ChamCong.xlsx");
            return ResponseEntity.ok().headers(headers).body(template);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/issues")
    public ResponseEntity<byte[]> downloadIssueTemplate(@AuthenticationPrincipal UserDetails user) {
        try {
            byte[] template = templateService.getIssueTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Template_CongViec.xlsx");
            return ResponseEntity.ok().headers(headers).body(template);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
