import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { CompanyProvider } from './CompanyProvider';
import { ToastProvider } from './ToastProvider';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
        },
    },
});

export function Providers({ children }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <CompanyProvider>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </CompanyProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
