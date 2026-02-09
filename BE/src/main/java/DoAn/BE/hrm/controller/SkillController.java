package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.entity.Skill;
import DoAn.BE.hrm.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

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
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'MANAGER_HR')")
    public ResponseEntity<Skill> createSkill(@RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.createSkill(request));
    }

    @PutMapping("/employee/{empId}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'MANAGER_HR')")
    public ResponseEntity<Void> updateEmployeeSkills(
            @PathVariable Long empId,
            @RequestBody Map<String, Integer> skillLevels) {
        skillService.updateEmployeeSkills(empId, skillLevels);
        return ResponseEntity.ok().build();
    }
}
