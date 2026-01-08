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

// Service quản lý session của user (đa phiên đăng nhập, timeout, concurrent sessions)
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

    // [Tạo session mới cho user] (Role: System)
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

    // [Cập nhật hoạt động của session] (Role: System)
    public void updateSessionActivity(String sessionId) {
        Optional<UserSession> sessionOpt = userSessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();
            session.updateActivity();
            userSessionRepository.save(session);
        }
    }

    // [Vô hiệu hóa session] (Role: System)
    public void deactivateSession(String sessionId) {
        Optional<UserSession> sessionOpt = userSessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isPresent()) {
            UserSession session = sessionOpt.get();
            session.setIsActive(false);
            userSessionRepository.save(session);
        }
    }

    // [Vô hiệu hóa tất cả session của user] (Role: System)
    // OPTIMIZED: Use bulk UPDATE instead of forEach+save
    public void deactivateAllUserSessions(User user) {
        userSessionRepository.deactivateAllSessionsByUser(user);
    }

    // [Kiểm tra session có hợp lệ không] (Role: System)
    public boolean isValidSession(String sessionId) {
        Optional<UserSession> sessionOpt = userSessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isEmpty()) {
            return false;
        }

        UserSession session = sessionOpt.get();
        return session.getIsActive() && !session.isExpired(sessionTimeoutMinutes);
    }

    // [Lấy thông tin session] (Role: System)
    public Optional<UserSession> getSession(String sessionId) {
        return userSessionRepository.findBySessionId(sessionId);
    }

    // [Lấy tất cả session active của user] (Role: System)
    public List<UserSession> getUserActiveSessions(User user) {
        return userSessionRepository.findByUserAndIsActiveTrue(user);
    }

    // [Dọn dẹp session hết hạn] (Role: System)
    // OPTIMIZED: Use bulk update instead of loading all sessions
    @Transactional
    public void cleanupExpiredSessions() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(sessionTimeoutMinutes);
        // Use repository's optimized bulk deactivate method
        userSessionRepository.deactivateExpiredSessions(cutoffTime);
    }

    // [Đếm số session active của user] (Role: System)
    // OPTIMIZED: Use COUNT query instead of loading all then .size()
    public long countActiveSessions(User user) {
        return userSessionRepository.countActiveSessionsByUser(user);
    }

    // [Kiểm tra IP address có khác với session hiện tại không] (Role: Security)
    public boolean isSuspiciousActivity(String sessionId, String currentIp) {
        Optional<UserSession> sessionOpt = userSessionRepository.findBySessionId(sessionId);
        if (sessionOpt.isEmpty()) {
            return false;
        }

        UserSession session = sessionOpt.get();
        return !currentIp.equals(session.getIpAddress());
    }
}
