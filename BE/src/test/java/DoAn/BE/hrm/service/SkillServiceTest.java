package DoAn.BE.hrm.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.EmployeeSkill;
import DoAn.BE.hrm.entity.Skill;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.EmployeeSkillRepository;
import DoAn.BE.hrm.repository.SkillRepository;

@ExtendWith(MockitoExtension.class)
public class SkillServiceTest {

    @Mock
    private SkillRepository skillRepository;
    @Mock
    private EmployeeSkillRepository employeeSkillRepository;
    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private SkillService skillService;

    private Skill testSkill;
    private Employee testEmployee;

    @BeforeEach
    void setUp() {
        testSkill = new Skill();
        testSkill.setId(1L);
        testSkill.setName("Java");
        testSkill.setCategory("Backend");

        testEmployee = new Employee();
        testEmployee.setEmployeeId(100L);
    }

    @Test
    void getAllSkills_ReturnsList() {
        when(skillRepository.findAll()).thenReturn(List.of(testSkill));

        List<Skill> result = skillService.getAllSkills();

        assertEquals(1, result.size());
        assertEquals("Java", result.get(0).getName());
    }

    @Test
    void createSkill_Success() {
        DoAn.BE.hrm.dto.CreateSkillRequest request = new DoAn.BE.hrm.dto.CreateSkillRequest();
        request.setName("Python");
        request.setCategory("Backend");
        request.setDescription("Python programming");

        when(skillRepository.save(any(Skill.class))).thenAnswer(i -> {
            Skill s = i.getArgument(0);
            s.setId(2L);
            return s;
        });

        Skill result = skillService.createSkill(request);

        assertEquals("Python", result.getName());
        assertEquals("Backend", result.getCategory());
        verify(skillRepository).save(any(Skill.class));
    }

    @Test
    void getSkillCategories_GroupsByCategory() {
        Skill skill2 = new Skill();
        skill2.setId(2L);
        skill2.setName("React");
        skill2.setCategory("Frontend");

        when(skillRepository.findAll()).thenReturn(List.of(testSkill, skill2));

        List<Map<String, Object>> result = skillService.getSkillCategories();

        assertNotNull(result);
        assertEquals(2, result.size()); // Backend + Frontend categories
    }

    @Test
    void getEmployeeSkills_ReturnsSkillMap() {
        EmployeeSkill es = new EmployeeSkill();
        es.setEmployee(testEmployee);
        es.setSkill(testSkill);
        es.setLevel(4);

        when(employeeSkillRepository.findByEmployeeEmployeeId(100L)).thenReturn(List.of(es));

        Map<String, Integer> result = skillService.getEmployeeSkills(100L);

        assertEquals(1, result.size());
        assertEquals(4, result.get("Java"));
    }

    @Test
    void updateEmployeeSkills_Success() {
        Map<String, Integer> skillLevels = Map.of("Java", 5);

        when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
        when(skillRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(testSkill));
        when(employeeSkillRepository.findByEmployeeAndSkill(100L, 1L)).thenReturn(Optional.empty());
        when(employeeSkillRepository.save(any(EmployeeSkill.class))).thenAnswer(i -> i.getArgument(0));

        skillService.updateEmployeeSkills(100L, skillLevels);

        verify(employeeSkillRepository).save(any(EmployeeSkill.class));
    }

    @Test
    void updateEmployeeSkills_EmployeeNotFound_Throws() {
        when(employeeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> skillService.updateEmployeeSkills(999L, Map.of("Java", 3)));
    }

    @Test
    void getSkillsMatrix_ReturnsEmployeeSkillMap() {
        EmployeeSkill es1 = new EmployeeSkill();
        es1.setEmployee(testEmployee);
        es1.setSkill(testSkill);
        es1.setLevel(5);

        Employee secondEmployee = new Employee();
        secondEmployee.setEmployeeId(200L);

        Skill reactSkill = new Skill();
        reactSkill.setId(2L);
        reactSkill.setName("React");

        EmployeeSkill es2 = new EmployeeSkill();
        es2.setEmployee(secondEmployee);
        es2.setSkill(reactSkill);
        es2.setLevel(3);

        when(employeeSkillRepository.findAllWithDetails()).thenReturn(List.of(es1, es2));

        Map<Long, Map<String, Integer>> matrix = skillService.getSkillsMatrix();

        assertEquals(2, matrix.size());
        assertEquals(5, matrix.get(100L).get("Java"));
        assertEquals(3, matrix.get(200L).get("React"));
    }

    @Test
    void getSkillsMatrix_EmptyResults_ReturnsEmptyMap() {
        when(employeeSkillRepository.findAllWithDetails()).thenReturn(List.of());

        Map<Long, Map<String, Integer>> matrix = skillService.getSkillsMatrix();

        assertTrue(matrix.isEmpty());
    }

    @Test
    void updateEmployeeSkills_SkillNotFound_AutoCreatesSkill() {
        Map<String, Integer> skillLevels = Map.of("Rust", 4);

        when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
        when(skillRepository.findByNameIgnoreCase("Rust")).thenReturn(Optional.empty());
        // Auto-create returns new skill
        when(skillRepository.save(any(Skill.class))).thenAnswer(i -> {
            Skill s = i.getArgument(0);
            s.setId(99L);
            return s;
        });
        when(employeeSkillRepository.findByEmployeeAndSkill(100L, 99L)).thenReturn(Optional.empty());
        when(employeeSkillRepository.save(any(EmployeeSkill.class))).thenAnswer(i -> i.getArgument(0));

        skillService.updateEmployeeSkills(100L, skillLevels);

        // Verify new skill was created with category "Other"
        verify(skillRepository)
                .save(argThat(skill -> "Rust".equals(skill.getName()) && "Other".equals(skill.getCategory())));
        verify(employeeSkillRepository).save(any(EmployeeSkill.class));
    }

    @Test
    void updateEmployeeSkills_ExistingSkillMapping_UpdatesLevel() {
        Map<String, Integer> skillLevels = Map.of("Java", 8);

        EmployeeSkill existingMapping = new EmployeeSkill();
        existingMapping.setEmployee(testEmployee);
        existingMapping.setSkill(testSkill);
        existingMapping.setLevel(4); // old level

        when(employeeRepository.findById(100L)).thenReturn(Optional.of(testEmployee));
        when(skillRepository.findByNameIgnoreCase("Java")).thenReturn(Optional.of(testSkill));
        when(employeeSkillRepository.findByEmployeeAndSkill(100L, 1L))
                .thenReturn(Optional.of(existingMapping));
        when(employeeSkillRepository.save(any(EmployeeSkill.class))).thenAnswer(i -> i.getArgument(0));

        skillService.updateEmployeeSkills(100L, skillLevels);

        assertEquals(8, existingMapping.getLevel());
        verify(employeeSkillRepository).save(existingMapping);
    }
}
