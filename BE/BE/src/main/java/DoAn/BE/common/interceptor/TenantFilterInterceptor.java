package DoAn.BE.common.interceptor;

import DoAn.BE.common.context.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.Session;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantFilterInterceptor implements HandlerInterceptor {

    private final EntityManager entityManager;

    public TenantFilterInterceptor(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Long companyId = TenantContext.getCompanyId();

        // Chỉ enable filter nếu có companyId
        if (companyId != null) {
            Session session = entityManager.unwrap(Session.class);
            session.enableFilter("tenantFilter").setParameter("companyId", companyId);
        }

        return true;
    }
}
