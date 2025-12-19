package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.DashboardDTO;
import DoAn.BE.hr.dto.DashboardStatsDTO;
import DoAn.BE.hr.service.DashboardService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }

    // Dashboard tổng quan
    @GetMapping("/tong-quan")
    public ResponseEntity<DashboardDTO> getTongQuan() {
        User currentUser = getCurrentUser();
        DashboardDTO dashboard = dashboardService.getTongQuan(currentUser);
        return ResponseEntity.ok(dashboard);
    }

    // Thống kê theo tháng
    @GetMapping("/thang")
    public ResponseEntity<DashboardDTO> getThongKeTheoThang(
            @RequestParam int thang,
            @RequestParam int nam) {
        User currentUser = getCurrentUser();
        DashboardDTO dashboard = dashboardService.getThongKeTheoThang(thang, nam, currentUser);
        return ResponseEntity.ok(dashboard);
    }

    // Dashboard nâng cao - Biểu đồ và thống kê chi tiết
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats() {
        User currentUser = getCurrentUser();
        // Chỉ Manager và Admin mới xem được thống kê chi tiết
        if (!currentUser.isAnyManager() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ Manager và Admin mới có quyền xem thống kê chi tiết");
        }
        
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats);
    }

    // Biểu đồ chấm công theo phòng ban
    @GetMapping("/cham-cong-phong-ban")
    public ResponseEntity<DashboardStatsDTO.ChamCongPhongBanStats[]> getChamCongPhongBanStats() {
        User currentUser = getCurrentUser();
        if (!currentUser.isManagerHR() && !currentUser.isManagerAccounting() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ HR Manager, Accounting Manager và Admin mới có quyền xem thống kê này");
        }
        
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getChamCongPhongBan().toArray(new DashboardStatsDTO.ChamCongPhongBanStats[0]));
    }

    // Biểu đồ lương theo tháng
    @GetMapping("/luong-theo-thang")
    public ResponseEntity<DashboardStatsDTO.LuongTheoThangStats[]> getLuongTheoThangStats() {
        User currentUser = getCurrentUser();
        if (!currentUser.isManagerHR() && !currentUser.isManagerAccounting() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ HR Manager, Accounting Manager và Admin mới có quyền xem thống kê lương");
        }
        
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getLuongTheoThang().toArray(new DashboardStatsDTO.LuongTheoThangStats[0]));
    }

    // Thống kê nhân viên theo độ tuổi
    @GetMapping("/nhan-vien-theo-tuoi")
    public ResponseEntity<DashboardStatsDTO.NhanVienTheoTuoiStats[]> getNhanVienTheoTuoiStats() {
        User currentUser = getCurrentUser();
        if (!currentUser.isManagerHR() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ HR Manager và Admin mới có quyền xem thống kê này");
        }
        
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getNhanVienTheoTuoi().toArray(new DashboardStatsDTO.NhanVienTheoTuoiStats[0]));
    }

    // Thống kê nhân viên theo giới tính
    @GetMapping("/nhan-vien-theo-gioi-tinh")
    public ResponseEntity<Map<String, Long>> getNhanVienTheoGioiTinhStats() {
        User currentUser = getCurrentUser();
        if (!currentUser.isManagerHR() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ HR Manager và Admin mới có quyền xem thống kê này");
        }
        
        DashboardStatsDTO stats = dashboardService.getDashboardStats(currentUser);
        return ResponseEntity.ok(stats.getNhanVienTheoGioiTinh());
    }
}
