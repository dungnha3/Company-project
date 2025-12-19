package DoAn.BE.common.exception;

// Exception khi vượt quá quota storage cho phép
public class StorageQuotaExceededException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    public StorageQuotaExceededException(String message) {
        super(message);
    }
}
