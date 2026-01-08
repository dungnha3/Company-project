package DoAn.BE.hrm.controller;

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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// [Controller managing positions] (Role: HR Manager)
@RestController
@RequestMapping("/api/positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService positionService;
    private final PositionMapper positionMapper;

    // [Create new position] (Role: HR Manager)
    @PostMapping
    public ResponseEntity<PositionDTO> createPosition(@Valid @RequestBody PositionRequest request) {
        Position position = positionService.createPosition(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(positionMapper.toDTO(position));
    }

    // [Get position by ID] (Role: All)
    @GetMapping("/{id}")
    public ResponseEntity<PositionDTO> getPositionById(@PathVariable Long id) {
        Position position = positionService.getPositionById(id);
        return ResponseEntity.ok(positionMapper.toDTO(position));
    }

    // [Get all positions] (Role: All)
    @GetMapping
    public ResponseEntity<List<PositionDTO>> getAllPositions() {
        List<Position> positions = positionService.getAllPositions();
        return ResponseEntity.ok(positionMapper.toDTOList(positions));
    }

    // [Update position] (Role: HR Manager)
    @PutMapping("/{id}")
    public ResponseEntity<PositionDTO> updatePosition(
            @PathVariable Long id,
            @Valid @RequestBody PositionRequest request) {
        Position position = positionService.updatePosition(id, request);
        return ResponseEntity.ok(positionMapper.toDTO(position));
    }

    // [Delete position] (Role: HR Manager)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deletePosition(@PathVariable Long id) {
        positionService.deletePosition(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted position successfully");
        return ResponseEntity.ok(response);
    }
}
