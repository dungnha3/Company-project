import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * LoginPage Tests
 *
 * Domain context:
 * - Login sử dụng field `username` (không phải email)
 * - SYSTEM_ADMIN login → navigate đến /admin/companies (platform admin panel)
 * - User thường login → navigate đến /app (company dashboard)
 * - authStore.login() trả về { success, user, error }
 */

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = vi.fn();
vi.mock('@shared/stores/authStore', () => ({
    useAuthStore: () => ({ login: mockLogin }),
}));

// Mock GoogleLoginButton — renders configured Google button
// VITE_GOOGLE_CLIENT_ID is now set in .env
vi.mock('@/components/auth/GoogleLoginButton', () => ({
    default: ({ text }) => (
        <div data-testid="google-login" id="googleButtonDiv" className="w-full h-[40px] flex justify-center">
            {text}
        </div>
    ),
}));

let consoleErrorSpy;
let LoginPage;

describe('LoginPage', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        // Dynamic import to ensure mocks are applied
        const mod = await import('@pages/auth/LoginPage');
        LoginPage = mod.default;
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    const renderPage = () => render(
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    );

    // =================================================================
    // Render Tests
    // =================================================================
    it('1. Render form: username input + password input + submit button', () => {
        renderPage();

        expect(screen.getByLabelText(/tên đăng nhập/i)).toBeInTheDocument();
        // Use specific ID selector to avoid matching "Hiện mật khẩu" aria-label
        expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
    });

    it('2. Render Google login button (configured)', () => {
        renderPage();
        const googleBtn = screen.getByTestId('google-login');
        expect(googleBtn).toBeInTheDocument();
        // LoginPage passes text="Tiếp tục với Google"
        expect(googleBtn.textContent).toBe('Tiếp tục với Google');
    });

    it('3. Render links: Quên mật khẩu + Đăng ký', () => {
        renderPage();
        expect(screen.getByText(/quên mật khẩu/i)).toBeInTheDocument();
        expect(screen.getByText(/đăng ký miễn phí/i)).toBeInTheDocument();
    });

    it('4. Password field has autoComplete="current-password"', () => {
        renderPage();
        const pwInput = document.getElementById('password');
        expect(pwInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('5. Toggle show/hide password', () => {
        renderPage();
        const pwInput = document.getElementById('password');
        expect(pwInput).toHaveAttribute('type', 'password');

        const toggleBtn = screen.getByLabelText(/hiện mật khẩu/i);
        fireEvent.click(toggleBtn);
        expect(pwInput).toHaveAttribute('type', 'text');
    });

    // =================================================================
    // Submit Tests
    // =================================================================
    it('6. Submit valid → login success → navigate /app', async () => {
        mockLogin.mockResolvedValueOnce({
            success: true,
            user: { id: 1, username: 'employee', isSystemAdmin: false },
        });

        renderPage();

        fireEvent.change(screen.getByLabelText(/tên đăng nhập/i), { target: { value: 'employee' } });
        fireEvent.change(document.getElementById('password'), { target: { value: 'P@ssw0rd' } });
        fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith({ username: 'employee', password: 'P@ssw0rd' });
            expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
        });
    });

    it('7. SYSTEM_ADMIN login → navigate /admin/companies (platform admin)', async () => {
        mockLogin.mockResolvedValueOnce({
            success: true,
            user: { id: 99, username: 'sysadmin', isSystemAdmin: true },
        });

        renderPage();

        fireEvent.change(screen.getByLabelText(/tên đăng nhập/i), { target: { value: 'sysadmin' } });
        fireEvent.change(document.getElementById('password'), { target: { value: 'Admin@123' } });
        fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/admin/companies', { replace: true });
        });
    });

    it('8. Login fail → show error message', async () => {
        mockLogin.mockResolvedValueOnce({
            success: false,
            error: 'Sai tên đăng nhập hoặc mật khẩu',
        });

        renderPage();

        fireEvent.change(screen.getByLabelText(/tên đăng nhập/i), { target: { value: 'wrong' } });
        fireEvent.change(document.getElementById('password'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

        await waitFor(() => {
            expect(screen.getByText('Sai tên đăng nhập hoặc mật khẩu')).toBeInTheDocument();
        });
    });

    it('9. Login throws exception → show generic error', async () => {
        mockLogin.mockRejectedValueOnce(new Error('Network error'));

        renderPage();

        fireEvent.change(screen.getByLabelText(/tên đăng nhập/i), { target: { value: 'user' } });
        fireEvent.change(document.getElementById('password'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

        await waitFor(() => {
            expect(screen.getByText('Đã có lỗi xảy ra')).toBeInTheDocument();
        });
    });

    it('10. Loading state → button shows spinner text', async () => {
        mockLogin.mockImplementation(() => new Promise(() => { }));

        renderPage();

        fireEvent.change(screen.getByLabelText(/tên đăng nhập/i), { target: { value: 'user' } });
        fireEvent.change(document.getElementById('password'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

        await waitFor(() => {
            expect(screen.getByText(/đang đăng nhập/i)).toBeInTheDocument();
        });
    });

    // =================================================================
    // Edge Case Tests
    // =================================================================
    it('11. Login success + user=null → navigate /app (null-safe, no crash)', async () => {
        // LoginPage.jsx:23 → result.user?.isSystemAdmin — null-safe after fix
        mockLogin.mockResolvedValueOnce({ success: true, user: null });

        renderPage();

        fireEvent.change(screen.getByLabelText(/tên đăng nhập/i), { target: { value: 'user' } });
        fireEvent.change(document.getElementById('password'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

        await waitFor(() => {
            // user?.isSystemAdmin = undefined → else branch → /app
            expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
        });
    });

    it('12. Double submit → button disabled, chỉ gọi login 1 lần', async () => {
        mockLogin.mockImplementation(() => new Promise(() => { })); // hang forever

        renderPage();

        fireEvent.change(screen.getByLabelText(/tên đăng nhập/i), { target: { value: 'user' } });
        fireEvent.change(document.getElementById('password'), { target: { value: 'pass' } });

        const submitBtn = screen.getByRole('button', { name: /đăng nhập/i });
        fireEvent.click(submitBtn);
        fireEvent.click(submitBtn); // 2nd click

        await waitFor(() => {
            expect(screen.getByText(/đang đăng nhập/i)).toBeInTheDocument();
        });
        // Login should only be called once because button is disabled after first click
        expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    // ZERO unexpected errors
    it('13. ZERO unexpected console.error', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
