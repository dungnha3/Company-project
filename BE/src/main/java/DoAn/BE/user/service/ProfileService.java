package DoAn.BE.user.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.user.dto.UpdatePasswordRequest;
import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmployeeRepository employeeRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public ProfileService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            EmployeeRepository employeeRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.employeeRepository = employeeRepository;
        this.eventPublisher = eventPublisher;
    }

    public User getCurrentUserProfile(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
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

        // Also update Employee info if exists
        updateEmployeeInfo(userId, request);

        return savedUser;
    }

    private void updateEmployeeInfo(Long userId, UpdateUserRequest request) {
        // Find Employee by userId in the current company context
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        Employee employee;
        if (companyId != null) {
            employee = employeeRepository.findByUser_UserIdAndCompany_CompanyId(userId, companyId).orElse(null);
        } else {
            employee = employeeRepository.findByUser_UserId(userId).orElse(null);
        }
        if (employee == null) {
            return; // User has no Employee record
        }

        // Update Employee fields from request
        if (request.getFullName() != null) {
            employee.setFullName(request.getFullName());
        }
        if (request.getPhoneNumber() != null) {
            employee.setPhone(request.getPhoneNumber());
        }
        if (request.getAddress() != null) {
            employee.setAddress(request.getAddress());
        }

        employeeRepository.save(employee);
    }

    public void changePassword(Long userId, UpdatePasswordRequest request) {
        User user = getCurrentUserProfile(userId);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Old password is incorrect");
        }

        // Set new password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Send notification via Event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new DoAn.BE.common.event.UserUpdatedEvent(this, user, user,
                    DoAn.BE.common.event.UserUpdatedEvent.UpdateType.PASSWORD_CHANGE));
        }
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
