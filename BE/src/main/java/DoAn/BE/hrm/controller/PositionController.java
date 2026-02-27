package DoAn.BE.hrm.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.hrm.dto.PositionDTO;
import DoAn.BE.hrm.dto.PositionRequest;
import DoAn.BE.hrm.entity.Position;
import DoAn.BE.hrm.mapper.PositionMapper;
import DoAn.BE.hrm.service.PositionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.common.service.AccessControlService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/api/positions")
@RequiredArgsConstructor
@FeatureFlag("HR")
public class PositionController {

    private final PositionService positionService;
    private final PositionMapper positionMapper;
    private final AccessControlService accessControlService;
    @PostMapping
    public ResponseEntity<PositionDTO> createPosition(@Valid @RequestBody PositionRequest request) {
        accessControlService.checkHrEditPermission();
        Position position = positionService.createPosition(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(positionMapper.toDTO(position));
    }
    @GetMapping("/{id}")
    public ResponseEntity<PositionDTO> getPositionById(@PathVariable Long id) {
        accessControlService.checkHrViewPermission();
        Position position = positionService.getPositionById(id);
        return ResponseEntity.ok(positionMapper.toDTO(position));
    }
    @GetMapping
    public ResponseEntity<List<PositionDTO>> getAllPositions() {
        accessControlService.checkHrViewPermission();
        List<Position> positions = positionService.getAllPositions();
        return ResponseEntity.ok(positionMapper.toDTOList(positions));
    }
    @PutMapping("/{id}")
    public ResponseEntity<PositionDTO> updatePosition(
            @PathVariable Long id,
            @Valid @RequestBody PositionRequest request) {
        accessControlService.checkHrEditPermission();
        Position position = positionService.updatePosition(id, request);
        return ResponseEntity.ok(positionMapper.toDTO(position));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deletePosition(@PathVariable Long id) {
        accessControlService.checkHrEditPermission();
        positionService.deletePosition(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted position successfully");
        return ResponseEntity.ok(response);
    }
}