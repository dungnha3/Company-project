package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.HopDongDTO;
import DoAn.BE.hr.dto.HopDongRequest;
import DoAn.BE.hr.entity.HopDong;
import DoAn.BE.hr.entity.HopDong.TrangThaiHopDong;
import DoAn.BE.user.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import DoAn.BE.hr.mapper.HopDongMapper;
import DoAn.BE.hr.service.HopDongService;
import DoAn.BE.hr.service.NhanVienService;
import DoAn.BE.hr.entity.NhanVien;
import org.springframework.security.access.AccessDeniedException;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hop-dong")
public class HopDongController {

    private final HopDongService hopDongService;
    private final HopDongMapper hopDongMapper;
    private final NhanVienService nhanVienService;

    public HopDongController(HopDongService hopDongService, HopDongMapper hopDongMapper,
            NhanVienService nhanVienService) {
        this.hopDongService = hopDongService;
        this.hopDongMapper = hopDongMapper;
        this.nhanVienService = nhanVienService;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }

    /**
     * Kiểm tra quyền xem hợp đồng của nhân viên
     * - HR Manager và Admin: có thể xem tất cả
     * - Nhân viên thường: chỉ xem được hợp đồng của chính mình
     */
    private void validateContractAccess(Long nhanvienId, User currentUser) {
        // HR Manager và Admin có thể xem tất cả
        if (currentUser.isAdmin() || currentUser.isManagerHR()) {
            return; // Có quyền xem tất cả
        }

        // Nhân viên thường: chỉ xem được hợp đồng của chính mình
        NhanVien nhanVien = nhanVienService.getNhanVienByUserId(currentUser.getUserId());
        if (nhanVien == null || !nhanVien.getNhanvienId().equals(nhanvienId)) {
            throw new AccessDeniedException("Bạn không có quyền xem hợp đồng của nhân viên khác");
        }
    }

