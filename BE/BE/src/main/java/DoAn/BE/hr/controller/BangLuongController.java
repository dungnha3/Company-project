package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.BangLuongDTO;
import DoAn.BE.hr.dto.CreateBangLuongRequest;
import DoAn.BE.hr.dto.UpdateBangLuongRequest;
import DoAn.BE.hr.entity.BangLuong;
import DoAn.BE.hr.mapper.BangLuongMapper;
import DoAn.BE.hr.service.BangLuongService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bang-luong")
public class BangLuongController {

    private final BangLuongService bangLuongService;
    private final BangLuongMapper bangLuongMapper;

    public BangLuongController(BangLuongService bangLuongService, BangLuongMapper bangLuongMapper) {
        this.bangLuongService = bangLuongService;
        this.bangLuongMapper = bangLuongMapper;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }

    // Tạo bảng lương mới
    @PostMapping
    public ResponseEntity<BangLuongDTO> createBangLuong(@Valid @RequestBody CreateBangLuongRequest request) {
        User currentUser = getCurrentUser();
        BangLuong bangLuong = bangLuongService.createBangLuong(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(bangLuongMapper.toDTO(bangLuong));
    }

    // Lấy thông tin bảng lương theo ID
    @GetMapping("/{id}")
    public ResponseEntity<BangLuongDTO> getBangLuongById(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        BangLuong bangLuong = bangLuongService.getBangLuongById(id, currentUser);
        return ResponseEntity.ok(bangLuongMapper.toDTO(bangLuong));
    }

    // Lấy danh sách tất cả bảng lương
    @GetMapping
    public ResponseEntity<List<BangLuongDTO>> getAllBangLuong() {
        User currentUser = getCurrentUser();
        List<BangLuong> bangLuongs = bangLuongService.getAllBangLuong(currentUser);
        return ResponseEntity.ok(bangLuongMapper.toDTOList(bangLuongs));
    }

    // Cập nhật bảng lương
    @PutMapping("/{id}")
    public ResponseEntity<BangLuongDTO> updateBangLuong(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBangLuongRequest request) {
        User currentUser = getCurrentUser();
        BangLuong bangLuong = bangLuongService.updateBangLuong(id, request, currentUser);
        return ResponseEntity.ok(bangLuongMapper.toDTO(bangLuong));
    }

    // Xóa bảng lương
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteBangLuong(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        bangLuongService.deleteBangLuong(id, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa bảng lương thành công");
        return ResponseEntity.ok(response);
    }

    // Lấy bảng lương theo nhân viên
    @GetMapping("/nhan-vien/{nhanvienId}")
    public ResponseEntity<List<BangLuongDTO>> getBangLuongByNhanVien(@PathVariable Long nhanvienId) {
        User currentUser = getCurrentUser();
        List<BangLuong> bangLuongs = bangLuongService.getBangLuongByNhanVien(nhanvienId, currentUser);
        return ResponseEntity.ok(bangLuongMapper.toDTOList(bangLuongs));
    }

    // Lấy bảng lương theo kỳ (tháng/năm)
    @GetMapping("/period")
    public ResponseEntity<List<BangLuongDTO>> getBangLuongByPeriod(
            @RequestParam Integer thang,
            @RequestParam Integer nam) {
        User currentUser = getCurrentUser();
        List<BangLuong> bangLuongs = bangLuongService.getBangLuongByPeriod(thang, nam, currentUser);
        return ResponseEntity.ok(bangLuongMapper.toDTOList(bangLuongs));
    }

    // Lấy bảng lương theo nhân viên và kỳ
    @GetMapping("/nhan-vien/{nhanvienId}/period")
    public ResponseEntity<?> getBangLuongByNhanVienAndPeriod(
            @PathVariable Long nhanvienId,
            @RequestParam Integer thang,
            @RequestParam Integer nam) {
        try {
            User currentUser = getCurrentUser();
            BangLuong bangLuong = bangLuongService.getBangLuongByNhanVienAndPeriod(nhanvienId, thang, nam, currentUser);

            // Trả về 204 No Content nếu không có bảng lương (thay vì 500)
            if (bangLuong == null) {
                return ResponseEntity.noContent().build();
            }

            return ResponseEntity.ok(bangLuongMapper.toDTO(bangLuong));
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("message", e.getMessage());
            error.put("trace", e.toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // Lấy bảng lương theo trạng thái
    @GetMapping("/trang-thai/{trangThai}")
    public ResponseEntity<List<BangLuongDTO>> getBangLuongByTrangThai(@PathVariable String trangThai) {
        User currentUser = getCurrentUser();
        List<BangLuong> bangLuongs = bangLuongService.getBangLuongByTrangThai(trangThai, currentUser);
        return ResponseEntity.ok(bangLuongMapper.toDTOList(bangLuongs));
    }

    // Đánh dấu đã thanh toán
    @PatchMapping("/{id}/mark-paid")
    public ResponseEntity<BangLuongDTO> markAsPaid(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        BangLuong bangLuong = bangLuongService.markAsPaid(id, currentUser);
        return ResponseEntity.ok(bangLuongMapper.toDTO(bangLuong));
    }

    // Hủy bảng lương
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<BangLuongDTO> cancelBangLuong(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        BangLuong bangLuong = bangLuongService.cancelBangLuong(id, currentUser);
        return ResponseEntity.ok(bangLuongMapper.toDTO(bangLuong));
    }

    // Tính tổng lương thực nhận theo kỳ
    @GetMapping("/total/period")
    public ResponseEntity<Map<String, Object>> getTotalSalaryByPeriod(
            @RequestParam Integer thang,
            @RequestParam Integer nam) {
        User currentUser = getCurrentUser();
        BigDecimal total = bangLuongService.getTotalSalaryByPeriod(thang, nam, currentUser);
        Map<String, Object> response = new HashMap<>();
        response.put("thang", thang);
        response.put("nam", nam);
        response.put("tongLuongThucNhan", total);
        return ResponseEntity.ok(response);
    }

    // Tính tổng lương thực nhận theo nhân viên trong năm
    @GetMapping("/total/nhan-vien/{nhanvienId}/year/{nam}")
    public ResponseEntity<Map<String, Object>> getTotalSalaryByNhanVienAndYear(
            @PathVariable Long nhanvienId,
            @PathVariable Integer nam) {
        User currentUser = getCurrentUser();
        BigDecimal total = bangLuongService.getTotalSalaryByNhanVienAndYear(nhanvienId, nam, currentUser);
        Map<String, Object> response = new HashMap<>();
        response.put("nhanvienId", nhanvienId);
        response.put("nam", nam);
        response.put("tongLuongThucNhan", total);
        return ResponseEntity.ok(response);
    }

    // Tính lương tự động
    @PostMapping("/tinh-tu-dong/{nhanvienId}")
    public ResponseEntity<BangLuongDTO> tinhLuongTuDong(
            @PathVariable Long nhanvienId,
            @RequestParam Integer thang,
            @RequestParam Integer nam) {
        User currentUser = getCurrentUser();
        BangLuong bangLuong = bangLuongService.tinhLuongTuDong(nhanvienId, thang, nam, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(bangLuongMapper.toDTO(bangLuong));
    }

    // Tính lương tự động cho tất cả
    @PostMapping("/tinh-tu-dong-tat-ca")
    public ResponseEntity<Map<String, Object>> tinhLuongTuDongChoTatCa(
            @RequestParam Integer thang,
            @RequestParam Integer nam) {
        User currentUser = getCurrentUser();
        List<BangLuong> bangLuongs = bangLuongService.tinhLuongTuDongChoTatCa(thang, nam, currentUser);
        Map<String, Object> response = new HashMap<>();
        response.put("thang", thang);
        response.put("nam", nam);
        response.put("soLuongBangLuong", bangLuongs.size());
        response.put("danhSach", bangLuongMapper.toDTOList(bangLuongs));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Lấy danh sách bảng lương có phân trang
    @GetMapping("/page")
    public ResponseEntity<Page<BangLuongDTO>> getBangLuongPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "thang") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        User currentUser = getCurrentUser();
        Page<BangLuong> bangLuongPage = bangLuongService.getAllBangLuongPage(pageable, currentUser);
        Page<BangLuongDTO> dtoPage = bangLuongPage.map(bangLuongMapper::toDTO);

        return ResponseEntity.ok(dtoPage);
    }
}
