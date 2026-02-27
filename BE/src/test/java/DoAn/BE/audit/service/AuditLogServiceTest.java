package DoAn.BE.audit.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.fasterxml.jackson.databind.ObjectMapper;

import DoAn.BE.audit.entity.AuditLog;
import DoAn.BE.audit.repository.AuditLogRepository;
import DoAn.BE.user.entity.User;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AuditLogService auditLogService;

    private User testActor;
    private Pageable pageable;

    @BeforeEach
    void setUp() {
        testActor = new User();
        testActor.setUserId(1L);
        testActor.setUsername("admin");
        pageable = PageRequest.of(0, 10);
    }

    @Test
    void logAction_Success_SavesAuditLog() throws Exception {
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        auditLogService.logAction(testActor, "CREATE", "USER", 2L,
                null, "newValue", AuditLog.Severity.INFO, "127.0.0.1", "TestAgent");

        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void logAdminActionOnManager_Success() throws Exception {
        User targetManager = new User();
        targetManager.setUserId(2L);
        targetManager.setUsername("manager");

        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        auditLogService.logAdminActionOnManager(testActor, targetManager, "ROLE_CHANGE",
                "old", "new", "Promotion", "127.0.0.1", "TestAgent");

        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void logFailedAction_Success() {
        auditLogService.logFailedAction(testActor, "DELETE", "PROJECT", 5L,
                "Permission denied", "127.0.0.1", "TestAgent");

        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void getLogsByActor_ReturnsPage() {
        AuditLog log = new AuditLog();
        log.setActor(testActor);
        when(auditLogRepository.findByActor_UserId(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(log)));

        Page<AuditLog> result = auditLogService.getLogsByActor(1L, pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getRecentLogs_ReturnsPage() {
        when(auditLogRepository.findAllLogs(pageable)).thenReturn(new PageImpl<>(List.of()));

        Page<AuditLog> result = auditLogService.getRecentLogs(pageable);

        assertNotNull(result);
        verify(auditLogRepository).findAllLogs(pageable);
    }

    @Test
    void getCriticalLogs_ReturnsFilteredPage() {
        LocalDateTime start = LocalDateTime.now().minusDays(7);
        LocalDateTime end = LocalDateTime.now();

        when(auditLogRepository.findCriticalLogsBetween(start, end, pageable))
                .thenReturn(new PageImpl<>(List.of()));

        Page<AuditLog> result = auditLogService.getCriticalLogs(start, end, pageable);

        assertNotNull(result);
        verify(auditLogRepository).findCriticalLogsBetween(start, end, pageable);
    }
}
