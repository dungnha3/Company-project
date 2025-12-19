/**
 * Error Handler Utility
 * Map BE error responses thành user-friendly messages
 * Handle tất cả HTTP status codes từ GlobalExceptionHandler.java
 */

/**
 * Main error handler
 * @param {Error} error - Axios error object
 * @param {Object} options - Additional options (context, fallback)
 * @returns {string} User-friendly error message
 */
export const handleApiError = (error, options = {}) => {
  const { context, fallback } = options;

  // Network error (no response)
  if (!error.response) {
    return '❌ Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
  }

  const { status, data } = error.response;
  const message = data?.message || data?.error;

  // Map HTTP status codes
  switch (status) {
    case 400: // Bad Request - Validation errors
      // Backend có thể trả về { field: "error" } hoặc { message: "error" }
      if (typeof data === 'object' && !data.message && !data.error) {
        // Format: { ngaySinh: "Ngày sinh không được để trống", role: "..." }
        const fieldErrors = Object.values(data);
        if (fieldErrors.length > 0) {
          return fieldErrors[0]; // Trả về lỗi đầu tiên
        }
      }
      return message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';

    case 401: // Unauthorized
      // Auto redirect to login được handle ở axios interceptor
      return message || 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';

    case 403: // Forbidden
      return message || 'Bạn không có quyền thực hiện thao tác này.';

    case 404: // Not Found
      return message || `Không tìm thấy ${context || 'dữ liệu'}.`;

    case 409: // Conflict (Duplicate)
      return message || 'Dữ liệu đã tồn tại trong hệ thống.';

    case 413: // Payload Too Large
      return message || 'File quá lớn. Vui lòng chọn file nhỏ hơn.';

    case 500: // Internal Server Error
      return message || 'Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ admin.';

    default:
      return message || fallback || `Đã xảy ra lỗi (${status}). Vui lòng thử lại.`;
  }
};

/**
 * Get error type for conditional UI rendering
 */
export const getErrorType = (error) => {
  if (!error.response) return 'network';

  const { status } = error.response;

  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'duplicate';
  if (status >= 500) return 'server';

  return 'client';
};

/**
 * Check if error requires login redirect
 */
export const isAuthError = (error) => {
  return error.response?.status === 401;
};

/**
 * Check if error is permission error
 */
export const isPermissionError = (error) => {
  return error.response?.status === 403;
};

/**
 * Extract validation errors from 400 response
 * BE returns object with field names as keys
 */
export const getValidationErrors = (error) => {
  if (error.response?.status !== 400) return {};

  const data = error.response.data;

  // If BE returns { field: "error message" } format
  if (typeof data === 'object' && !data.message) {
    return data;
  }

  return {};
};
