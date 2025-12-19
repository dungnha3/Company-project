package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.DanhGiaDTO;
import DoAn.BE.hr.dto.DanhGiaRequest;
import DoAn.BE.hr.entity.DanhGia;
import DoAn.BE.hr.mapper.DanhGiaMapper;
import DoAn.BE.hr.service.DanhGiaService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/danh-gia")
@RequiredArgsConstructor
public class DanhGiaController {
    
    private final DanhGiaService danhGiaService;
    private final DanhGiaMapper danhGiaMapper;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    /**
     * Tạo đánh giá mới
     * POST /api/danh-gia
     */
    @PostMapping
    public ResponseEntity<DanhGiaDTO> createDanhGia(@Valid @RequestBody DanhGiaRequest request) {
        User currentUser = getCurrentUser();
        DanhGia danhGia = danhGiaService.createDanhGia(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(danhGiaMapper.toDTO(danhGia));
    }
    
    /**
     * Lấy đánh giá theo ID
     * GET /api/danh-gia/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DanhGiaDTO> getDanhGiaById(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        DanhGia danhGia = danhGiaService.getDanhGiaById(id, currentUser);
        return ResponseEntity.ok(danhGiaMapper.toDTO(danhGia));
    }
    
    /**
     * Lấy danh sách tất cả đánh giá
     * GET /api/danh-gia
     */
    @GetMapping
    public ResponseEntity<List<DanhGiaDTO>> getAllDanhGia() {
        User currentUser = getCurrentUser();
        List<DanhGia> danhGias = danhGiaService.getAllDanhGia(currentUser);
        return ResponseEntity.ok(danhGiaMapper.toDTOList(danhGias));
    }
    
    /**
     * Lấy danh sách đánh giá có phân trang
     * GET /api/danh-gia/page
     */
    @GetMapping("/page")
    public ResponseEntity<Page<DanhGiaDTO>> getAllDanhGiaPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        
        User currentUser = getCurrentUser();
        
        Sort sort = sortDir.equalsIgnoreCase("desc") ? 
            Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<DanhGia> danhGiaPage = danhGiaService.getAllDanhGiaPage(pageable, currentUser);
        Page<DanhGiaDTO> dtoPage = danhGiaPage.map(danhGiaMapper::toDTO);
        
        return ResponseEntity.ok(dtoPage);
    }
    
    /**
     * Cập nhật đánh giá
     * PUT /api/danh-gia/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<DanhGiaDTO> updateDanhGia(
            @PathVariable Long id,
            @Valid @RequestBody DanhGiaRequest request) {
        User currentUser = getCurrentUser();
        DanhGia danhGia = danhGiaService.updateDanhGia(id, request, currentUser);
        return ResponseEntity.ok(danhGiaMapper.toDTO(danhGia));
    }
    
    /**
     * Gửi đánh giá để duyệt
     * PATCH /api/danh-gia/{id}/submit
     */
    @PatchMapping("/{id}/submit")
    public ResponseEntity<DanhGiaDTO> submitForApproval(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        DanhGia danhGia = danhGiaService.submitForApproval(id, currentUser);
        return ResponseEntity.ok(danhGiaMapper.toDTO(danhGia));
    }
    
    /**
     * Duyệt đánh giá
     * PATCH /api/danh-gia/{id}/approve
     */
    @PatchMapping("/{id}/approve")
    public ResponseEntity<DanhGiaDTO> approveDanhGia(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        User currentUser = getCurrentUser();
        String ghiChu = body != null ? body.get("ghiChu") : null;
        DanhGia danhGia = danhGiaService.approveDanhGia(id, ghiChu, currentUser);
        return ResponseEntity.ok(danhGiaMapper.toDTO(danhGia));
    }
    
    /**
     * Từ chối đánh giá
     * PATCH /api/danh-gia/{id}/reject
     */
    @PatchMapping("/{id}/reject")
    public ResponseEntity<DanhGiaDTO> rejectDanhGia(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User currentUser = getCurrentUser();
        String lyDo = body.get("lyDo");
        DanhGia danhGia = danhGiaService.rejectDanhGia(id, lyDo, currentUser);
        return ResponseEntity.ok(danhGiaMapper.toDTO(danhGia));
    }
    
    /**
     * Lấy đánh giá theo nhân viên
     * GET /api/danh-gia/nhan-vien/{nhanvienId}
     */
    @GetMapping("/nhan-vien/{nhanvienId}")
    public ResponseEntity<List<DanhGiaDTO>> getDanhGiaByNhanVien(@PathVariable Long nhanvienId) {
        User currentUser = getCurrentUser();
        List<DanhGia> danhGias = danhGiaService.getDanhGiaByNhanVien(nhanvienId, currentUser);
        return ResponseEntity.ok(danhGiaMapper.toDTOList(danhGias));
    }
    
    /**
     * Lấy danh sách đánh giá chờ duyệt
     * GET /api/danh-gia/pending
     */
    @GetMapping("/pending")
    public ResponseEntity<List<DanhGiaDTO>> getPendingDanhGia() {
        User currentUser = getCurrentUser();
        List<DanhGia> danhGias = danhGiaService.getPendingDanhGia(currentUser);
        return ResponseEntity.ok(danhGiaMapper.toDTOList(danhGias));
    }
    
    /**
     * Xóa đánh giá
     * DELETE /api/danh-gia/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteDanhGia(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        danhGiaService.deleteDanhGia(id, currentUser);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa đánh giá thành công");
        return ResponseEntity.ok(response);
    }
}