    /**
     * Tạo hợp đồng mới
     * POST /api/hop-dong
     */
    @PostMapping
    public ResponseEntity<HopDongDTO> createHopDong(@Valid @RequestBody HopDongRequest request) {
        User currentUser = getCurrentUser();
        HopDong hopDong = hopDongService.createHopDong(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(hopDongMapper.toDTO(hopDong, currentUser));
    }

    /**
     * Lấy thông tin hợp đồng theo ID
     * GET /api/hop-dong/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<HopDongDTO> getHopDongById(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        HopDong hopDong = hopDongService.getHopDongById(id);
        return ResponseEntity.ok(hopDongMapper.toDTO(hopDong, currentUser));
    }

    /**
     * Lấy danh sách tất cả hợp đồng
     * GET /api/hop-dong
     */
    @GetMapping
    public ResponseEntity<List<HopDongDTO>> getAllHopDong() {
        User currentUser = getCurrentUser();
        List<HopDong> hopDongs = hopDongService.getAllHopDong();
        return ResponseEntity.ok(hopDongMapper.toDTOList(hopDongs, currentUser));
    }

    /**
     * Cập nhật hợp đồng
     * PUT /api/hop-dong/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<HopDongDTO> updateHopDong(
            @PathVariable Long id,
            @Valid @RequestBody HopDongRequest request) {
        User currentUser = getCurrentUser();
        HopDong hopDong = hopDongService.updateHopDong(id, request);
        return ResponseEntity.ok(hopDongMapper.toDTO(hopDong, currentUser));
    }

    /**
     * Xóa hợp đồng
     * DELETE /api/hop-dong/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteHopDong(@PathVariable Long id) {
        hopDongService.deleteHopDong(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa hợp đồng thành công");
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy hợp đồng theo nhân viên
     * GET /api/hop-dong/nhan-vien/{nhanvienId}
     */
    @GetMapping("/nhan-vien/{nhanvienId}")
    public ResponseEntity<List<HopDongDTO>> getHopDongByNhanVien(@PathVariable Long nhanvienId) {
        User currentUser = getCurrentUser();
        validateContractAccess(nhanvienId, currentUser);
        List<HopDong> hopDongs = hopDongService.getHopDongByNhanVien(nhanvienId);
        return ResponseEntity.ok(hopDongMapper.toDTOList(hopDongs, currentUser));
    }

    /**
     * Lấy hợp đồng hiệu lực của nhân viên
     * GET /api/hop-dong/nhan-vien/{nhanvienId}/active
     */
    @GetMapping("/nhan-vien/{nhanvienId}/active")
    public ResponseEntity<HopDongDTO> getActiveHopDong(@PathVariable Long nhanvienId) {
        User currentUser = getCurrentUser();
        validateContractAccess(nhanvienId, currentUser);
        HopDong hopDong = hopDongService.getActiveHopDong(nhanvienId);
        return ResponseEntity.ok(hopDongMapper.toDTO(hopDong, currentUser));
    }

    /**
     * Lấy hợp đồng theo trạng thái
     * GET /api/hop-dong/trang-thai/{trangThai}
     */
    @GetMapping("/trang-thai/{trangThai}")
    public ResponseEntity<List<HopDongDTO>> getHopDongByTrangThai(@PathVariable TrangThaiHopDong trangThai) {
        User currentUser = getCurrentUser();
        List<HopDong> hopDongs = hopDongService.getHopDongByTrangThai(trangThai);
        return ResponseEntity.ok(hopDongMapper.toDTOList(hopDongs, currentUser));
    }

    /**
     * Hủy hợp đồng
     * PATCH /api/hop-dong/{id}/cancel
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<HopDongDTO> cancelHopDong(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        HopDong hopDong = hopDongService.cancelHopDong(id);
        return ResponseEntity.ok(hopDongMapper.toDTO(hopDong, currentUser));
    }

    /**
     * Gia hạn hợp đồng
     * PATCH /api/hop-dong/{id}/renew
     */
    @PatchMapping("/{id}/renew")
    public ResponseEntity<HopDongDTO> renewHopDong(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newEndDate) {
        User currentUser = getCurrentUser();
        HopDong hopDong = hopDongService.renewHopDong(id, newEndDate);
        return ResponseEntity.ok(hopDongMapper.toDTO(hopDong, currentUser));
    }

    /**
     * Lấy danh sách hợp đồng sắp hết hạn
     * GET /api/hop-dong/expiring?daysAhead=30
     */
    @GetMapping("/expiring")
    public ResponseEntity<List<HopDongDTO>> getExpiringContracts(
            @RequestParam(defaultValue = "30") int daysAhead) {
        User currentUser = getCurrentUser();
        List<HopDong> hopDongs = hopDongService.getExpiringContracts(daysAhead);
        return ResponseEntity.ok(hopDongMapper.toDTOList(hopDongs, currentUser));
    }

    /**
     * Cập nhật trạng thái hợp đồng hết hạn (batch job)
     * POST /api/hop-dong/update-expired
     */
    @PostMapping("/update-expired")
    public ResponseEntity<Map<String, Object>> updateExpiredContracts() {
        int count = hopDongService.updateExpiredContracts();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Cập nhật trạng thái hợp đồng hết hạn thành công");
        response.put("updatedCount", count);
        return ResponseEntity.ok(response);
    }

    /**
     * Kiểm tra nhân viên có hợp đồng hiệu lực không
     * GET /api/hop-dong/nhan-vien/{nhanvienId}/has-active
     */
    @GetMapping("/nhan-vien/{nhanvienId}/has-active")
    public ResponseEntity<Map<String, Object>> hasActiveContract(@PathVariable Long nhanvienId) {
        User currentUser = getCurrentUser();
        validateContractAccess(nhanvienId, currentUser);
        boolean hasActive = hopDongService.hasActiveContract(nhanvienId);
        Map<String, Object> response = new HashMap<>();
        response.put("nhanvienId", nhanvienId);
        response.put("hasActiveContract", hasActive);
        return ResponseEntity.ok(response);
    }
}
