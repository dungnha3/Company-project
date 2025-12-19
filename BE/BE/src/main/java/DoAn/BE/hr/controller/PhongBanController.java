package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.PhongBanDTO;
import DoAn.BE.hr.dto.PhongBanRequest;
import DoAn.BE.hr.entity.PhongBan;
import DoAn.BE.hr.mapper.PhongBanMapper;
import DoAn.BE.hr.service.PhongBanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phong-ban")
public class PhongBanController {

    private final PhongBanService phongBanService;
    private final PhongBanMapper phongBanMapper;

    public PhongBanController(PhongBanService phongBanService, PhongBanMapper phongBanMapper) {
        this.phongBanService = phongBanService;
        this.phongBanMapper = phongBanMapper;
    }

    @PostMapping
    public ResponseEntity<PhongBanDTO> createPhongBan(@Valid @RequestBody PhongBanRequest request) {
        PhongBan phongBan = phongBanService.createPhongBan(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(phongBanMapper.toDTO(phongBan));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PhongBanDTO> getPhongBanById(@PathVariable Long id) {
        PhongBan phongBan = phongBanService.getPhongBanById(id);
        return ResponseEntity.ok(phongBanMapper.toDTO(phongBan));
    }

    @GetMapping
    public ResponseEntity<List<PhongBanDTO>> getAllPhongBan() {
        List<PhongBan> phongBans = phongBanService.getAllPhongBan();
        return ResponseEntity.ok(phongBanMapper.toDTOList(phongBans));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PhongBanDTO> updatePhongBan(
            @PathVariable Long id,
            @Valid @RequestBody PhongBanRequest request) {
        PhongBan phongBan = phongBanService.updatePhongBan(id, request);
        return ResponseEntity.ok(phongBanMapper.toDTO(phongBan));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deletePhongBan(@PathVariable Long id) {
        phongBanService.deletePhongBan(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa phòng ban thành công");
        return ResponseEntity.ok(response);
    }
}
