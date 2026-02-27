package DoAn.BE.hrm.service;

import DoAn.BE.hrm.entity.Skill;
import DoAn.BE.hrm.entity.EmployeeSkill;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.SkillRepository;
import DoAn.BE.hrm.repository.EmployeeSkillRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillRepository skillRepository;
    private final EmployeeSkillRepository employeeSkillRepository;
    private final EmployeeRepository employeeRepository;

    public List<Map<String, Object>> getSkillCategories() {
        List<Skill> skills = skillRepository.findAll();

        // Group by category
        Map<String, List<String>> grouped = skills.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCategory() != null ? s.getCategory() : "Other",
                        Collectors.mapping(Skill::getName, Collectors.toList())));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : grouped.entrySet()) {
            Map<String, Object> category = new HashMap<>();
            category.put("name", entry.getKey());
            category.put("skills", entry.getValue());
            result.add(category);
        }

        return result;
    }

    public Map<Long, Map<String, Integer>> getSkillsMatrix() {
        List<EmployeeSkill> allSkills = employeeSkillRepository.findAllWithDetails();

        Map<Long, Map<String, Integer>> matrix = new HashMap<>();

        for (EmployeeSkill es : allSkills) {
            Long empId = es.getEmployee().getEmployeeId();
            String skillName = es.getSkill().getName();
            Integer level = es.getLevel();

            matrix.computeIfAbsent(empId, k -> new HashMap<>())
                    .put(skillName, level);
        }

        return matrix;
    }

    public List<Skill> getAllSkills() {
        return skillRepository.findAll();
    }

    @Transactional
    public Skill createSkill(DoAn.BE.hrm.dto.CreateSkillRequest request) {
        Skill skill = new Skill();
        skill.setName(request.getName());
        skill.setCategory(request.getCategory());
        skill.setDescription(request.getDescription());
        return skillRepository.save(skill);
    }

    public Map<String, Integer> getEmployeeSkills(Long employeeId) {
        List<EmployeeSkill> skills = employeeSkillRepository.findByEmployeeEmployeeId(employeeId);

        Map<String, Integer> result = new HashMap<>();
        for (EmployeeSkill es : skills) {
            result.put(es.getSkill().getName(), es.getLevel());
        }

        return result;
    }

    @Transactional
    public void updateEmployeeSkills(Long employeeId, Map<String, Integer> skillLevels) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        for (Map.Entry<String, Integer> entry : skillLevels.entrySet()) {
            String skillName = entry.getKey();
            Integer level = entry.getValue();

            // Find or create skill
            Skill skill = skillRepository.findByNameIgnoreCase(skillName)
                    .orElseGet(() -> {
                        Skill newSkill = new Skill();
                        newSkill.setName(skillName);
                        newSkill.setCategory("Other");
                        return skillRepository.save(newSkill);
                    });

            // Find or create employee skill mapping
            EmployeeSkill empSkill = employeeSkillRepository
                    .findByEmployeeAndSkill(employeeId, skill.getId())
                    .orElseGet(() -> {
                        EmployeeSkill newEs = new EmployeeSkill();
                        newEs.setEmployee(employee);
                        newEs.setSkill(skill);
                        return newEs;
                    });

            empSkill.setLevel(level);
            employeeSkillRepository.save(empSkill);
        }
    }
}
