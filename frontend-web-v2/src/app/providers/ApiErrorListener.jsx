/**
 * Global API Error Listener
 * Listens for custom events dispatched by API client interceptor
 * and shows appropriate toast notifications
 */

import { useEffect } from 'react';
import { useToast } from './ToastProvider';

export function ApiErrorListener() {
    const toast = useToast();

    useEffect(() => {
        // Handle Feature Disabled errors
        const handleFeatureDisabled = (event) => {
            const { message } = event.detail;
            toast.error(message || 'Tính năng này đã bị vô hiệu hóa cho workspace của bạn');
        };

        // Handle Quota Exceeded errors
        const handleQuotaExceeded = (event) => {
            const { message } = event.detail;
            toast.warning(message || 'Bạn đã vượt quá giới hạn cho phép. Vui lòng liên hệ quản trị viên hoặc nâng cấp gói.');
        };

        window.addEventListener('feature-disabled', handleFeatureDisabled);
        window.addEventListener('quota-exceeded', handleQuotaExceeded);

        return () => {
            window.removeEventListener('feature-disabled', handleFeatureDisabled);
            window.removeEventListener('quota-exceeded', handleQuotaExceeded);
        };
    }, [toast]);

    return null; // This component doesn't render anything
}
