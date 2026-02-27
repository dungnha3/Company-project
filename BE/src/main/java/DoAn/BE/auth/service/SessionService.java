package DoAn.BE.auth.service;

import DoAn.BE.auth.entity.UserSession;
import DoAn.BE.auth.repository.UserSessionRepository;
import DoAn.BE.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class SessionService {

    private final UserSessionRepository userSessionRepository;

    @Value("${session.timeout:30}") // 30 phút
    private int sessionTimeoutMinutes;

    @Value("${session.max-concurrent:5}") // Tối đa 5 phiên cùng lúc
    private int maxConcurrentSessions;

    public SessionService(UserSessionRepository userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
    }
    public UserSession createSession(User user, String ipAddress, String userAgent) {
        // Kiểm tra số lượng session hiện tại
        List<UserSession> activeSessions = userSessionRepository.findByUserAndIsActiveTrue(user);

        if (activeSessions.size() >= maxConcurrentSessions) {
            UserSession oldestSession = activeSessions.stream()
                    .filter(s -> s.getLastActivity() != null)
                    .min((s1, s2) -> s1.getLastActivity().compareTo(s2.getLastActivity()))
                    .orElse(null);
            if (oldestSession != null && oldestSession.getSessionId() != null) {
                deactivateSession(oldestSession.getSessionId());
            }
        }

        // Tạo session mới
        UserSession session = new UserSession();
        session.setUser(user);
        session.setSessionId(UUID.randomUUID().toString());
        session.setIpAddress(ipAddress);
        session.setUserAgent(userAgent);
        session.setIsActive(true);

        return userSessionRepository.save(session);
    }
    public void updateSessionActivity(String sessionId) {
        Optional<UserSession> sessionOpt = userSessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();
            session.updateActivity();
            userSessionRepository.save(session);
        }
    }
    public void deactivateSession(String sessionId) {
        Optional<UserSession> sessionOpt = userSessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();
            session.setIsActive(false);
            userSessionRepository.save(session);
        }
    }
    // OPTIMIZED: Use bulk UPDATE instead of forEach+save
    public void deactivateAllUserSessions(User user) {
        userSessionRepository.deactivateAllSessionsByUser(user);
    }
    public boolean isValidSession(String sessionId) {
        Optional<UserSession> sessionOpt = userSessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isEmpty()) {
            return false;
        }

        UserSession session = sessionOpt.get();
        return session.getIsActive() && !session.isExpired(sessionTimeoutMinutes);
    }
    public Optional<UserSession> getSession(String sessionId) {
        return userSessionRepository.findBySessionId(sessionId);
    }
    public List<UserSession> getUserActiveSessions(User user) {
        return userSessionRepository.findByUserAndIsActiveTrue(user);
    }
    // OPTIMIZED: Use bulk update instead of loading all sessions
    @Transactional
    public void cleanupExpiredSessions() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(sessionTimeoutMinutes);
        // Use repository's optimized bulk deactivate method
        userSessionRepository.deactivateExpiredSessions(cutoffTime);
    }
    // OPTIMIZED: Use COUNT query instead of loading all then .size()
    public long countActiveSessions(User user) {
        return userSessionRepository.countActiveSessionsByUser(user);
    }
    public boolean isSuspiciousActivity(String sessionId, String currentIp) {
        Optional<UserSession> sessionOpt = userSessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isEmpty()) {
            return false;
        }

        UserSession session = sessionOpt.get();
        return !currentIp.equals(session.getIpAddress());
    }
}
