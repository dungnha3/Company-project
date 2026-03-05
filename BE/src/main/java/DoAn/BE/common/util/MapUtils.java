package DoAn.BE.common.util;

import java.math.BigDecimal;
import java.util.Map;

// Utility class for safely extracting typed values from Map&lt;String,
// Object&gt;.
// Extracted from AIActionExecutor where these methods were private helpers.
// Now reusable across any service that processes Map-based data (e.g., AI
// actions, webhooks).
// /
public final class MapUtils {

    private MapUtils() {
    } // Utility class — no instantiation

    public static String getString(Map<String, Object> data, String key, String defaultValue) {
        if (data == null || !data.containsKey(key))
            return defaultValue;
        Object value = data.get(key);
        return value != null ? value.toString() : defaultValue;
    }

    public static Long getLong(Map<String, Object> data, String key) {
        if (data == null || !data.containsKey(key))
            return null;
        Object value = data.get(key);
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        if (value instanceof String) {
            try {
                return Long.parseLong((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    public static Integer getInt(Map<String, Object> data, String key, Integer defaultValue) {
        if (data == null || !data.containsKey(key))
            return defaultValue;
        Object value = data.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    public static BigDecimal getBigDecimal(Map<String, Object> data, String key, BigDecimal defaultValue) {
        if (data == null || !data.containsKey(key))
            return defaultValue;
        Object value = data.get(key);
        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }
}
