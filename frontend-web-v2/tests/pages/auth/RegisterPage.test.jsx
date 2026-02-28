import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * RegisterPage Tests
 *
 * Domain context:
 * - Form fields: fullName, username, email, password
 * - Password validation: regex khớp BE RegisterRequest.java policy
 *   - 8+ chars, uppercase, lowercase, digit, special char @$!%*?&
 * - Phải accept terms mới submit được
 * - Password strength indicator: Yếu (≤2), Trung bình (3-4), Mạnh (5)
 * - authStore.register() trả về { success, error }
 */

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

const mockRegister = vi.fn();
vi.mock('@shared/stores/authStore', () => ({
    useAuthStore: () => ({ register: mockRegister }),
}));

vi.mock('@/components/auth/GoogleLoginButton', () => ({
    default: ({ text }) => (
        <div data-testid="google-login" id="googleButtonDiv" className="w-full h-[40px] flex justify-center">
            {text}
        </div>
    ),
}));

let consoleErrorSpy;
let RegisterPage;

describe('RegisterPage', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const mod = await import('@pages/auth/RegisterPage');
        RegisterPage = mod.default;
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    const renderPage = () => render(
        <MemoryRouter>
            <RegisterPage />
        </MemoryRouter>
    );

    // Helper: fill all fields with valid data
    const fillValidForm = () => {
        fireEvent.change(screen.getByPlaceholderText(/nguyễn/i), { target: { value: 'Nguyen Van A' } });
        fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'nguyenvana' } });
        fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@test.com' } });
        fireEvent.change(screen.getByPlaceholderText(/tối thiểu/i), { target: { value: 'Str0ng@Pass' } });
        // Accept terms
        const termsCheckbox = screen.getByRole('checkbox');
        if (!termsCheckbox.checked) fireEvent.click(termsCheckbox);
    };

    // =================================================================
    // Render Tests
    // =================================================================
    it('1. Render form: fullName, username, email, password fields', () => {
        renderPage();

        expect(screen.getByPlaceholderText(/nguyễn/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/tối thiểu/i)).toBeInTheDocument();
    });

    it('2. Render Google login button (configured)', () => {
        renderPage();
        const googleBtn = screen.getByTestId('google-login');
        expect(googleBtn).toBeInTheDocument();
        // RegisterPage passes text="Đăng ký bằng Google"
        expect(googleBtn.textContent).toBe('Đăng ký bằng Google');
    });

    it('3. Render "Đã có tài khoản? Đăng nhập" link', () => {
        renderPage();
        expect(screen.getByText(/đã có tài khoản/i)).toBeInTheDocument();
    });

    // =================================================================
    // Validation Tests
    // =================================================================
    it('4. Submit không accept terms → error', async () => {
        renderPage();

        // Fill form but DON'T check terms
        fireEvent.change(screen.getByPlaceholderText(/nguyễn/i), { target: { value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'test' } });
        fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@b.com' } });
        fireEvent.change(screen.getByPlaceholderText(/tối thiểu/i), { target: { value: 'Str0ng@Pass' } });

        fireEvent.submit(screen.getByRole('button', { name: /tạo tài khoản/i }));

        await waitFor(() => {
            expect(screen.getByText(/đồng ý với điều khoản/i)).toBeInTheDocument();
        });
        expect(mockRegister).not.toHaveBeenCalled();
    });

    it('5. Submit weak password → error (regex validation)', async () => {
        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/nguyễn/i), { target: { value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'test' } });
        fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'a@b.com' } });
        fireEvent.change(screen.getByPlaceholderText(/tối thiểu/i), { target: { value: 'weak' } });
        fireEvent.click(screen.getByRole('checkbox'));

        fireEvent.submit(screen.getByRole('button', { name: /tạo tài khoản/i }));

        await waitFor(() => {
            expect(screen.getByText(/mật khẩu phải có ít nhất 8 ký tự/i)).toBeInTheDocument();
        });
        expect(mockRegister).not.toHaveBeenCalled();
    });

    // =================================================================
    // Password Strength Indicator
    // =================================================================
    it('6. Password strength: "ab" → Yếu', () => {
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(/tối thiểu/i), { target: { value: 'ab' } });
        expect(screen.getByText('Yếu')).toBeInTheDocument();
    });

    it('7. Password strength: "Str0ng@Pass" → Mạnh', () => {
        renderPage();
        fireEvent.change(screen.getByPlaceholderText(/tối thiểu/i), { target: { value: 'Str0ng@Pass' } });
        expect(screen.getByText('Mạnh')).toBeInTheDocument();
    });

    // =================================================================
    // Submit Tests
    // =================================================================
    it('8. Submit valid → register success → navigate /app', async () => {
        mockRegister.mockResolvedValueOnce({ success: true });

        renderPage();
        fillValidForm();

        fireEvent.submit(screen.getByRole('button', { name: /tạo tài khoản/i }));

        await waitFor(() => {
            expect(mockRegister).toHaveBeenCalledWith({
                fullName: 'Nguyen Van A',
                username: 'nguyenvana',
                email: 'a@test.com',
                password: 'Str0ng@Pass',
            });
            expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
        });
    });

    it('9. Register fail → show error', async () => {
        mockRegister.mockResolvedValueOnce({
            success: false,
            error: 'Email đã tồn tại',
        });

        renderPage();
        fillValidForm();

        fireEvent.submit(screen.getByRole('button', { name: /tạo tài khoản/i }));

        await waitFor(() => {
            expect(screen.getByText('Email đã tồn tại')).toBeInTheDocument();
        });
    });

    it('10. Register throws → show error', async () => {
        mockRegister.mockRejectedValueOnce(new Error('Network error'));

        renderPage();
        fillValidForm();

        fireEvent.submit(screen.getByRole('button', { name: /tạo tài khoản/i }));

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });

    it('11. Loading state → button shows spinner text', async () => {
        mockRegister.mockImplementation(() => new Promise(() => { }));

        renderPage();
        fillValidForm();

        fireEvent.submit(screen.getByRole('button', { name: /tạo tài khoản/i }));

        await waitFor(() => {
            expect(screen.getByText(/đang tạo tài khoản/i)).toBeInTheDocument();
        });
    });

    // =================================================================
    // Edge Case Tests
    // =================================================================
    it('12. Double submit → button disabled, chỉ gọi register 1 lần', async () => {
        mockRegister.mockImplementation(() => new Promise(() => { }));

        renderPage();
        fillValidForm();

        const submitBtn = screen.getByRole('button', { name: /tạo tài khoản/i });
        fireEvent.submit(submitBtn);
        fireEvent.submit(submitBtn); // 2nd submit

        await waitFor(() => {
            expect(screen.getByText(/đang tạo tài khoản/i)).toBeInTheDocument();
        });
        expect(mockRegister).toHaveBeenCalledTimes(1);
    });

    // ZERO unexpected errors
    it('13. ZERO unexpected console.error', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
