import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './app/App';
import './index.css';

import ErrorBoundary from '@shared/components/ErrorBoundary';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
            <Toaster richColors position="bottom-right" />
        </ErrorBoundary>
    </StrictMode>
);

