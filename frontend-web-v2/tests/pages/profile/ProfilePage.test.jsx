import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProfilePage from '@pages/profile/ProfilePage';

// Mocks
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@shared/stores/authStore', () => ({
    useAuthStore: vi.fn(),
}));

vi.mock('@shared/api/client', () => ({
    default: {
        post: vi.fn(),
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
    }
}));

vi.mock('@app/providers/ToastProvider', () => ({
    useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('@shared/components/OptimizedImage', () => ({
    Avatar: () => <div data-testid="avatar-mock" />
}));

import { useAuthStore } from '@shared/stores/authStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@shared/api/client';

describe('Profile Module Unit Tests', () => {
    const mockUpdateUser = vi.fn();
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        useAuthStore.mockReturnValue({
            user: { id: 1, fullName: 'Test User', email: 'test@example.com', role: 'ADMIN' },
            updateUser: mockUpdateUser,
            logout: mockLogout,
        });

        // Mock react query states
        useQuery.mockReturnValue({ data: [], isLoading: false });
        useMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    });

    it('Scenario 1: Renders primary User specific information correctly', () => {
        render(<ProfilePage />);
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('Scenario 2: UI successfully switches across Info, Security, Notifications, and Session Tabs', () => {
        render(<ProfilePage />);
        // By default 'Thông tin' tab content is shown
        expect(screen.getByText('Thông tin cá nhân')).toBeInTheDocument();

        // Switch to Security
        fireEvent.click(screen.getByText('Bảo mật', { selector: 'button' }));
        expect(screen.getByText('Bảo mật tài khoản')).toBeInTheDocument();

        // Switch to Sessions
        fireEvent.click(screen.getByText('Phiên đăng nhập', { selector: 'button' }));
        expect(screen.getByText('Đăng xuất tất cả')).toBeInTheDocument();

        // Switch to Notifications
        fireEvent.click(screen.getByText('Thông báo', { selector: 'button' }));
        expect(screen.getByText('Cài đặt thông báo')).toBeInTheDocument();
    });

    it('Scenario 3: 2FA Toggle switch triggers fake logic properly', async () => {
        render(<ProfilePage />);
        // Open security tab
        fireEvent.click(screen.getByText('Bảo mật', { selector: 'button' }));

        const securityTitle = screen.getByText('Xác thực 2 lớp (2FA)');
        expect(securityTitle).toBeInTheDocument();

        // Find toggle button
        const toggleButton = securityTitle.parentElement.parentElement.nextSibling;
        expect(toggleButton.tagName.toLowerCase()).toBe('button');

        // Click the toggle
        fireEvent.click(toggleButton);
        // It's an async operation, so we rely on the component execution path
        // For a deep dive we'd assert the Toast, but this confirms the UI interaction doesn't crash it
        await waitFor(() => {
            expect(toggleButton).toHaveClass('bg-green-500'); // the UI optimistically updates
        });
    });
});
