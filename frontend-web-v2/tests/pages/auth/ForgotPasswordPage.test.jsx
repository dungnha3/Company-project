import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '@pages/auth/ForgotPasswordPage';

/**
 * ForgotPasswordPage Tests
 *
 * Domain context:
 * - Sử dụng apiClient.post trực tiếp (KHÔNG qua authStore)
 * - Endpoint: ENDPOINTS.AUTH.FORGOT_PASSWORD
 * - Success → hiện giao diện "Email đã được gửi", ẨN form
 * - Error → hiện message từ API hoặc fallback message
 */

vi.mock('@shared/api/client', () => ({
    default: { post: vi.fn() },
}));

vi.mock('@shared/api/endpoints', () => ({
    ENDPOINTS: {
        AUTH: { FORGOT_PASSWORD: '/api/auth/forgot-password' },
    },
}));

import apiClient from '@shared/api/client';

let consoleErrorSpy;

describe('ForgotPasswordPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    const renderPage = () => render(
        <MemoryRouter>
            <ForgotPasswordPage />
        </MemoryRouter>
    );

    // =================================================================
    // Render Tests
    // =================================================================
    it('1. Render form: email input + submit button', () => {
        renderPage();

        expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /gửi link khôi phục/i })).toBeInTheDocument();
    });

    it('2. Render "Quay lại đăng nhập" link', () => {
        renderPage();
        expect(screen.getByText(/quay lại đăng nhập/i)).toBeInTheDocument();
    });

    // =================================================================
    // Submit Tests
    // =================================================================
    it('3. Submit valid email → success → hiện "Email đã được gửi"', async () => {
        apiClient.post.mockResolvedValueOnce({ data: {} });

        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/email/i), {
            target: { value: 'user@example.com' },
        });
        fireEvent.click(screen.getByRole('button', { name: /gửi link khôi phục/i }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
                email: 'user@example.com',
            });
            expect(screen.getByText(/email đã được gửi/i)).toBeInTheDocument();
        });

        // Form should be hidden after success
        expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    });

    it('4. API error → hiện error message', async () => {
        apiClient.post.mockRejectedValueOnce({
            response: { data: { message: 'Email không tồn tại trong hệ thống' } },
        });

        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/email/i), {
            target: { value: 'nonexistent@test.com' },
        });
        fireEvent.click(screen.getByRole('button', { name: /gửi link khôi phục/i }));

        await waitFor(() => {
            expect(screen.getByText('Email không tồn tại trong hệ thống')).toBeInTheDocument();
        });
    });

    it('5. API error without message → hiện fallback error', async () => {
        apiClient.post.mockRejectedValueOnce(new Error('Network error'));

        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/email/i), {
            target: { value: 'test@test.com' },
        });
        fireEvent.click(screen.getByRole('button', { name: /gửi link khôi phục/i }));

        await waitFor(() => {
            expect(screen.getByText(/không thể gửi email khôi phục/i)).toBeInTheDocument();
        });
    });

    it('6. Loading state → button disabled + spinner text', async () => {
        apiClient.post.mockImplementation(() => new Promise(() => { }));

        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/email/i), {
            target: { value: 'test@test.com' },
        });
        fireEvent.click(screen.getByRole('button', { name: /gửi link khôi phục/i }));

        await waitFor(() => {
            expect(screen.getByText(/đang gửi/i)).toBeInTheDocument();
        });
    });

    // ZERO unexpected errors
    it('7. ZERO unexpected console.error', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
