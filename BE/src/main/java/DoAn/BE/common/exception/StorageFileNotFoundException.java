package DoAn.BE.common.exception;

// Exception khi không tìm thấy file trong storage
public class StorageFileNotFoundException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    public StorageFileNotFoundException(String message) {
        super(message);
    }
}
