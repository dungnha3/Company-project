/**
 * Validation Utility
 * Client-side validation trước khi gọi API
 * Giảm tải BE và cải thiện UX
 */

/**
 * Validate required field
 */
export const validateRequired = (value, fieldName = 'Trường này') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} không được để trống`;
  }
  return null;
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email) return 'Email không được để trống';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email không đúng định dạng';
  }
  
  return null;
};

/**
 * Validate phone number (Vietnam format)
 */
export const validatePhone = (phone) => {
  if (!phone) return 'Số điện thoại không được để trống';
  
  // Remove spaces and special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Vietnam phone: 10-11 digits, starts with 0
  const phoneRegex = /^0\d{9,10}$/;
  if (!phoneRegex.test(cleaned)) {
    return 'Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10-11 số)';
  }
  
  return null;
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password) return 'Mật khẩu không được để trống';
  
  if (password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự';
  }
  
  // Must contain uppercase, lowercase, number
  if (!/[A-Z]/.test(password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ hoa';
  }
  
  if (!/[a-z]/.test(password)) {
    return 'Mật khẩu phải có ít nhất 1 chữ thường';
  }
  
  if (!/\d/.test(password)) {
    return 'Mật khẩu phải có ít nhất 1 số';
  }
  
  return null;
};

/**
 * Validate date range
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate) return 'Ngày bắt đầu không được để trống';
  if (!endDate) return 'Ngày kết thúc không được để trống';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return 'Ngày bắt đầu phải trước ngày kết thúc';
  }
  
  return null;
};

/**
 * Validate number range
 */
export const validateNumberRange = (value, min, max, fieldName = 'Giá trị') => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} không được để trống`;
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    return `${fieldName} phải là số`;
  }
  
  if (min !== undefined && num < min) {
    return `${fieldName} phải lớn hơn hoặc bằng ${min}`;
  }
  
  if (max !== undefined && num > max) {
    return `${fieldName} phải nhỏ hơn hoặc bằng ${max}`;
  }
  
  return null;
};

/**
 * Validate file size
 */
export const validateFileSize = (file, maxSizeMB = 10) => {
  if (!file) return 'Vui lòng chọn file';
  
  const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  
  if (file.size > maxSize) {
    return `File không được vượt quá ${maxSizeMB}MB`;
  }
  
  return null;
};

/**
 * Validate file type
 */
export const validateFileType = (file, allowedTypes = []) => {
  if (!file) return 'Vui lòng chọn file';
  
  if (allowedTypes.length === 0) return null; // No restriction
  
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  const isAllowed = allowedTypes.some(type => {
    if (type.startsWith('.')) {
      // Extension check
      return fileName.endsWith(type);
    } else {
      // MIME type check
      return fileType === type || fileType.startsWith(type + '/');
    }
  });
  
  if (!isAllowed) {
    return `Chỉ chấp nhận file: ${allowedTypes.join(', ')}`;
  }
  
  return null;
};

/**
 * Validate employee data
 */
export const validateEmployee = (data) => {
  const errors = {};
  
  const nameError = validateRequired(data.hoTen, 'Họ tên');
  if (nameError) errors.hoTen = nameError;
  
  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;
  
  const phoneError = data.soDienThoai ? validatePhone(data.soDienThoai) : null;
  if (phoneError) errors.soDienThoai = phoneError;
  
  const deptError = validateRequired(data.phongbanId, 'Phòng ban');
  if (deptError) errors.phongbanId = deptError;
  
  const posError = validateRequired(data.chucvuId, 'Chức vụ');
  if (posError) errors.chucvuId = posError;
  
  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Validate leave request
 */
export const validateLeaveRequest = (data) => {
  const errors = {};
  
  const typeError = validateRequired(data.loaiNghiPhep, 'Loại nghỉ phép');
  if (typeError) errors.loaiNghiPhep = typeError;
  
  const dateError = validateDateRange(data.ngayBatDau, data.ngayKetThuc);
  if (dateError) errors.dateRange = dateError;
  
  const reasonError = validateRequired(data.lyDo, 'Lý do');
  if (reasonError) errors.lyDo = reasonError;
  
  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Generic form validator
 * Takes validation rules and data, returns errors object
 */
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const value = data[field];
    
    if (rule.required) {
      const error = validateRequired(value, rule.label);
      if (error) {
        errors[field] = error;
        return;
      }
    }
    
    if (rule.email) {
      const error = validateEmail(value);
      if (error) errors[field] = error;
    }
    
    if (rule.phone) {
      const error = validatePhone(value);
      if (error) errors[field] = error;
    }
    
    if (rule.min !== undefined || rule.max !== undefined) {
      const error = validateNumberRange(value, rule.min, rule.max, rule.label);
      if (error) errors[field] = error;
    }
    
    if (rule.custom) {
      const error = rule.custom(value);
      if (error) errors[field] = error;
    }
  });
  
  return Object.keys(errors).length > 0 ? errors : null;
};
