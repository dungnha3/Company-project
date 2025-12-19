package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.ApproveRejectRequest;
import DoAn.BE.hr.dto.NghiPhepDTO;
import DoAn.BE.hr.dto.NghiPhepRequest;
import DoAn.BE.hr.entity.NghiPhep;
import DoAn.BE.hr.mapper.NghiPhepMapper;
import DoAn.BE.hr.service.NghiPhepService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nghi-phep")
public class NghiPhepController {

    private final NghiPhepService nghiPhepService;
    private final NghiPhepMapper nghiPhepMapper;

    public NghiPhepController(NghiPhepService nghiPhepService, NghiPhepMapper nghiPhepMapper) {
        this.nghiPhepService = nghiPhepService;
        this.nghiPhepMapper = nghiPhepMapper;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }

    /**
     * Tạo đơn nghỉ phép mới
     * POST /api/nghi-phep
     */
    @PostMapping
    public ResponseEntity<NghiPhepDTO> createNghiPhep(@Valid @RequestBody NghiPhepRequest request) {
        User currentUser = getCurrentUser();
        NghiPhep nghiPhep = nghiPhepService.createNghiPhep(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(nghiPhepMapper.toDTO(nghiPhep));
    }

    /**
     * Lấy thông tin nghỉ phép theo ID
     * GET /api/nghi-phep/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<NghiPhepDTO> getNghiPhepById(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        NghiPhep nghiPhep = nghiPhepService.getNghiPhepById(id, currentUser);
        return ResponseEntity.ok(nghiPhepMapper.toDTO(nghiPhep));
    }

    /**
     * Lấy danh sách tất cả nghỉ phép
     * GET /api/nghi-phep
     */
    @GetMapping
    public ResponseEntity<List<NghiPhepDTO>> getAllNghiPhep() {
        User currentUser = getCurrentUser();
        List<NghiPhep> nghiPheps = nghiPhepService.getAllNghiPhep(currentUser);
        return ResponseEntity.ok(nghiPhepMapper.toDTOList(nghiPheps));
    }

    /**
     * Cập nhật đơn nghỉ phép
     * PUT /api/nghi-phep/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<NghiPhepDTO> updateNghiPhep(
            @PathVariable Long id,
            @Valid @RequestBody NghiPhepRequest request) {
        User currentUser = getCurrentUser();
        NghiPhep nghiPhep = nghiPhepService.updateNghiPhep(id, request, currentUser);
        return ResponseEntity.ok(nghiPhepMapper.toDTO(nghiPhep));
    }

    /**
     * Xóa đơn nghỉ phép
     * DELETE /api/nghi-phep/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNghiPhep(@PathVariable Long id) {
        nghiPhepService.deleteNghiPhep(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa đơn nghỉ phép thành công");
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy nghỉ phép theo nhân viên
     * GET /api/nghi-phep/nhan-vien/{nhanvienId}
     */
    @GetMapping("/nhan-vien/{nhanvienId}")
    public ResponseEntity<?> getNghiPhepByNhanVien(@PathVariable Long nhanvienId) {
        try {
            List<NghiPhep> nghiPheps = nghiPhepService.getNghiPhepByNhanVien(nhanvienId);
            return ResponseEntity.ok(nghiPhepMapper.toDTOList(nghiPheps));
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("message", e.getMessage());
            error.put("trace", e.toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Lấy nghỉ phép trong khoảng thời gian
     * GET /api/nghi-phep/date-range?startDate=2024-01-01&endDate=2024-12-31
     */
    @GetMapping("/date-range")
    public ResponseEntity<List<NghiPhepDTO>> getNghiPhepInDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<NghiPhep> nghiPheps = nghiPhepService.getNghiPhepInDateRange(startDate, endDate);
        return ResponseEntity.ok(nghiPhepMapper.toDTOList(nghiPheps));
    }

    /**
     * Lấy danh sách đơn chờ duyệt
     * GET /api/nghi-phep/pending
     */
    @GetMapping("/pending")
    public ResponseEntity<List<NghiPhepDTO>> getPendingNghiPhep() {
        List<NghiPhep> nghiPheps = nghiPhepService.getPendingNghiPhep();
        return ResponseEntity.ok(nghiPhepMapper.toDTOList(nghiPheps));
    }

    /**
     * Lấy danh sách đơn đã duyệt
     * GET /api/nghi-phep/approved
     */
    @GetMapping("/approved")
    public ResponseEntity<List<NghiPhepDTO>> getApprovedNghiPhep() {
        List<NghiPhep> nghiPheps = nghiPhepService.getApprovedNghiPhep();
        return ResponseEntity.ok(nghiPhepMapper.toDTOList(nghiPheps));
    }

    /**
     * Lấy danh sách đơn bị từ chối
     * GET /api/nghi-phep/rejected
     */
    @GetMapping("/rejected")
    public ResponseEntity<List<NghiPhepDTO>> getRejectedNghiPhep() {
        List<NghiPhep> nghiPheps = nghiPhepService.getRejectedNghiPhep();
        return ResponseEntity.ok(nghiPhepMapper.toDTOList(nghiPheps));
    }

    /**
     * Duyệt đơn nghỉ phép
     * PATCH /api/nghi-phep/{id}/approve
     */
    @PatchMapping("/{id}/approve")
    public ResponseEntity<NghiPhepDTO> approveNghiPhep(
            @PathVariable Long id,
            @Valid @RequestBody ApproveRejectRequest request) {
        User currentUser = getCurrentUser();
        NghiPhep nghiPhep = nghiPhepService.approveNghiPhep(id, request.getGhiChu(), currentUser);
        return ResponseEntity.ok(nghiPhepMapper.toDTO(nghiPhep));
    }

    /**
     * Từ chối đơn nghỉ phép
     * PATCH /api/nghi-phep/{id}/reject
     */
    @PatchMapping("/{id}/reject")
    public ResponseEntity<NghiPhepDTO> rejectNghiPhep(
            @PathVariable Long id,
            @Valid @RequestBody ApproveRejectRequest request) {
        User currentUser = getCurrentUser();
        NghiPhep nghiPhep = nghiPhepService.rejectNghiPhep(id, request.getGhiChu(), currentUser);
        return ResponseEntity.ok(nghiPhepMapper.toDTO(nghiPhep));
    }

    /**
     * Tính tổng số ngày nghỉ của nhân viên trong năm
     * GET /api/nghi-phep/nhan-vien/{nhanvienId}/total-days?year=2024
     */
    @GetMapping("/nhan-vien/{nhanvienId}/total-days")
    public ResponseEntity<Map<String, Object>> getTotalLeaveDays(
            @PathVariable Long nhanvienId,
            @RequestParam int year) {
        int totalDays = nghiPhepService.getTotalLeaveDays(nhanvienId, year);
        Map<String, Object> response = new HashMap<>();
        response.put("nhanvienId", nhanvienId);
        response.put("year", year);
        response.put("totalLeaveDays", totalDays);
        return ResponseEntity.ok(response);
    }

    /**
     * Kiểm tra nhân viên có đang nghỉ phép không
     * GET /api/nghi-phep/nhan-vien/{nhanvienId}/is-on-leave?date=2024-01-15
     */
    @GetMapping("/nhan-vien/{nhanvienId}/is-on-leave")
    public ResponseEntity<Map<String, Object>> isOnLeave(
            @PathVariable Long nhanvienId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        boolean onLeave = nghiPhepService.isOnLeave(nhanvienId, date);
        Map<String, Object> response = new HashMap<>();
        response.put("nhanvienId", nhanvienId);
        response.put("date", date);
        response.put("isOnLeave", onLeave);
        return ResponseEntity.ok(response);
    }
}
