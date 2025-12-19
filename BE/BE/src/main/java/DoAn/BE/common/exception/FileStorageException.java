package DoAn.BE.common.exception;

// Exception khi có lỗi lưu trữ file
public class FileStorageException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    public FileStorageException(String message) {
        super(message);
    }
    
    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
