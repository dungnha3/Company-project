/**
 * Shared formatting utilities
 */

// Format currency to Vietnamese format
export const formatCurrency = (val) => 
  new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(val || 0);

// Format date to Vietnamese format
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN');
};

// Format number with thousand separators
export const formatNumber = (num) => {
  if (!num) return '0';
  return new Intl.NumberFormat('vi-VN').format(num);
};

// Format percentage
export const formatPercentage = (val) => {
  if (!val) return '0%';
  return `${val}%`;
};
