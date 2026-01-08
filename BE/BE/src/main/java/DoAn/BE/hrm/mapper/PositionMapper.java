package DoAn.BE.hrm.mapper;

import DoAn.BE.hrm.dto.PositionDTO;
import DoAn.BE.hrm.entity.Position;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PositionMapper {

    public PositionDTO toDTO(Position position) {
        if (position == null) {
            return null;
        }

        PositionDTO dto = new PositionDTO();
        dto.setPositionId(position.getPositionId());
        dto.setName(position.getName());
        dto.setDescription(position.getDescription());
        dto.setIcon(position.getIcon());
        dto.setSalaryCoefficient(position.getSalaryCoefficient());
        dto.setLevel(position.getLevel());
        dto.setCreatedAt(position.getCreatedAt());

        try {
            if (position.getEmployees() != null) {
                dto.setEmployeeCount(position.getEmployees().size());
            }
        } catch (Exception e) {
            dto.setEmployeeCount(0);
        }

        return dto;
    }

    public List<PositionDTO> toDTOList(List<Position> positions) {
        if (positions == null) {
            return null;
        }
        return positions.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
