package DoAn.BE.common.exception;

// Exception cho các trường hợp chưa xác thực (401 Unauthorized)
public class UnauthorizedException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    
    public UnauthorizedException(String message) {
        super(message);
    }
}
