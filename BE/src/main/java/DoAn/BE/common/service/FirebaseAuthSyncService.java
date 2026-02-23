package DoAn.BE.common.service;

import DoAn.BE.common.event.UserRemovedFromCompanyEvent;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.ObjectProvider;

@Service
@Slf4j
@RequiredArgsConstructor
public class FirebaseAuthSyncService {

    private final ObjectProvider<FirebaseAuth> firebaseAuthProvider;
    private final UserRepository userRepository;

    public void syncUserToFirebase(User user, Long currentCompanyId) {
        FirebaseAuth firebaseAuth = firebaseAuthProvider.getIfAvailable();
        if (firebaseAuth == null)
            return;

        try {
            String uid = user.getUserId().toString();
            String photoUrl = user.getAvatarUrl() != null ? user.getAvatarUrl()
                    : "https://ui-avatars.com/api/?name=" + user.getFullName();

            try {
                firebaseAuth.getUser(uid);
                firebaseAuth.updateUser(new UserRecord.UpdateRequest(uid)
                        .setDisplayName(user.getFullName())
                        .setPhotoUrl(photoUrl));
            } catch (FirebaseAuthException e) {
                if ("user-not-found".equals(String.valueOf(e.getErrorCode()))) {
                    firebaseAuth.createUser(new UserRecord.CreateRequest()
                            .setUid(uid)
                            .setEmail(user.getEmail())
                            .setDisplayName(user.getFullName())
                            .setPhotoUrl(photoUrl));
                } else {
                    throw e;
                }
            }

            setCustomClaims(firebaseAuth, uid, user, currentCompanyId);

        } catch (Exception e) {
            log.error("Failed to sync user {} to Firebase: {}", user.getUserId(), e.getMessage());
        }
    }

    private void setCustomClaims(FirebaseAuth firebaseAuth, String uid, User user, Long currentCompanyId)
            throws FirebaseAuthException {
        Map<String, Object> claims = new HashMap<>();

        List<String> companyIds = user.getCompanyMemberships().stream()
                .filter(m -> m.getIsActive())
                .map(m -> m.getCompany().getCompanyId().toString())
                .collect(Collectors.toList());

        claims.put("companyId", currentCompanyId != null ? currentCompanyId.toString() : "");
        claims.put("companies", companyIds);

        firebaseAuth.setCustomUserClaims(uid, claims);
        log.debug("Set custom claims for user {}: {}", uid, claims);
    }

    @Async
    @EventListener
    public void handleUserRemoved(UserRemovedFromCompanyEvent event) {
        FirebaseAuth firebaseAuth = firebaseAuthProvider.getIfAvailable();
        if (firebaseAuth == null)
            return;

        try {
            String uid = event.getUserId().toString();
            Long removedCompanyId = event.getCompanyId();

            User user = userRepository.findById(event.getUserId()).orElseThrow();

            Map<String, Object> claims = new HashMap<>();
            List<String> companyIds = user.getCompanyMemberships().stream()
                    .filter(m -> m.getIsActive())
                    .map(m -> m.getCompany().getCompanyId())
                    .filter(id -> !id.equals(removedCompanyId))
                    .map(Object::toString)
                    .collect(Collectors.toList());

            if (companyIds.isEmpty()) {
                firebaseAuth.revokeRefreshTokens(uid);
                log.info("Revoked tokens for user {} (no companies left)", uid);
            } else {
                claims.put("companies", companyIds);
                firebaseAuth.setCustomUserClaims(uid, claims);
                firebaseAuth.revokeRefreshTokens(uid);
            }

        } catch (Exception e) {
            log.error("Failed to handle user removal for Firebase: {}", e.getMessage());
        }
    }
}
