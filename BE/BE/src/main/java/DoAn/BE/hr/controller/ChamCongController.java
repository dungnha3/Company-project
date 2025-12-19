package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.ChamCongDTO;
import DoAn.BE.hr.dto.ChamCongGPSRequest;
import DoAn.BE.hr.dto.ChamCongRequest;
import DoAn.BE.hr.entity.ChamCong;
import DoAn.BE.hr.mapper.ChamCongMapper;
import DoAn.BE.hr.service.ChamCongService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cham-cong")
public class ChamCongController {

    private final ChamCongService chamCongService;
    private final ChamCongMapper chamCongMapper;

    public ChamCongController(ChamCongService chamCongService, ChamCongMapper chamCongMapper) {
        this.chamCongService = chamCongService;
        this.chamCongMapper = chamCongMapper;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }

    /**
     * Tạo chấm công mới
     * POST /api/cham-cong
     */
    @PostMapping
    public ResponseEntity<ChamCongDTO> createChamCong(@Valid @RequestBody ChamCongRequest request) {
        User currentUser = getCurrentUser();
        ChamCong chamCong = chamCongService.createChamCong(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(chamCongMapper.toDTO(chamCong));
    }

    /**
     * Lấy thông tin chấm công theo ID
     * GET /api/cham-cong/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ChamCongDTO> getChamCongById(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        ChamCong chamCong = chamCongService.getChamCongById(id, currentUser);
        return ResponseEntity.ok(chamCongMapper.toDTO(chamCong));
    }

    /**
     * Lấy danh sách tất cả chấm công
     * GET /api/cham-cong
     */
    @GetMapping
    public ResponseEntity<List<ChamCongDTO>> getAllChamCong() {
        User currentUser = getCurrentUser();
        List<ChamCong> chamCongs = chamCongService.getAllChamCong(currentUser);
        return ResponseEntity.ok(chamCongMapper.toDTOList(chamCongs));
    }

    /**
     * Cập nhật chấm công
     * PUT /api/cham-cong/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ChamCongDTO> updateChamCong(
            @PathVariable Long id,
            @Valid @RequestBody ChamCongRequest request) {
        User currentUser = getCurrentUser();
        ChamCong chamCong = chamCongService.updateChamCong(id, request, currentUser);
        return ResponseEntity.ok(chamCongMapper.toDTO(chamCong));
    }

    /**
     * Xóa chấm công
     * DELETE /api/cham-cong/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteChamCong(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        chamCongService.deleteChamCong(id, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa chấm công thành công");
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy chấm công theo nhân viên
     * GET /api/cham-cong/nhan-vien/{nhanvienId}
     */
    @GetMapping("/nhan-vien/{nhanvienId}")
    public ResponseEntity<List<ChamCongDTO>> getChamCongByNhanVien(@PathVariable Long nhanvienId) {
        User currentUser = getCurrentUser();
        List<ChamCong> chamCongs = chamCongService.getChamCongByNhanVien(nhanvienId, currentUser);
        return ResponseEntity.ok(chamCongMapper.toDTOList(chamCongs));
    }

    /**
     * Lấy chấm công theo khoảng thời gian
     * GET /api/cham-cong/date-range?startDate=2024-01-01&endDate=2024-01-31
     */
    @GetMapping("/date-range")
    public ResponseEntity<List<ChamCongDTO>> getChamCongByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<ChamCong> chamCongs = chamCongService.getChamCongByDateRange(startDate, endDate);
        return ResponseEntity.ok(chamCongMapper.toDTOList(chamCongs));
    }

