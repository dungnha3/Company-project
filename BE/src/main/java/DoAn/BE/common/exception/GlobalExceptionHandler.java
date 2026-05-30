package DoAn.BE.common.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(DuplicateException.class)
    public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateException ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.CONFLICT.value());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.NOT_FOUND.value());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.UNAUTHORIZED.value());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST.value());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.FORBIDDEN.value());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }


    @ExceptionHandler(ProjectAccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleProjectAccessDenied(ProjectAccessDeniedException ex) {
        ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.FORBIDDEN.value());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(
            org.springframework.http.converter.HttpMessageNotReadableException ex) {
        log.error("JSON parse error: {}", ex.getMessage());
        log.error("Full exception details:", ex);

        String message = "Dữ liệu không hợp lệ";

        // Trích xuất thông tin chi tiết hơn từ lỗi
        Throwable cause = ex.getCause();
        if (cause != null) {
            log.error("Root cause: {}", cause.getMessage());
            message = "Dữ liệu không hợp lệ: " + cause.getMessage();
        }

        if (ex.getMessage() != null && ex.getMessage().contains("enum")) {
            message = "Giá trị không hợp lệ cho trường enum";
        }

        ErrorResponse error = new ErrorResponse(message, HttpStatus.BAD_REQUEST.value());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // instead of Map
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        StringBuilder sb = new StringBuilder();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            if (!sb.isEmpty())
                sb.append("; ");
            sb.append(fieldName).append(": ").append(errorMessage);
        });
        ErrorResponse errorResp = new ErrorResponse(sb.toString(), HttpStatus.BAD_REQUEST.value());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResp);
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameter(
            org.springframework.web.bind.MissingServletRequestParameterException ex) {
        String message = "Missing required parameter: " + ex.getParameterName();
        ErrorResponse error = new ErrorResponse(message, HttpStatus.BAD_REQUEST.value());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        String message = "Giá trị không hợp lệ cho tham số '" + ex.getName()
                + "': giá trị '" + ex.getValue() + "' không được chấp nhận";
        ErrorResponse error = new ErrorResponse(message, HttpStatus.BAD_REQUEST.value());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(
            org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        ErrorResponse error = new ErrorResponse("Kích thước tệp tin vượt quá giới hạn cho phép",
                HttpStatus.PAYLOAD_TOO_LARGE.value());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(error);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            org.springframework.dao.DataIntegrityViolationException ex) {
        log.error("Database constraint violation", ex);

        String message = "Lỗi ràng buộc dữ liệu";

        // Trích xuất chi tiết từ exception
        Throwable cause = ex.getRootCause();
        if (cause != null) {
            String causeMsg = cause.getMessage();
            log.error("Root cause: {}", causeMsg);

            // Kiểm tra các lỗi phổ biến
            if (causeMsg != null) {
                if (causeMsg.contains("Duplicate")) {
                    message = "Dữ liệu đã tồn tại trong hệ thống";
                } else if (causeMsg.contains("FK") || causeMsg.contains("REFERENCE")) {
                    message = "Không thể xóa: Dữ liệu đang được sử dụng ở nơi khác";
                } else {
                    log.error("DB error detail (not sent to client): {}", causeMsg);
                    message = "Lỗi ràng buộc dữ liệu. Vui lòng kiểm tra lại thông tin.";
                }
            }
        }

        ErrorResponse error = new ErrorResponse(message, HttpStatus.CONFLICT.value());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex,
            jakarta.servlet.http.HttpServletRequest request) {
        String username = "Anonymous";
        try {
            if (DoAn.BE.common.util.SecurityUtil.isAuthenticated()) {
                username = DoAn.BE.common.util.SecurityUtil.getCurrentUsername();
            }
        } catch (Exception e) {
            // Ignore auth check errors during exception handling
        }

        log.error("Exception at {} {}: User={}. Error: {}",
                request.getMethod(), request.getRequestURI(), username, ex.getMessage());
        log.error("Stack trace:", ex);
        ErrorResponse error = new ErrorResponse("Lỗi hệ thống. Vui lòng thử lại sau.",
                HttpStatus.INTERNAL_SERVER_ERROR.value());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
