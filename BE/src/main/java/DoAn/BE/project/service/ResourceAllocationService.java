package DoAn.BE.project.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.project.dto.ResourceAllocationDTO;
import DoAn.BE.project.dto.ResourceAllocationRequest;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ResourceAllocation;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.ResourceAllocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class ResourceAllocationService {

    private final ResourceAllocationRepository allocationRepo;
    private final EmployeeRepository employeeRepo;
    private final ProjectRepository projectRepo;
    private final AccessControlService accessControl;

    @Transactional(readOnly = true)
    public List<ResourceAllocationDTO> getAllocations() {
        Long companyId = accessControl.getCurrentCompanyId();
        if (companyId == null) {
            return java.util.Collections.emptyList();
        }
        return allocationRepo.findByCompanyId(companyId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ResourceAllocationDTO> getAllocationsByEmployee(Long employeeId) {
        if (employeeId == null) {
            throw new BadRequestException("Invalid Employee ID");
        }
        Long companyId = accessControl.getCurrentCompanyId();
        return allocationRepo.findByCompanyIdAndEmployeeId(companyId, employeeId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ResourceAllocationDTO> getAllocationsByProject(Long projectId) {
        if (projectId == null) {
            throw new BadRequestException("Invalid Project ID");
        }
        Long companyId = accessControl.getCurrentCompanyId();
        return allocationRepo.findByCompanyIdAndProjectId(companyId, projectId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ResourceAllocationDTO create(ResourceAllocationRequest request) {
        if (request == null) {
            throw new BadRequestException("Request cannot be empty");
        }

        accessControl.checkProjectManageAllPermission();

        Employee emp = employeeRepo.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        if (request.getEndDate() != null && request.getStartDate() != null &&
                request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        ResourceAllocation allocation = new ResourceAllocation();
        allocation.setEmployee(emp);
        allocation.setStartDate(request.getStartDate());
        allocation.setEndDate(request.getEndDate());
        allocation.setAllocation(request.getAllocation());
        allocation.setNote(request.getNote());
        // company is auto-set by TenantScopedEntity @PrePersist

        if (request.getProjectId() != null) {
            Project project = projectRepo.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
            allocation.setProject(project);
        }

        allocation = allocationRepo.save(allocation);
        log.info("Created allocation {} for employee {}", allocation.getAllocationId(), emp.getFullName());
        return toDTO(allocation);
    }

    public ResourceAllocationDTO update(Long id, ResourceAllocationRequest request) {
        if (id == null || request == null) {
            throw new BadRequestException("Invalid update request");
        }

        accessControl.checkProjectManageAllPermission();

        ResourceAllocation existing = allocationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Allocation", id));

        if (request.getEndDate() != null && request.getStartDate() != null &&
                request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }

        existing.setStartDate(request.getStartDate());
        existing.setEndDate(request.getEndDate());
        existing.setAllocation(request.getAllocation());
        existing.setNote(request.getNote());

        if (request.getEmployeeId() != null &&
                !request.getEmployeeId().equals(existing.getEmployee().getEmployeeId())) {
            Employee emp = employeeRepo.findById(request.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
            existing.setEmployee(emp);
        }
        if (request.getProjectId() != null) {
            Project project = projectRepo.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
            existing.setProject(project);
        }

        return toDTO(allocationRepo.save(existing));
    }

    public void delete(Long id) {
        accessControl.checkProjectManageAllPermission();
        ResourceAllocation allocation = allocationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Allocation", id));
        allocationRepo.delete(allocation);
    }

    private ResourceAllocationDTO toDTO(ResourceAllocation a) {
        ResourceAllocationDTO dto = new ResourceAllocationDTO();
        dto.setAllocationId(a.getAllocationId());
        dto.setEmployeeId(a.getEmployee() != null ? a.getEmployee().getEmployeeId() : null);
        dto.setEmployeeName(a.getEmployee() != null ? a.getEmployee().getFullName() : null);
        dto.setProjectId(a.getProject() != null ? a.getProject().getProjectId() : null);
        dto.setProjectName(a.getProject() != null ? a.getProject().getName() : null);
        dto.setStartDate(a.getStartDate());
        dto.setEndDate(a.getEndDate());
        dto.setAllocation(a.getAllocation());
        dto.setNote(a.getNote());
        return dto;
    }
}
