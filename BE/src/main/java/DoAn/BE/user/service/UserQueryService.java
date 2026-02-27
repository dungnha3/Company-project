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

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;


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
    public List<User> searchUsers(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return userRepository.searchByKeyword(keyword);
    }
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
    public List<User> getActiveUsers() {
        return userRepository.findByIsActiveTrue();
    }

    // ==================== users đang online
    public List<User> getOnlineUsers() {
        return userRepository.findByIsOnlineTrue();
    }
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
