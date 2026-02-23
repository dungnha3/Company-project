package DoAn.BE.common.exception;

// Exception khi dữ liệu bị trùng lặp (409 Conflict)
public class DuplicateException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    
    public DuplicateException(String message) {
        super(message);
    }
}
