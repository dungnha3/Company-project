package DoAn.BE.common.filter;

import java.io.IOException;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import DoAn.BE.common.context.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

// Filter xử lý X-Company-Id header và set TenantContext
@Component
@Order(1)
@Slf4j
public class TenantFilter extends OncePerRequestFilter {

    private final DoAn.BE.company.repository.CompanyMemberRepository companyMemberRepository;
    private final DoAn.BE.company.repository.CompanyRepository companyRepository;

    public TenantFilter(DoAn.BE.company.repository.CompanyMemberRepository companyMemberRepository,
            DoAn.BE.company.repository.CompanyRepository companyRepository) {
        this.companyMemberRepository = companyMemberRepository;
        this.companyRepository = companyRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {

            String companyIdHeader = request.getHeader(DoAn.BE.common.util.AppConstants.HEADER_COMPANY_ID);

            if (companyIdHeader != null && !companyIdHeader.isEmpty()) {
                try {
                    Long companyId = Long.parseLong(companyIdHeader);

                    // VALIDATION START: Check if user belongs to this company
                    if (DoAn.BE.common.util.SecurityUtil.isAuthenticated()) {
                        Long userId = DoAn.BE.common.util.SecurityUtil.getCurrentUserId();

                        // [SAAS] System Admin bypass - can access any company
                        DoAn.BE.user.entity.User currentUser = DoAn.BE.common.util.SecurityUtil.getCurrentUser();
                        if (currentUser != null && currentUser.isSystemAdminAccount()) {
                            TenantContext.setCompanyId(companyId);
                            log.debug("System Admin {} accessing company {} via bypass", userId, companyId);
                        } else {
                            boolean isCompanyActive = companyRepository.existsByCompanyIdAndIsActiveTrue(companyId);
                            if (!isCompanyActive) {
                                log.warn("Access denied: Company {} is INACTIVE/LOCKED", companyId);
                                response.sendError(HttpServletResponse.SC_FORBIDDEN,
                                        "Công ty này đang bị khóa hoặc tạm ngưng hoạt động.");
                                return;
                            }
                            boolean isMember = companyMemberRepository
                                    .existsByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(userId, companyId);

                            if (isMember) {
                                TenantContext.setCompanyId(companyId);
                                log.debug("TenantContext set for user {} in company {}", userId, companyId);
                            } else {
                                log.warn("Unauthorized tenant access attempt: User {} tried to access Company {}",
                                        userId,
                                        companyId);
                                response.sendError(HttpServletResponse.SC_FORBIDDEN,
                                        "Bạn không có quyền truy cập công ty này");
                                return;
                            }
                        }
                    } else {
                        // Case: Unauthenticated request (Public API) but has Company Header?
                        // Usually Public APIs don't need tenant context unless strictly required.
                        // For safety, we can allow proceed but WITHOUT context, or set context if we
                        // trust (Risky).
                        // Here we choose to NOT set context if not authenticated to prevent data leak,
                        // unless it's a specific public tenant endpoint (rare).
                        log.debug("Unauthenticated request with Company ID header. Context not set.");
                    }

                } catch (NumberFormatException e) {
                    log.warn("Invalid Header Value: {}", companyIdHeader);
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            // Xóa TenantContext sau khi xử lý xong
            TenantContext.clear();
            // Xóa cache của các services để tránh memory leak
            DoAn.BE.common.service.FeatureFlagService.clearCache();
            DoAn.BE.common.service.AccessControlService.clearCache();
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        for (String publicEndpoint : DoAn.BE.common.util.AppConstants.PUBLIC_ENDPOINTS) {
            String prefix = publicEndpoint.replace("/**", "");
            if (path.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
}
