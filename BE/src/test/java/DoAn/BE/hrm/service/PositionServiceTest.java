package DoAn.BE.hrm.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.dto.PositionRequest;
import DoAn.BE.hrm.entity.Position;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.PositionRepository;

@ExtendWith(MockitoExtension.class)
public class PositionServiceTest {

    @Mock
    private PositionRepository positionRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private PositionService positionService;

    private Position testPosition;

    @BeforeEach
    void setUp() {
        testPosition = new Position();
        testPosition.setPositionId(100L);
        testPosition.setName("Developer");
        testPosition.setLevel(2);
        testPosition.setSalaryCoefficient(1.5);
    }

    @Test
    void createPosition_Success() {
        PositionRequest req = new PositionRequest();
        req.setName("Senior Developer");
        req.setLevel(3);

        when(positionRepository.existsByName("Senior Developer")).thenReturn(false);
        when(positionRepository.save(any(Position.class))).thenAnswer(i -> {
            Position p = i.getArgument(0);
            p.setPositionId(200L);
            return p;
        });

        Position result = positionService.createPosition(req);

        assertNotNull(result);
        assertEquals("Senior Developer", result.getName());
        assertEquals(3, result.getLevel());
        verify(positionRepository).save(any(Position.class));
    }

    @Test
    void createPosition_DuplicateName() {
        PositionRequest req = new PositionRequest();
        req.setName("Developer");

        when(positionRepository.existsByName("Developer")).thenReturn(true);

        assertThrows(DuplicateException.class, () -> positionService.createPosition(req));
        verify(positionRepository, never()).save(any());
    }

    @Test
    void getPositionById_Success() {
        when(positionRepository.findById(100L)).thenReturn(Optional.of(testPosition));

        Position result = positionService.getPositionById(100L);

        assertNotNull(result);
        assertEquals("Developer", result.getName());
    }

    @Test
    void getPositionById_NotFound() {
        when(positionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> positionService.getPositionById(999L));
    }

    @Test
    void updatePosition_Success() {
        PositionRequest req = new PositionRequest();
        req.setName("Lead Developer");

        when(positionRepository.findById(100L)).thenReturn(Optional.of(testPosition));
        when(positionRepository.existsByName("Lead Developer")).thenReturn(false);
        when(positionRepository.save(any(Position.class))).thenReturn(testPosition);

        Position updated = positionService.updatePosition(100L, req);
        assertNotNull(updated);

        assertEquals("Lead Developer", testPosition.getName());
        verify(positionRepository).save(testPosition);
    }

    @Test
    void deletePosition_Success() {
        when(positionRepository.findById(100L)).thenReturn(Optional.of(testPosition));

        positionService.deletePosition(100L);

        verify(positionRepository).delete(testPosition);
    }

    @Test
    void countEmployeesByPosition_Success() {
        when(employeeRepository.countByPosition_PositionId(100L)).thenReturn(5L);

        long count = positionService.countEmployeesByPosition(100L);

        assertEquals(5L, count);
        verify(employeeRepository).countByPosition_PositionId(100L);
    }
}
