package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.NhanVienDTO;
import DoAn.BE.hr.dto.NhanVienRequest;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.entity.NhanVien.TrangThaiNhanVien;
import DoAn.BE.hr.mapper.NhanVienMapper;
import DoAn.BE.hr.service.NhanVienService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nhan-vien")
public class NhanVienController {

    private final NhanVienService nhanVienService;
    private final NhanVienMapper nhanVienMapper;

    public NhanVienController(NhanVienService nhanVienService, NhanVienMapper nhanVienMapper) {
        this.nhanVienService = nhanVienService;
        this.nhanVienMapper = nhanVienMapper;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }

    @PostMapping
    public ResponseEntity<NhanVienDTO> createNhanVien(@Valid @RequestBody NhanVienRequest request) {
        User currentUser = getCurrentUser();
        NhanVien nhanVien = nhanVienService.createNhanVien(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(nhanVienMapper.toDTO(nhanVien, currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NhanVienDTO> getNhanVienById(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        NhanVien nhanVien = nhanVienService.getNhanVienById(id, currentUser);
        return ResponseEntity.ok(nhanVienMapper.toDTO(nhanVien, currentUser));
    }

    /**
     * Lấy tất cả nhân viên (không phân trang)
     */
    @GetMapping
    public ResponseEntity<List<NhanVienDTO>> getAllNhanVien() {
        User currentUser = getCurrentUser();
        List<NhanVien> nhanViens = nhanVienService.getAllNhanVien(currentUser);
        return ResponseEntity.ok(nhanVienMapper.toDTOList(nhanViens, currentUser));
    }

    /**
     * ⭐ Lấy danh sách nhân viên có phân trang
     * GET /api/nhan-vien/page?page=0&size=10&sort=hoTen,asc
     */
    @GetMapping("/page")
    public ResponseEntity<Page<NhanVienDTO>> getNhanVienPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "hoTen") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        User currentUser = getCurrentUser();
        Page<NhanVien> nhanVienPage = nhanVienService.getAllNhanVienPage(pageable);
        Page<NhanVienDTO> dtoPage = nhanVienPage.map(nv -> nhanVienMapper.toDTO(nv, currentUser));

        return ResponseEntity.ok(dtoPage);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NhanVienDTO> updateNhanVien(
            @PathVariable Long id,
            @Valid @RequestBody NhanVienRequest request) {
        User currentUser = getCurrentUser();
        NhanVien nhanVien = nhanVienService.updateNhanVien(id, request, currentUser);
        return ResponseEntity.ok(nhanVienMapper.toDTO(nhanVien, currentUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNhanVien(@PathVariable Long id) {
        nhanVienService.deleteNhanVien(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa nhân viên thành công");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/trang-thai/{trangThai}")
    public ResponseEntity<List<NhanVienDTO>> getNhanVienByTrangThai(@PathVariable TrangThaiNhanVien trangThai) {
        User currentUser = getCurrentUser();
        List<NhanVien> nhanViens = nhanVienService.getNhanVienByTrangThai(trangThai);
        return ResponseEntity.ok(nhanVienMapper.toDTOList(nhanViens, currentUser));
    }

    @GetMapping("/phong-ban/{phongbanId}")
    public ResponseEntity<List<NhanVienDTO>> getNhanVienByPhongBan(@PathVariable Long phongbanId) {
        User currentUser = getCurrentUser();
        List<NhanVien> nhanViens = nhanVienService.getNhanVienByPhongBan(phongbanId);
        return ResponseEntity.ok(nhanVienMapper.toDTOList(nhanViens, currentUser));
    }

    @GetMapping("/chuc-vu/{chucvuId}")
    public ResponseEntity<List<NhanVienDTO>> getNhanVienByChucVu(@PathVariable Long chucvuId) {
        User currentUser = getCurrentUser();
        List<NhanVien> nhanViens = nhanVienService.getNhanVienByChucVu(chucvuId);
        return ResponseEntity.ok(nhanVienMapper.toDTOList(nhanViens, currentUser));
    }

    @GetMapping("/search")
    public ResponseEntity<List<NhanVienDTO>> searchNhanVien(@RequestParam String keyword) {
        User currentUser = getCurrentUser();
        List<NhanVien> nhanViens = nhanVienService.searchNhanVien(keyword);
        return ResponseEntity.ok(nhanVienMapper.toDTOList(nhanViens, currentUser));
    }

    @PatchMapping("/{id}/trang-thai")
    public ResponseEntity<NhanVienDTO> updateTrangThai(
            @PathVariable Long id,
            @RequestParam TrangThaiNhanVien trangThai) {
        User currentUser = getCurrentUser();
        NhanVien nhanVien = nhanVienService.updateTrangThai(id, trangThai);
        return ResponseEntity.ok(nhanVienMapper.toDTO(nhanVien, currentUser));
    }

    /**
     * Lấy nhân viên theo User ID
     * GET /api/nhan-vien/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getNhanVienByUserId(@PathVariable Long userId) {
        try {
            User currentUser = getCurrentUser();
            NhanVien nhanVien = nhanVienService.getNhanVienByUserId(userId);
            return ResponseEntity.ok(nhanVienMapper.toDTO(nhanVien, currentUser));
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
     * Kiểm tra User đã có nhân viên chưa
     * GET /api/nhan-vien/user/{userId}/exists
     */
    @GetMapping("/user/{userId}/exists")
    public ResponseEntity<Map<String, Boolean>> hasNhanVien(@PathVariable Long userId) {
        boolean exists = nhanVienService.hasNhanVien(userId);
        Map<String, Boolean> response = new HashMap<>();
        response.put("hasNhanVien", exists);
        return ResponseEntity.ok(response);
    }
}
