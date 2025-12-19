package DoAn.BE.hr.controller;

import DoAn.BE.hr.dto.ChucVuDTO;
import DoAn.BE.hr.dto.ChucVuRequest;
import DoAn.BE.hr.entity.ChucVu;
import DoAn.BE.hr.mapper.ChucVuMapper;
import DoAn.BE.hr.service.ChucVuService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chuc-vu")
public class ChucVuController {

    private final ChucVuService chucVuService;
    private final ChucVuMapper chucVuMapper;

    public ChucVuController(ChucVuService chucVuService, ChucVuMapper chucVuMapper) {
        this.chucVuService = chucVuService;
        this.chucVuMapper = chucVuMapper;
    }

    @PostMapping
    public ResponseEntity<ChucVuDTO> createChucVu(@Valid @RequestBody ChucVuRequest request) {
        ChucVu chucVu = chucVuService.createChucVu(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(chucVuMapper.toDTO(chucVu));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChucVuDTO> getChucVuById(@PathVariable Long id) {
        ChucVu chucVu = chucVuService.getChucVuById(id);
        return ResponseEntity.ok(chucVuMapper.toDTO(chucVu));
    }

    @GetMapping
    public ResponseEntity<List<ChucVuDTO>> getAllChucVu() {
        List<ChucVu> chucVus = chucVuService.getAllChucVu();
        return ResponseEntity.ok(chucVuMapper.toDTOList(chucVus));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChucVuDTO> updateChucVu(
            @PathVariable Long id,
            @Valid @RequestBody ChucVuRequest request) {
        ChucVu chucVu = chucVuService.updateChucVu(id, request);
        return ResponseEntity.ok(chucVuMapper.toDTO(chucVu));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteChucVu(@PathVariable Long id) {
        chucVuService.deleteChucVu(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa chức vụ thành công");
        return ResponseEntity.ok(response);
    }
}
