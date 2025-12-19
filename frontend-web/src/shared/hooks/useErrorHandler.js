/**
 * useErrorHandler Hook
 * Custom hook để handle errors và show notifications
 * Wrapper cho errorHandler utils
 */

import { useCallback } from 'react';
import { 
  handleApiError, 
  getErrorType, 
  isAuthError, 
  isPermissionError,
  getValidationErrors 
} from '@/shared/utils/errorHandler';

export const useErrorHandler = () => {
  /**
   * Handle error và return message
   */
  const handleError = useCallback((error, options = {}) => {
    const message = handleApiError(error, options);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error);
      console.error('Message:', message);
    }
    
    return message;
  }, []);

  /**
   * Handle error và show alert
   */
  const handleErrorWithAlert = useCallback((error, options = {}) => {
    const message = handleError(error, options);
    alert(message);
    return message;
  }, [handleError]);

  /**
   * Get error type for conditional rendering
   */
  const getType = useCallback((error) => {
    return getErrorType(error);
  }, []);

  /**
   * Check if need to redirect to login
   */
  const isAuthenticationError = useCallback((error) => {
    return isAuthError(error);
  }, []);

  /**
   * Check if permission denied
   */
  const isForbidden = useCallback((error) => {
    return isPermissionError(error);
  }, []);

  /**
   * Extract validation errors for form fields
   */
  const getFieldErrors = useCallback((error) => {
    return getValidationErrors(error);
  }, []);

  /**
   * Handle error with custom callback
   */
  const handleErrorWithCallback = useCallback((error, callback, options = {}) => {
    const message = handleError(error, options);
    const type = getErrorType(error);
    
    if (callback) {
      callback(message, type, error);
    }
    
    return message;
  }, [handleError]);

  return {
    handleError,
    handleErrorWithAlert,
    handleErrorWithCallback,
    getType,
    isAuthenticationError,
    isForbidden,
    getFieldErrors,
  };
};
