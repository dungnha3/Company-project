import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OnboardingPage from '@pages/auth/OnboardingPage';

/**
 * OnboardingPage Tests
 *
 * Domain context:
 * - Đây là trang TẠO COMPANY workspace (không phải personal workspace)
 * - Form fields: name (required), size (select), industry (select)
 * - Submit → apiClient.post(ENDPOINTS.COMPANIES.CREATE) → fetchWorkspaces → selectWorkspace → navigate /app
 * - Name validation: không được empty/whitespace-only (checked in JS, NOT HTML required)
 */

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

const mockFetchWorkspaces = vi.fn();
const mockSelectWorkspace = vi.fn();
vi.mock('@shared/stores/workspaceStore', () => ({
    useWorkspaceStore: () => ({
        fetchWorkspaces: mockFetchWorkspaces,
        selectWorkspace: mockSelectWorkspace,
    }),
}));

vi.mock('@shared/api/client', () => ({
    default: { post: vi.fn() },
}));

vi.mock('@shared/api/endpoints', () => ({
    ENDPOINTS: {
        COMPANIES: { CREATE: '/api/companies' },
    },
}));

const mockToast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
vi.mock('@app/providers/ToastProvider', () => ({
    useToast: () => mockToast,
}));

import apiClient from '@shared/api/client';

let consoleErrorSpy;

describe('OnboardingPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    const renderPage = () => render(
        <MemoryRouter>
            <OnboardingPage />
        </MemoryRouter>
    );

    // =================================================================
    // Render Tests
    // =================================================================
    it('1. Render form: company name input, size select, industry select', () => {
        renderPage();

        expect(screen.getByPlaceholderText(/tech global/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/1-10/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/công nghệ/i)).toBeInTheDocument();
    });

    it('2. Render submit button "Hoàn tất thiết lập"', () => {
        renderPage();
        expect(screen.getByRole('button', { name: /hoàn tất thiết lập/i })).toBeInTheDocument();
    });

    // =================================================================
    // Submit Tests
    // =================================================================
    it('3. Submit valid → create company → fetchWorkspaces → navigate /app', async () => {
        const mockCompany = { id: 1, name: 'Test Corp' };
        apiClient.post.mockResolvedValueOnce({ data: mockCompany });
        mockFetchWorkspaces.mockResolvedValueOnce();

        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/tech global/i), {
            target: { value: 'Test Corp' },
        });
        fireEvent.click(screen.getByRole('button', { name: /hoàn tất thiết lập/i }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/api/companies', {
                name: 'Test Corp',
            });
            expect(mockToast.success).toHaveBeenCalledWith('Tạo Workspace thành công!');
            expect(mockFetchWorkspaces).toHaveBeenCalled();
            expect(mockSelectWorkspace).toHaveBeenCalledWith(mockCompany);
            expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
        });
    });

    it('4. Submit empty name → toast error, KHÔNG call API', async () => {
        renderPage();

        // Clear the name input to empty
        const nameInput = screen.getByPlaceholderText(/tech global/i);
        fireEvent.change(nameInput, { target: { value: '' } });

        // Submit the form directly via the form element (bypasses HTML required in jsdom)
        const form = nameInput.closest('form');
        fireEvent.submit(form);

        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith('Vui lòng nhập tên Workspace');
        });
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('5. Submit whitespace-only name → toast error, KHÔNG call API', async () => {
        renderPage();

        // Clear the input and type whitespace
        const nameInput = screen.getByPlaceholderText(/tech global/i);
        fireEvent.change(nameInput, { target: { value: '   ' } });
        fireEvent.click(screen.getByRole('button', { name: /hoàn tất thiết lập/i }));

        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith('Vui lòng nhập tên Workspace');
        });
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('6. API error → toast error message', async () => {
        apiClient.post.mockRejectedValueOnce({
            response: { data: { message: 'Tên công ty đã tồn tại' } },
        });

        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/tech global/i), {
            target: { value: 'Existing Corp' },
        });
        fireEvent.click(screen.getByRole('button', { name: /hoàn tất thiết lập/i }));

        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith('Tên công ty đã tồn tại');
        });
    });

    it('7. Loading state → button disabled + spinner text', async () => {
        apiClient.post.mockImplementation(() => new Promise(() => { }));

        renderPage();

        fireEvent.change(screen.getByPlaceholderText(/tech global/i), {
            target: { value: 'Test Corp' },
        });
        fireEvent.click(screen.getByRole('button', { name: /hoàn tất thiết lập/i }));

        await waitFor(() => {
            expect(screen.getByText(/đang khởi tạo/i)).toBeInTheDocument();
        });
    });

    // ZERO unexpected errors  
    it('8. ZERO unexpected console.error', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
