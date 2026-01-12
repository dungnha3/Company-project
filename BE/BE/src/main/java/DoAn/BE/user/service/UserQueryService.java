package DoAn.BE.user.service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Service xử lý các chức năng tìm kiếm và thống kê users

// - Tìm kiếm users

// - Lọc theo role, trạng thái

// - Đếm, thống kê
@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class UserQueryService {

    private final UserRepository userRepository;
    private final CompanyMemberRepository companyMemberRepository;

    // ==================== SEARCH ====================
    // Tìm kiếm user theo từ khóa (username hoặc email)
    public List<User> searchUsers(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return userRepository.searchByKeyword(keyword);
    }

    // ==================== FILTER BY ROLE ====================
    // Lấy users theo role trong công ty hiện tại
    public List<User> getUsersByRole(CompanyRole role) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null || role == null) {
            return Collections.emptyList();
        }
        // Updated to use RolesContaining derived query
        return companyMemberRepository.findByCompany_CompanyIdAndRolesContainingAndIsActiveTrue(companyId, role)
                .stream()
                .map(CompanyMember::getUser)
                .collect(Collectors.toList());
    }

    // ==================== FILTER BY STATUS ====================
    // Lấy tất cả users đang active
    public List<User> getActiveUsers() {
        return userRepository.findByIsActiveTrue();
    }

    // ==================== users đang online
    public List<User> getOnlineUsers() {
        return userRepository.findByIsOnlineTrue();
    }

    // ==================== STATISTICS ====================
    // Đếm users theo role trong công ty hiện tại
    public long countUsersByRole(CompanyRole role) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null || role == null) {
            return 0L;
        }
        // Updated to use RolesContaining derived query
        return companyMemberRepository.countByCompany_CompanyIdAndRolesContainingAndIsActiveTrue(companyId, role);
    }

    // Đếm số users đang online
    public long countOnlineUsers() {
        return userRepository.countByIsOnlineTrue();
    }
}
