package DoAn.BE.hrm.mapper;

import DoAn.BE.hrm.dto.DepartmentDTO;
import DoAn.BE.hrm.entity.Department;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class DepartmentMapper {

    public DepartmentDTO toDTO(Department department) {
        if (department == null) {
            return null;
        }

        DepartmentDTO dto = new DepartmentDTO();
        dto.setDepartmentId(department.getDepartmentId());
        dto.setName(department.getName());
        dto.setDescription(department.getDescription());

        if (department.getManager() != null) {
            dto.setManagerId(department.getManager().getEmployeeId());
            dto.setManagerName(department.getManager().getFullName());
        }

        dto.setCreatedAt(department.getCreatedAt());

        try {
            if (department.getEmployees() != null) {
                dto.setEmployeeCount(department.getEmployees().size());
            }
        } catch (Exception e) {
            dto.setEmployeeCount(0);
        }

        return dto;
    }

    public List<DepartmentDTO> toDTOList(List<Department> departments) {
        if (departments == null) {
            return null;
        }
        return departments.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
