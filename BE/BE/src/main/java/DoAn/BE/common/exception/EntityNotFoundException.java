package DoAn.BE.common.exception;

// Exception khi không tìm thấy entity (404 Not Found)
public class EntityNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    
    public EntityNotFoundException(String message) {
        super(message);
    }
}
