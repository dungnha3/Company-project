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


        window.addEventListener('feature-disabled', handleFeatureDisabled);


        return () => {
            window.removeEventListener('feature-disabled', handleFeatureDisabled);

        };
    }, [toast]);

    return null; // This component doesn't render anything
}
