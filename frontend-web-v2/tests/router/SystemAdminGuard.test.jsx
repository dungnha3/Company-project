import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SystemAdminGuard from '@app/router/guards/SystemAdminGuard';

/**
 * SystemAdminGuard Tests
 *
 * Domain context:
 * - SYSTEM_ADMIN là role cấp HỆ THỐNG (platform admin), KHÔNG phải role công ty
 * - user.isSystemAdmin = true → được vào /admin/*
 * - user.isSystemAdmin = false/undefined → redirect về /app
 * - Chưa đăng nhập → redirect về /login
 * - Guard này ĐỘC LẬP với AccessControlGuard (company-level)
 */

// Mock authStore
const mockAuthState = {
    isAuthenticated: false,
    user: null,
};

vi.mock('@shared/stores/authStore', () => ({
    useAuthStore: vi.fn(() => mockAuthState),
}));

// Mock react-router Navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        Navigate: (props) => {
            mockNavigate(props);
            return <div data-testid="navigate" data-to={props.to} />;
        },
    };
});

let consoleErrorSpy;

describe('SystemAdminGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // =================================================================
    // 1. Chưa đăng nhập → redirect /login
    // =================================================================
    it('1. Chưa đăng nhập → redirect đến /login', () => {
        mockAuthState.isAuthenticated = false;
        mockAuthState.user = null;

        render(
            <MemoryRouter>
                <SystemAdminGuard>
                    <div data-testid="admin-content">Admin Panel</div>
                </SystemAdminGuard>
            </MemoryRouter>
        );

        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ to: '/login', replace: true })
        );
    });

    // =================================================================
    // 2. Đăng nhập, nhưng KHÔNG phải SYSTEM_ADMIN → redirect /app
    // =================================================================
    it('2. User thường (không phải sysadmin) → redirect /app', () => {
        mockAuthState.isAuthenticated = true;
        mockAuthState.user = { id: 1, username: 'employee', isSystemAdmin: false };

        render(
            <MemoryRouter>
                <SystemAdminGuard>
                    <div data-testid="admin-content">Admin Panel</div>
                </SystemAdminGuard>
            </MemoryRouter>
        );

        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ to: '/app', replace: true })
        );
    });

    // =================================================================
    // 3. User OWNER (company role) nhưng không phải SYSTEM_ADMIN → redirect
    // =================================================================
    it('3. OWNER (company level) nhưng KHÔNG isSystemAdmin → redirect /app', () => {
        mockAuthState.isAuthenticated = true;
        mockAuthState.user = { id: 2, username: 'owner', role: 'OWNER', isSystemAdmin: false };

        render(
            <MemoryRouter>
                <SystemAdminGuard>
                    <div data-testid="admin-content">Admin Panel</div>
                </SystemAdminGuard>
            </MemoryRouter>
        );

        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        // Company OWNER ≠ System Admin
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ to: '/app' })
        );
    });

    // =================================================================
    // 4. SYSTEM_ADMIN → render children
    // =================================================================
    it('4. isSystemAdmin=true → render children (admin panel accessible)', () => {
        mockAuthState.isAuthenticated = true;
        mockAuthState.user = { id: 3, username: 'sysadmin', isSystemAdmin: true };

        render(
            <MemoryRouter>
                <SystemAdminGuard>
                    <div data-testid="admin-content">Admin Panel</div>
                </SystemAdminGuard>
            </MemoryRouter>
        );

        expect(screen.getByTestId('admin-content')).toBeInTheDocument();
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    // =================================================================
    // 5. user = null nhưng isAuthenticated = true → redirect /app
    // =================================================================
    it('5. isAuthenticated=true nhưng user=null → redirect /app (edge case)', () => {
        mockAuthState.isAuthenticated = true;
        mockAuthState.user = null;

        render(
            <MemoryRouter>
                <SystemAdminGuard>
                    <div data-testid="admin-content">Admin Panel</div>
                </SystemAdminGuard>
            </MemoryRouter>
        );

        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        // user?.isSystemAdmin → undefined → falsy → redirect
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ to: '/app' })
        );
    });

    // =================================================================
    // 6. user.isSystemAdmin undefined (legacy user) → redirect /app
    // =================================================================
    it('6. user không có field isSystemAdmin (legacy) → redirect /app', () => {
        mockAuthState.isAuthenticated = true;
        mockAuthState.user = { id: 4, username: 'legacy-user' };

        render(
            <MemoryRouter>
                <SystemAdminGuard>
                    <div data-testid="admin-content">Admin Panel</div>
                </SystemAdminGuard>
            </MemoryRouter>
        );

        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({ to: '/app' })
        );
    });

    // ZERO unexpected errors
    it('7. ZERO unexpected console.error', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
