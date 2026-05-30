import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';

import ErrorBoundary from '@shared/components/ErrorBoundary';

createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

