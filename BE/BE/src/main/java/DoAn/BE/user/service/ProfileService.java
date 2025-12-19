package DoAn.BE.user.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.notification.service.AuthNotificationService;
import DoAn.BE.user.dto.ChangePasswordRequest;
import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

// Service quản lý profile user (update, change password, online/offline status)
@Service
@Transactional
@Slf4j
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthNotificationService authNotificationService;
    private final NhanVienRepository nhanVienRepository;

    public ProfileService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            AuthNotificationService authNotificationService, NhanVienRepository nhanVienRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authNotificationService = authNotificationService;
        this.nhanVienRepository = nhanVienRepository;
    }

    public User getCurrentUserProfile(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User không tồn tại"));
    }

    public User updateProfile(Long userId, UpdateUserRequest request) {
        User user = getCurrentUserProfile(userId);

        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        User savedUser = userRepository.save(user);

        // Also update NhanVien if exists
        updateNhanVienInfo(userId, request);

        return savedUser;
    }

    private void updateNhanVienInfo(Long userId, UpdateUserRequest request) {
        // Find NhanVien by userId (if exists)
        DoAn.BE.hr.entity.NhanVien nhanVien = nhanVienRepository.findByUser_UserId(userId).orElse(null);
        if (nhanVien == null) {
            return; // User không có NhanVien record
        }

        // Update NhanVien fields from request
        if (request.getHoTen() != null) {
            nhanVien.setHoTen(request.getHoTen());
        }
        if (request.getSdt() != null) {
            nhanVien.setSdt(request.getSdt());
        }
        if (request.getDiaChi() != null) {
            nhanVien.setDiaChi(request.getDiaChi());
        }

        nhanVienRepository.save(nhanVien);
    }

    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = getCurrentUserProfile(userId);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu cũ không đúng");
        }

        // Set new password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Gửi notification
        authNotificationService.createPasswordChangedNotification(userId);
        log.info("User {} changed password successfully", user.getUsername());
    }

    public void setUserOnline(Long userId) {
        User user = getCurrentUserProfile(userId);
        user.setOnline();
        userRepository.save(user);
    }

    public void setUserOffline(Long userId) {
        User user = getCurrentUserProfile(userId);
        user.setOffline();
        userRepository.save(user);
    }

    public void updateFcmToken(Long userId, String fcmToken) {
        User user = getCurrentUserProfile(userId);
        user.setFcmToken(fcmToken);
        userRepository.save(user);
    }
}
