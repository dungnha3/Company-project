package DoAn.BE.hr.controller;

import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.hr.service.ExportService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {
    
    private final ExportService exportService;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    /**
     * Export danh sách nhân viên ra Excel
     * GET /api/export/nhan-vien/excel
     */
    @GetMapping("/nhan-vien/excel")
    public ResponseEntity<byte[]> exportNhanVienToExcel() throws IOException {
        User currentUser = getCurrentUser();
        PermissionUtil.checkHRPermission(currentUser);
        
        byte[] excelData = exportService.exportNhanVienToExcel();
        
        String filename = "DanhSachNhanVien_" + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excelData);
    }
    
    /**
     * Export chấm công theo tháng ra Excel
     * GET /api/export/cham-cong/excel?thang=10&nam=2024
     */
    @GetMapping("/cham-cong/excel")
    public ResponseEntity<byte[]> exportChamCongToExcel(
            @RequestParam int thang,
            @RequestParam int nam) throws IOException {
        User currentUser = getCurrentUser();
        if (!currentUser.isManagerHR() && !currentUser.isManagerAccounting() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ HR Manager, Accounting Manager và Admin mới có quyền export chấm công");
        }
        
        byte[] excelData = exportService.exportChamCongToExcel(thang, nam);
        
        String filename = "ChamCong_" + String.format("%02d%d", thang, nam) + ".xlsx";
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excelData);
    }
    
    /**
     * Export bảng lương theo tháng ra Excel
     * GET /api/export/bang-luong/excel?thang=10&nam=2024
     */
    @GetMapping("/bang-luong/excel")
    public ResponseEntity<byte[]> exportBangLuongToExcel(
            @RequestParam int thang,
            @RequestParam int nam) throws IOException {
        User currentUser = getCurrentUser();
        if (!currentUser.isManagerHR() && !currentUser.isManagerAccounting() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ HR Manager, Accounting Manager và Admin mới có quyền export bảng lương");
        }
        
        byte[] excelData = exportService.exportBangLuongToExcel(thang, nam);
        
        String filename = "BangLuong_" + String.format("%02d%d", thang, nam) + ".xlsx";
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excelData);
    }
    
    /**
     * Export danh sách nghỉ phép ra Excel
     * GET /api/export/nghi-phep/excel?startDate=2024-01-01&endDate=2024-12-31
     */
    @GetMapping("/nghi-phep/excel")
    public ResponseEntity<byte[]> exportNghiPhepToExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) throws IOException {
        User currentUser = getCurrentUser();
        if (!currentUser.isManagerHR() && !currentUser.isManagerAccounting() && 
            !currentUser.isManagerProject() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ Manager và Admin mới có quyền export nghỉ phép");
        }
        
        byte[] excelData = exportService.exportNghiPhepToExcel(startDate, endDate);
        
        String filename = "NghiPhep_" + startDate.format(DateTimeFormatter.ofPattern("ddMMyyyy")) + 
                         "_" + endDate.format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".xlsx";
        
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excelData);
    }
}
