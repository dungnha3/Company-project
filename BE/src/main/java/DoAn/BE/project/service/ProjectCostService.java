package DoAn.BE.project.service;

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.project.dto.ProjectCostDTO;
import DoAn.BE.project.dto.ProjectExpenseDTO;
import DoAn.BE.project.dto.ProjectExpenseRequest;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectExpense;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.ProjectExpenseRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectCostService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectExpenseRepository projectExpenseRepository;
    private final EmployeeRepository employeeRepository;

    public ProjectExpenseDTO addExpense(ProjectExpenseRequest request, User currentUser) {
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        ProjectExpense expense = new ProjectExpense();
        expense.setProject(project);
        expense.setExpenseName(request.getExpenseName());
        expense.setAmount(request.getAmount());
        expense.setExpenseDate(request.getExpenseDate());
        expense.setDescription(request.getDescription());
        expense.setCreatedBy(currentUser);

        ProjectExpense saved = projectExpenseRepository.save(expense);
        return convertToDTO(saved);
    }

    @Transactional(readOnly = true)
    public ProjectCostDTO calculateProjectCost(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        // 1. Calculate Expenses
        List<ProjectExpense> expenses = projectExpenseRepository.findByProject_ProjectIdOrderByExpenseDateDesc(projectId);
        BigDecimal totalExpenses = projectExpenseRepository.sumAmountByProjectId(projectId);
        
        List<ProjectExpenseDTO> expenseDTOs = expenses.stream().map(this::convertToDTO).collect(Collectors.toList());

        // 2. Calculate HR Cost based on daily rate and allocation
        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        List<ProjectCostDTO.MemberCostDTO> memberCosts = new ArrayList<>();
        BigDecimal totalHrCost = BigDecimal.ZERO;

        for (ProjectMember pm : members) {
            Employee emp = employeeRepository.findByUser_UserId(pm.getUser().getUserId()).orElse(null);
            if (emp == null || emp.getBaseSalary() == null || emp.getBaseSalary().compareTo(BigDecimal.ZERO) == 0) {
                continue; // Cannot calculate cost if no base salary
            }

            // Calculate active days
            LocalDate join = pm.getJoinDate() != null ? pm.getJoinDate() : project.getStartDate();
            if (join == null) join = LocalDate.now(); // fallback

            LocalDate leave = pm.getLeaveDate();
            if (leave == null) {
                leave = (project.getEndDate() != null && project.getEndDate().isBefore(LocalDate.now())) 
                        ? project.getEndDate() 
                        : LocalDate.now();
            }

            long days = ChronoUnit.DAYS.between(join, leave) + 1; // inclusive
            if (days < 0) days = 0;

            // Daily rate = Base Salary / 22 (assuming 22 working days)
            BigDecimal dailyRate = emp.getBaseSalary().divide(new BigDecimal(22), 2, RoundingMode.HALF_UP);
            
            // Allocation (defaults to 100% since manual planning is removed)
            Integer allocRate = (pm.getAllocationRate() != null && pm.getAllocationRate() > 0) ? pm.getAllocationRate() : 100;
            BigDecimal allocation = new BigDecimal(allocRate).divide(new BigDecimal(100), 2, RoundingMode.HALF_UP);

            // Total Cost for this member = days * dailyRate * allocation
            BigDecimal memberTotalCost = dailyRate.multiply(new BigDecimal(days)).multiply(allocation);
            totalHrCost = totalHrCost.add(memberTotalCost);

            ProjectCostDTO.MemberCostDTO mCostDTO = new ProjectCostDTO.MemberCostDTO(
                    pm.getUser().getUserId(),
                    emp.getFullName(),
                    pm.getPosition(),
                    (int) days,
                    allocRate,
                    dailyRate,
                    memberTotalCost
            );
            memberCosts.add(mCostDTO);
        }

        ProjectCostDTO dto = new ProjectCostDTO();
        dto.setProjectId(projectId);
        dto.setProjectName(project.getName());
        dto.setTotalHrCost(totalHrCost);
        dto.setTotalExpenses(totalExpenses);
        dto.setTotalProjectCost(totalHrCost.add(totalExpenses));
        dto.setMemberCosts(memberCosts);
        dto.setExpenses(expenseDTOs);

        return dto;
    }

    private ProjectExpenseDTO convertToDTO(ProjectExpense expense) {
        ProjectExpenseDTO dto = new ProjectExpenseDTO();
        dto.setExpenseId(expense.getExpenseId());
        dto.setProjectId(expense.getProject().getProjectId());
        dto.setExpenseName(expense.getExpenseName());
        dto.setAmount(expense.getAmount());
        dto.setExpenseDate(expense.getExpenseDate());
        dto.setDescription(expense.getDescription());
        if (expense.getCreatedBy() != null) {
            dto.setCreatedBy(expense.getCreatedBy().getUserId());
            dto.setCreatedByName(expense.getCreatedBy().getUsername());
        }
        dto.setCreatedAt(expense.getCreatedAt());
        return dto;
    }
}
