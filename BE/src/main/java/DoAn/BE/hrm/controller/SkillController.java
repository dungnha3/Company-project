package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.CreateSkillRequest;
import DoAn.BE.hrm.entity.Skill;
import DoAn.BE.hrm.service.SkillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import DoAn.BE.common.service.AccessControlService;

import java.util.Map;

import DoAn.BE.common.annotation.FeatureFlag;

@RestController
@RequestMapping("/api/skills")
@FeatureFlag("SKILLS_MATRIX")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;
    private final AccessControlService accessControlService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getSkillCategories() {
        return ResponseEntity.ok(skillService.getSkillCategories());
    }

    @GetMapping("/matrix")
    public ResponseEntity<Map<Long, Map<String, Integer>>> getSkillsMatrix() {
        return ResponseEntity.ok(skillService.getSkillsMatrix());
    }

    @GetMapping("/employee/{empId}")
    public ResponseEntity<Map<String, Integer>> getEmployeeSkills(@PathVariable Long empId) {
        return ResponseEntity.ok(skillService.getEmployeeSkills(empId));
    }

    @PostMapping
    public ResponseEntity<Skill> createSkill(@Valid @RequestBody CreateSkillRequest request) {
        accessControlService.checkHrEditPermission();
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.createSkill(request));
    }

    @PutMapping("/employee/{empId}")
    public ResponseEntity<Void> updateEmployeeSkills(
            @PathVariable Long empId,
            @RequestBody Map<String, Integer> skillLevels) {
        accessControlService.checkHrEditPermission();
        skillService.updateEmployeeSkills(empId, skillLevels);
        return ResponseEntity.ok().build();
    }
}
