package DoAn.BE.common.exception;

// Exception cho các request không hợp lệ (400 Bad Request)
public class BadRequestException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    
    public BadRequestException(String message) {
        super(message);
    }
}
