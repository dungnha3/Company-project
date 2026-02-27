import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AccessControlGuard } from '@app/router/guards/AccessControlGuard';

// --- Mocks ---
vi.mock('@shared/stores/authStore', () => ({
    useAuthStore: vi.fn(),
}));

vi.mock('@shared/stores/workspaceStore', () => ({
    useWorkspaceStore: vi.fn(),
}));

vi.mock('@shared/utils/featureHelper', () => ({
    isFeatureEnabled: vi.fn(),
}));

vi.mock('@app/providers/ToastProvider', () => ({
    useToast: () => ({ warning: vi.fn(), success: vi.fn() }),
}));

// Import mocked modules after vi.mock
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import { isFeatureEnabled } from '@shared/utils/featureHelper';

// --- Helper Component to assert navigation ---
const LocationDisplay = () => {
    const location = useLocation();
    return <div data-testid="location-display">{location.pathname}</div>;
};

const TestComponent = () => <div data-testid="protected-content">Granted</div>;

const renderGuard = (props = {}, initialRoute = '/protected') => {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/app/me/tasks" element={<div>Personal Tasks</div>} />
                <Route path="/app" element={<div>App Fallback</div>} />
                <Route
                    path="/protected"
                    element={
                        <AccessControlGuard {...props}>
                            <TestComponent />
                        </AccessControlGuard>
                    }
                />
                <Route path="*" element={<LocationDisplay />} />
            </Routes>
        </MemoryRouter>
    );
};

// --- Test Suite ---
describe('AccessControlGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Scenario 1: Shows loading spinner if stores are not yet hydrated', () => {
        useAuthStore.mockReturnValue({ isHydrated: false });
        useWorkspaceStore.mockReturnValue({ isHydrated: false });

        const { container } = renderGuard();
        expect(screen.queryByText('Granted')).not.toBeInTheDocument();
        expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('Scenario 2: Redirects to /login if requireAuth=true and user is not authenticated', () => {
        useAuthStore.mockReturnValue({ isHydrated: true, isAuthenticated: false, user: null });
        useWorkspaceStore.mockReturnValue({ isHydrated: true });

        renderGuard({ requireAuth: true });
        expect(screen.getByText('Login Page')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('Scenario 3: Grants access if only requireAuth=true and user is logged in', () => {
        useAuthStore.mockReturnValue({ isHydrated: true, isAuthenticated: true, user: { id: 1 } });
        useWorkspaceStore.mockReturnValue({ isHydrated: true }); // No workspace needed if requireCompany is false

        renderGuard({ requireAuth: true });
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('Scenario 4: Redirects to Personal Workspace if requireCompany=true but current workspace is PERSONAL', () => {
        useAuthStore.mockReturnValue({ isHydrated: true, isAuthenticated: true, user: { id: 1 } });
        useWorkspaceStore.mockReturnValue({
            isHydrated: true,
            currentWorkspace: { id: 1, type: 'PERSONAL' },
            workspaceType: 'PERSONAL'
        });

        renderGuard({ requireAuth: true, requireCompany: true });
        expect(screen.getByText('Personal Tasks')).toBeInTheDocument();
    });

    it('Scenario 5: Denies access (shows lock screen) if user lacks required roles in Company', () => {
        useAuthStore.mockReturnValue({ isHydrated: true, isAuthenticated: true, user: { id: 1 } });
        useWorkspaceStore.mockReturnValue({
            isHydrated: true,
            currentWorkspace: { id: 2, type: 'COMPANY', roles: ['MEMBER'] },
            workspaceType: 'COMPANY'
        });

        renderGuard({ allowedRoles: ['ADMIN', 'OWNER'] });
        expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('Scenario 6: Grants access if user has one of the required roles in Company', () => {
        useAuthStore.mockReturnValue({ isHydrated: true, isAuthenticated: true, user: { id: 1 } });
        useWorkspaceStore.mockReturnValue({
            isHydrated: true,
            currentWorkspace: { id: 2, type: 'COMPANY', roles: ['ADMIN', 'MEMBER'] },
            workspaceType: 'COMPANY'
        });

        renderGuard({ allowedRoles: ['ADMIN', 'OWNER'] });
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('Scenario 7: Redirects to fallback path if Company Feature is disabled for the plan', () => {
        useAuthStore.mockReturnValue({ isHydrated: true, isAuthenticated: true, user: { id: 1 } });
        useWorkspaceStore.mockReturnValue({
            isHydrated: true,
            currentWorkspace: { id: 2, type: 'COMPANY', plan: 'FREE', settings: { features: [] } },
            workspaceType: 'COMPANY'
        });
        isFeatureEnabled.mockReturnValue(false);

        renderGuard({ requiredFeature: 'hr', fallbackPath: '/app' });
        expect(screen.getByText('App Fallback')).toBeInTheDocument();
    });

    it('Scenario 8: Grants access if Company Feature is enabled for the plan', () => {
        useAuthStore.mockReturnValue({ isHydrated: true, isAuthenticated: true, user: { id: 1 } });
        useWorkspaceStore.mockReturnValue({
            isHydrated: true,
            currentWorkspace: { id: 2, type: 'COMPANY', plan: 'PRO', settings: { features: ['hr'] } },
            workspaceType: 'COMPANY'
        });
        isFeatureEnabled.mockReturnValue(true);

        renderGuard({ requiredFeature: 'hr' });
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
});