    /**
     * Lấy chấm công của nhân viên trong tháng
     * GET /api/cham-cong/nhan-vien/{nhanvienId}/month?year=2024&month=1
     */
    @GetMapping("/nhan-vien/{nhanvienId}/month")
    public ResponseEntity<?> getChamCongByNhanVienAndMonth(
            @PathVariable Long nhanvienId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            List<ChamCong> chamCongs = chamCongService.getChamCongByNhanVienAndMonth(nhanvienId, year, month);
            return ResponseEntity.ok(chamCongMapper.toDTOList(chamCongs));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Lỗi khi lấy dữ liệu chấm công: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Tính số ngày công của nhân viên trong tháng
     * GET /api/cham-cong/nhan-vien/{nhanvienId}/working-days?year=2024&month=1
     */
    @GetMapping("/nhan-vien/{nhanvienId}/working-days")
    public ResponseEntity<Map<String, Object>> countWorkingDays(
            @PathVariable Long nhanvienId,
            @RequestParam int year,
            @RequestParam int month) {
        int workingDays = chamCongService.countWorkingDays(nhanvienId, year, month);
        Map<String, Object> response = new HashMap<>();
        response.put("nhanvienId", nhanvienId);
        response.put("year", year);
        response.put("month", month);
        response.put("workingDays", workingDays);
        return ResponseEntity.ok(response);
    }

    /**
     * Thống kê đi trễ/về sớm của nhân viên trong tháng
     * GET /api/cham-cong/nhan-vien/{nhanvienId}/statistics?year=2024&month=1
     */
    /**
     * Thống kê đi trễ/về sớm của nhân viên trong tháng
     * GET /api/cham-cong/nhan-vien/{nhanvienId}/statistics?year=2024&month=1
     */
    @GetMapping("/nhan-vien/{nhanvienId}/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics(
            @PathVariable Long nhanvienId,
            @RequestParam int year,
            @RequestParam int month) {
        Map<String, Object> response = new HashMap<>();
        response.put("nhanvienId", nhanvienId);
        response.put("year", year);
        response.put("month", month);

        try {
            long lateDays = chamCongService.countLateDays(nhanvienId, year, month);
            long earlyLeaveDays = chamCongService.countEarlyLeaveDays(nhanvienId, year, month);
            int workingDays = chamCongService.countWorkingDays(nhanvienId, year, month);

            response.put("workingDays", workingDays);
            response.put("lateDays", lateDays);
            response.put("earlyLeaveDays", earlyLeaveDays);
        } catch (Exception e) {
            // Handle error gracefully - return 0 stats
            response.put("workingDays", 0);
            response.put("lateDays", 0);
            response.put("earlyLeaveDays", 0);
            response.put("error", e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Tính tổng giờ làm việc của nhân viên trong tháng
     * GET /api/cham-cong/nhan-vien/{nhanvienId}/total-hours?year=2024&month=1
     */
    @GetMapping("/nhan-vien/{nhanvienId}/total-hours")
    public ResponseEntity<BigDecimal> getTotalHours(
            @PathVariable Long nhanvienId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            BigDecimal totalHours = chamCongService.getTotalWorkingHours(nhanvienId, year, month);
            return ResponseEntity.ok(totalHours != null ? totalHours : BigDecimal.ZERO);
        } catch (Exception e) {
            return ResponseEntity.ok(BigDecimal.ZERO);
        }
    }

    /**
     * Check-in (chấm công vào)
     * POST /api/cham-cong/check-in
     */
    @PostMapping("/check-in")
    public ResponseEntity<ChamCongDTO> checkIn(
            @RequestParam Long nhanvienId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngayCham) {
        ChamCong chamCong = chamCongService.checkIn(nhanvienId, ngayCham);
        return ResponseEntity.status(HttpStatus.CREATED).body(chamCongMapper.toDTO(chamCong));
    }

    /**
     * Check-out (chấm công ra)
     * PATCH /api/cham-cong/{id}/check-out
     */
    @PatchMapping("/{id}/check-out")
    public ResponseEntity<ChamCongDTO> checkOut(@PathVariable Long id) {
        ChamCong chamCong = chamCongService.checkOut(id);
        return ResponseEntity.ok(chamCongMapper.toDTO(chamCong));
    }

    /**
     * ⭐⭐⭐ CHẤM CÔNG GPS - API mới
     * POST /api/cham-cong/gps
     */
    @PostMapping("/gps")
    public ResponseEntity<Map<String, Object>> chamCongGPS(@Valid @RequestBody ChamCongGPSRequest request) {
        User currentUser = getCurrentUser();
        Map<String, Object> response = chamCongService.chamCongGPS(request, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy trạng thái chấm công hôm nay
     * GET /api/cham-cong/status/{nhanvienId}
     */
    /**
     * Lấy trạng thái chấm công hôm nay
     * GET /api/cham-cong/status/{nhanvienId}
     */
    @GetMapping("/status/{nhanvienId}")
    public ResponseEntity<Map<String, Object>> getTrangThaiChamCongHomNay(@PathVariable Long nhanvienId) {
        System.out.println("DEBUG: Request to /status/" + nhanvienId);
        try {
            Map<String, Object> response = chamCongService.getTrangThaiChamCongHomNay(nhanvienId);
            System.out.println("DEBUG: Service returned: " + response);
            return ResponseEntity.ok(response);
        } catch (Throwable e) {
            e.printStackTrace(); // Print stack trace to console
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Lỗi (Throwable): " + e.getMessage());
            error.put("exception", e.getClass().getName());
            error.put("checkedIn", false);
            error.put("checkedOut", false);
            return ResponseEntity.ok(error); // Return 200 OK with error details
        }
    }
}
