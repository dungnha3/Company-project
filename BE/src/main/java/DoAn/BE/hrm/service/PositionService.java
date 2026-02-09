package DoAn.BE.hrm.service;

import java.util.List;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.dto.PositionRequest;
import DoAn.BE.hrm.entity.Position;
import DoAn.BE.hrm.repository.PositionRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

@Service
@Transactional
@Slf4j
public class PositionService {

    private final PositionRepository positionRepository;
    private final EmployeeRepository employeeRepository;

    public PositionService(PositionRepository positionRepository, EmployeeRepository employeeRepository) {
        this.positionRepository = positionRepository;
        this.employeeRepository = employeeRepository;
    }

    public long countEmployeesByPosition(Long positionId) {
        return employeeRepository.countByPosition_PositionId(positionId);
    }

    public Position createPosition(PositionRequest request) {
        if (positionRepository.existsByName(request.getName())) {
            throw new DuplicateException("Position already exists");
        }

        Position position = new Position();
        position.setName(request.getName());
        position.setDescription(request.getDescription());
        position.setIcon(request.getIcon());
        position.setSalaryCoefficient(request.getSalaryCoefficient());
        position.setLevel(request.getLevel() != null ? request.getLevel() : 1);

        return positionRepository.save(position);
    }

    @Cacheable(value = "position", key = "#id")
    public Position getPositionById(Long id) {
        return positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found"));
    }

    @Cacheable(value = "position", key = "'all'")
    public List<Position> getAllPositions() {
        return positionRepository.findAll();
    }

    @CacheEvict(value = "position", allEntries = true)
    public Position updatePosition(Long id, PositionRequest request) {
        Position position = getPositionById(id);

        if (request.getName() != null && !request.getName().equals(position.getName())) {
            if (positionRepository.existsByName(request.getName())) {
                throw new DuplicateException("Position name already exists");
            }
            position.setName(request.getName());
        }

        if (request.getDescription() != null) {
            position.setDescription(request.getDescription());
        }

        if (request.getIcon() != null) {
            position.setIcon(request.getIcon());
        }

        if (request.getSalaryCoefficient() != null) {
            position.setSalaryCoefficient(request.getSalaryCoefficient());
        }

        if (request.getLevel() != null) {
            position.setLevel(request.getLevel());
        }

        return positionRepository.save(position);
    }

    @CacheEvict(value = "position", allEntries = true)
    public void deletePosition(Long id) {
        Position position = getPositionById(id);
        positionRepository.delete(position);
    }
}
