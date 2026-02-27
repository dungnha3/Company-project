package DoAn.BE.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import DoAn.BE.auth.entity.UserSession;
import DoAn.BE.auth.repository.UserSessionRepository;
import DoAn.BE.user.entity.User;

@ExtendWith(MockitoExtension.class)
public class SessionServiceTest {

    @Mock
    private UserSessionRepository userSessionRepository;

    @InjectMocks
    private SessionService sessionService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("testuser");

        ReflectionTestUtils.setField(sessionService, "sessionTimeoutMinutes", 30);
        ReflectionTestUtils.setField(sessionService, "maxConcurrentSessions", 5);
    }

    @Test
    void createSession_Success() {
        when(userSessionRepository.findByUserAndIsActiveTrue(testUser)).thenReturn(new ArrayList<>());
        when(userSessionRepository.save(any(UserSession.class))).thenAnswer(i -> i.getArgument(0));

        UserSession result = sessionService.createSession(testUser, "127.0.0.1", "Chrome");

        assertNotNull(result);
        assertNotNull(result.getSessionId());
        assertEquals("127.0.0.1", result.getIpAddress());
        assertTrue(result.getIsActive());
        verify(userSessionRepository).save(any(UserSession.class));
    }

    @Test
    void deactivateSession_Success() {
        UserSession session = new UserSession();
        session.setSessionId("abc-123");
        session.setIsActive(true);

        when(userSessionRepository.findBySessionId("abc-123")).thenReturn(Optional.of(session));

        sessionService.deactivateSession("abc-123");

        assertFalse(session.getIsActive());
        verify(userSessionRepository).save(session);
    }

    @Test
    void deactivateAllUserSessions_CallsBulkUpdate() {
        sessionService.deactivateAllUserSessions(testUser);

        verify(userSessionRepository).deactivateAllSessionsByUser(testUser);
    }

    @Test
    void getUserActiveSessions_ReturnsList() {
        UserSession s = new UserSession();
        when(userSessionRepository.findByUserAndIsActiveTrue(testUser)).thenReturn(List.of(s));

        List<UserSession> result = sessionService.getUserActiveSessions(testUser);

        assertEquals(1, result.size());
    }

    @Test
    void countActiveSessions_ReturnsCount() {
        when(userSessionRepository.countActiveSessionsByUser(testUser)).thenReturn(3L);

        long count = sessionService.countActiveSessions(testUser);

        assertEquals(3L, count);
    }

    @Test
    void isSuspiciousActivity_DifferentIP_ReturnsTrue() {
        UserSession session = new UserSession();
        session.setSessionId("abc");
        session.setIpAddress("10.0.0.1");

        when(userSessionRepository.findBySessionId("abc")).thenReturn(Optional.of(session));

        assertTrue(sessionService.isSuspiciousActivity("abc", "192.168.1.1"));
    }

    @Test
    void isSuspiciousActivity_SameIP_ReturnsFalse() {
        UserSession session = new UserSession();
        session.setSessionId("abc");
        session.setIpAddress("10.0.0.1");

        when(userSessionRepository.findBySessionId("abc")).thenReturn(Optional.of(session));

        assertFalse(sessionService.isSuspiciousActivity("abc", "10.0.0.1"));
    }

    @Test
    void isSuspiciousActivity_SessionNotFound_ReturnsFalse() {
        when(userSessionRepository.findBySessionId("nonexistent")).thenReturn(Optional.empty());

        assertFalse(sessionService.isSuspiciousActivity("nonexistent", "10.0.0.1"));
    }

    @Test
    void updateSessionActivity_Found_UpdatesAndSaves() {
        UserSession session = new UserSession();
        session.setSessionId("sess-1");

        when(userSessionRepository.findBySessionId("sess-1")).thenReturn(Optional.of(session));

        sessionService.updateSessionActivity("sess-1");

        verify(userSessionRepository).save(session);
    }

    @Test
    void updateSessionActivity_NotFound_DoesNothing() {
        when(userSessionRepository.findBySessionId("missing")).thenReturn(Optional.empty());

        sessionService.updateSessionActivity("missing");

        verify(userSessionRepository, never()).save(any());
    }

    @Test
    void getSession_ReturnsOptional() {
        UserSession session = new UserSession();
        when(userSessionRepository.findBySessionId("abc")).thenReturn(Optional.of(session));

        Optional<UserSession> result = sessionService.getSession("abc");

        assertTrue(result.isPresent());
    }

    @Test
    void createSession_MaxConcurrent_EvictsOldestSession() {
        // Create 5 sessions (maxConcurrentSessions = 5), so adding 6th should evict
        // oldest
        List<UserSession> activeSessions = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            UserSession s = new UserSession();
            s.setSessionId("session-" + i);
            s.setIsActive(true);
            s.setLastActivity(java.time.LocalDateTime.now().minusMinutes(10 - i)); // oldest first
            activeSessions.add(s);
        }

        when(userSessionRepository.findByUserAndIsActiveTrue(testUser)).thenReturn(activeSessions);
        when(userSessionRepository.findBySessionId("session-0")).thenReturn(Optional.of(activeSessions.get(0)));
        when(userSessionRepository.save(any(UserSession.class))).thenAnswer(i -> i.getArgument(0));

        UserSession result = sessionService.createSession(testUser, "10.0.0.1", "Firefox");

        assertNotNull(result);
        // Oldest session should have been deactivated
        assertFalse(activeSessions.get(0).getIsActive());
    }

    @Test
    void cleanupExpiredSessions_CallsBulkDeactivate() {
        sessionService.cleanupExpiredSessions();

        verify(userSessionRepository).deactivateExpiredSessions(any(java.time.LocalDateTime.class));
    }
}
