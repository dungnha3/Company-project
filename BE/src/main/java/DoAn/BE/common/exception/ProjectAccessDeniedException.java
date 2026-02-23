package DoAn.BE.common.exception;

// Exception khi không có quyền truy cập project
public class ProjectAccessDeniedException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    public ProjectAccessDeniedException(String message) {
        super(message);
    }
}
