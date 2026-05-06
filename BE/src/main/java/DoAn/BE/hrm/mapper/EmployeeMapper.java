package DoAn.BE.hrm.mapper;

import DoAn.BE.hrm.dto.EmployeeDTO;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.user.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class EmployeeMapper {

    private final AccessControlService accessControlService;

    // Convert Employee to DTO
    public EmployeeDTO toDTO(Employee employee, User currentUser) {
        if (employee == null) {
            return null;
        }

        EmployeeDTO dto = new EmployeeDTO();
        dto.setEmployeeId(employee.getEmployeeId());

        if (employee.getUser() != null) {
            dto.setUserId(employee.getUser().getUserId());
            dto.setUsername(employee.getUser().getUsername());
            dto.setEmail(employee.getUser().getEmail());
            dto.setAvatarUrl(employee.getUser().getAvatarUrl());
        }

        dto.setFullName(employee.getFullName());
        dto.setDateOfBirth(employee.getDateOfBirth());
        dto.setGender(employee.getGender());
        dto.setHireDate(employee.getHireDate());
        dto.setStatus(employee.getStatus());



        // ===== PII PROTECTION =====
        // Only HR, Accounting, Owner/Admin, or Self can see PII (Phone, Address, ID
        // Card)
        boolean isSelf = currentUser != null && employee.getUser() != null &&
                employee.getUser().getUserId().equals(currentUser.getUserId());
        boolean hasViewPermission;
        try {
            accessControlService.checkHrViewPermission();
            hasViewPermission = true;
        } catch (ForbiddenException e) {
            hasViewPermission = false;
        }
        boolean canViewPII = hasViewPermission || isSelf;

        if (canViewPII) {
            dto.setPhone(employee.getPhone());
            dto.setAddress(employee.getAddress());
            dto.setIdCard(employee.getIdCard());
        } else {
            // Mask PII for non-HR/Accounting users
            dto.setPhone(null);
            dto.setAddress(null);
            dto.setIdCard(null);
        }

        dto.setCreatedAt(employee.getCreatedAt());

        return dto;
    }

    public EmployeeDTO toDTO(Employee employee) {
        return toDTO(employee, null);
    }

    public List<EmployeeDTO> toDTOList(List<Employee> employees, User currentUser) {
        if (employees == null) {
            return null;
        }
        return employees.stream()
                .map(emp -> toDTO(emp, currentUser))
                .collect(Collectors.toList());
    }

    public List<EmployeeDTO> toDTOList(List<Employee> employees) {
        return toDTOList(employees, null);
    }
}
