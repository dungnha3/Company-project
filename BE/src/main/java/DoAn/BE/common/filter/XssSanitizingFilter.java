package DoAn.BE.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.regex.Pattern;
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class XssSanitizingFilter extends OncePerRequestFilter {

    // Headers that must NOT be sanitized (would break auth/content negotiation)
    private static final Set<String> SKIP_HEADERS = Set.of(
            "authorization", "content-type", "content-length", "accept",
            "x-company-id", "x-session-id", "x-forwarded-for", "x-real-ip",
            "cookie", "host", "user-agent");

    private static final Pattern[] XSS_PATTERNS = {
            Pattern.compile("<script>(.*?)</script>", Pattern.CASE_INSENSITIVE),
            Pattern.compile("src[\r\n]*=[\r\n]*\\'(.*?)\\'",
                    Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
            Pattern.compile("src[\r\n]*=[\r\n]*\"(.*?)\"",
                    Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
            Pattern.compile("</script>", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<script(.*?)>", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
            Pattern.compile("eval\\((.*?)\\)", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
            Pattern.compile("expression\\((.*?)\\)", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
            Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE),
            Pattern.compile("vbscript:", Pattern.CASE_INSENSITIVE),
            Pattern.compile("onload(.*?)=", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
            Pattern.compile("onerror(.*?)=", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
            Pattern.compile("onclick(.*?)=", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
            Pattern.compile("onmouseover(.*?)=", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL)
    };

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String ct = request.getContentType();
        if (ct != null) {
            String normalizedContentType = ct.toLowerCase();
            if (normalizedContentType.contains("multipart/form-data")
                    || normalizedContentType.contains("application/json")) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        filterChain.doFilter(new XssRequestWrapper(request), response);
    }

    // Wrapper class to sanitize request parameters, headers, AND body
    private static class XssRequestWrapper extends HttpServletRequestWrapper {

        private byte[] sanitizedBody;

        public XssRequestWrapper(HttpServletRequest request) {
            super(request);
        }

        @Override
        public String[] getParameterValues(String parameter) {
            String[] values = super.getParameterValues(parameter);
            if (values == null) {
                return null;
            }
            int count = values.length;
            String[] encodedValues = new String[count];
            for (int i = 0; i < count; i++) {
                encodedValues[i] = stripXSS(values[i]);
            }
            return encodedValues;
        }

        @Override
        public String getParameter(String parameter) {
            String value = super.getParameter(parameter);
            return stripXSS(value);
        }
        @Override
        public String getHeader(String name) {
            String value = super.getHeader(name);
            if (name != null && SKIP_HEADERS.contains(name.toLowerCase())) {
                return value; // Don't sanitize critical headers
            }
            return stripXSS(value);
        }
        @Override
        public ServletInputStream getInputStream() throws IOException {
            if (sanitizedBody == null) {
                String body = new String(super.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                if (!body.isEmpty()) {
                    body = stripXSS(body);
                }
                sanitizedBody = body.getBytes(StandardCharsets.UTF_8);
            }
            ByteArrayInputStream bais = new ByteArrayInputStream(sanitizedBody);
            return new ServletInputStream() {
                @Override
                public int read() {
                    return bais.read();
                }

                @Override
                public boolean isFinished() {
                    return bais.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener listener) {
                    /* no-op */ }
            };
        }

        @Override
        public BufferedReader getReader() throws IOException {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }

        private static String stripXSS(String value) {
            if (value == null) {
                return null;
            }
            for (Pattern pattern : XSS_PATTERNS) {
                value = pattern.matcher(value).replaceAll("");
            }
            return value;
        }
    }
}
