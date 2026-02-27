package DoAn.BE.common.exception;

// Exception thrown when a feature is disabled for the current company.
// /
public class FeatureDisabledException extends RuntimeException {

    private final String featureCode;

    public FeatureDisabledException(String featureCode) {
        super("Tính năng '" + featureCode + "' chưa được kích hoạt cho công ty của bạn");
        this.featureCode = featureCode;
    }

    public String getFeatureCode() {
        return featureCode;
    }
}
