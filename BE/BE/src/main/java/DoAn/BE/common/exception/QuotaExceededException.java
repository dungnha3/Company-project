package DoAn.BE.common.exception;

/**
 * Exception thrown when a company exceeds their quota limits
 * (max employees, max projects, max storage, etc.)
 */
public class QuotaExceededException extends RuntimeException {

    private final String quotaType;
    private final long currentValue;
    private final long maxValue;

    public QuotaExceededException(String message) {
        super(message);
        this.quotaType = "UNKNOWN";
        this.currentValue = 0;
        this.maxValue = 0;
    }

    public QuotaExceededException(String quotaType, long currentValue, long maxValue) {
        super(String.format("Đã đạt giới hạn %s: %d/%d", quotaType, currentValue, maxValue));
        this.quotaType = quotaType;
        this.currentValue = currentValue;
        this.maxValue = maxValue;
    }

    public String getQuotaType() {
        return quotaType;
    }

    public long getCurrentValue() {
        return currentValue;
    }

    public long getMaxValue() {
        return maxValue;
    }
}
