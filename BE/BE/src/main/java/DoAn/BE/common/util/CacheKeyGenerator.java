package DoAn.BE.common.util;

import DoAn.BE.common.context.TenantContext;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Component("tenantKeyGenerator")
public class CacheKeyGenerator implements KeyGenerator {

    @Override
    public Object generate(Object target, Method method, Object... params) {
        Long companyId = TenantContext.getCompanyId();
        StringBuilder key = new StringBuilder();

        if (companyId != null) {
            key.append(companyId).append("_");
        } else {
            key.append("global_");
        }

        for (Object param : params) {
            key.append(param).append("_");
        }

        return key.toString();
    }

    // Usage in @Cacheable: keyGenerator = "tenantKeyGenerator"
    public String generateKey(Object... params) {
        return (String) generate(null, null, params);
    }
}
