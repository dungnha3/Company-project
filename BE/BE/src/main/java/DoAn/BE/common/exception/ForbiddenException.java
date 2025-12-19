package DoAn.BE.common.exception;

// Exception cho các trường hợp không có quyền truy cập (403 Forbidden)
public class ForbiddenException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    public ForbiddenException(String message) {
        super(message);
    }
}
