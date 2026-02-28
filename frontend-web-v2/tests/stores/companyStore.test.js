import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCompanyStore } from '@shared/stores/companyStore';

// --- Mock apiClient ---
vi.mock('@shared/api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('@shared/api/endpoints', () => ({
    ENDPOINTS: {
        COMPANIES: {
            LIST: '/api/companies',
            CREATE: '/api/companies',
        },
        AUTH: {
            SELECT_COMPANY: '/api/auth/select-company',
        },
        USERS: {
            LIST: '/api/users',
            BY_ID: (id) => `/api/users/${id}`,
        },
        INVITES: {
            SEND: '/api/company/invite',
        },
    },
}));

import apiClient from '@shared/api/client';

// --- Console spies ---
let consoleErrorSpy;

const resetStore = () => {
    useCompanyStore.setState({
        companies: [],
        currentCompany: null,
        currentRole: null,
        members: [],
        loading: false,
        error: null,
    });
};

describe('companyStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // ---------------------------------------------------------------
    // Scenario 1: Default state
    // ---------------------------------------------------------------
    it('1. Khởi tạo state mặc định', () => {
        const state = useCompanyStore.getState();
        expect(state.companies).toEqual([]);
        expect(state.currentCompany).toBeNull();
        expect(state.currentRole).toBeNull();
        expect(state.members).toEqual([]);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
    });

    // ---------------------------------------------------------------
    // Scenario 2: setCompanies
    // ---------------------------------------------------------------
    it('2. setCompanies → set companies + auto-select if only one', () => {
        // Multiple companies: no auto-select
        const companies = [
            { companyId: 1, name: 'A' },
            { companyId: 2, name: 'B' },
        ];
        useCompanyStore.getState().setCompanies(companies);

        expect(useCompanyStore.getState().companies).toHaveLength(2);
        expect(useCompanyStore.getState().currentCompany).toBeNull(); // no auto-select for multiple
    });

    // ---------------------------------------------------------------
    // Scenario 3: fetchCompanies success
    // ---------------------------------------------------------------
    it('3. fetchCompanies() thành công → set companies', async () => {
        apiClient.get.mockResolvedValueOnce({
            data: [{ companyId: 1, name: 'Acme' }],
        });

        const result = await useCompanyStore.getState().fetchCompanies();

        expect(apiClient.get).toHaveBeenCalledWith('/api/companies');
        expect(result).toHaveLength(1);
        expect(useCompanyStore.getState().companies[0].name).toBe('Acme');
        expect(useCompanyStore.getState().loading).toBe(false);

        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 4: fetchCompanies failure
    // ---------------------------------------------------------------
    it('4. fetchCompanies() thất bại → error state', async () => {
        apiClient.get.mockRejectedValueOnce(new Error('Network Error'));

        const result = await useCompanyStore.getState().fetchCompanies();

        expect(result).toEqual([]);
        expect(useCompanyStore.getState().error).toBe('Network Error');
        expect(useCompanyStore.getState().loading).toBe(false);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // ---------------------------------------------------------------
    // Scenario 5: selectCompany success
    // ---------------------------------------------------------------
    it('5. selectCompany() thành công → set currentCompany + currentRole', async () => {
        useCompanyStore.setState({
            companies: [{ companyId: 10, name: 'TestCo', role: 'ADMIN' }],
        });
        apiClient.post.mockResolvedValueOnce({});

        const result = await useCompanyStore.getState().selectCompany(10);

        expect(apiClient.post).toHaveBeenCalledWith('/api/auth/select-company', { companyId: 10 });
        expect(result).toBe(true);
        expect(useCompanyStore.getState().currentCompany.name).toBe('TestCo');
        expect(useCompanyStore.getState().currentRole).toBe('ADMIN');
    });

    // ---------------------------------------------------------------
    // Scenario 6: selectCompany with non-existent company
    // ---------------------------------------------------------------
    it('6. selectCompany() with invalid companyId → returns false', async () => {
        useCompanyStore.setState({ companies: [] });

        const result = await useCompanyStore.getState().selectCompany(999);

        expect(result).toBe(false);
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 7: clearCompany
    // ---------------------------------------------------------------
    it('7. clearCompany() → reset all state', () => {
        useCompanyStore.setState({
            companies: [{ companyId: 1 }],
            currentCompany: { companyId: 1 },
            currentRole: 'ADMIN',
            members: [{ id: 1 }],
            error: 'something',
        });

        useCompanyStore.getState().clearCompany();

        const state = useCompanyStore.getState();
        expect(state.companies).toEqual([]);
        expect(state.currentCompany).toBeNull();
        expect(state.currentRole).toBeNull();
        expect(state.members).toEqual([]);
        expect(state.error).toBeNull();
    });

    // ---------------------------------------------------------------
    // Scenario 8: hasRole with hierarchy
    // ---------------------------------------------------------------
    it('8. hasRole() checks role hierarchy', () => {
        useCompanyStore.setState({ currentRole: 'ADMIN' });

        // ADMIN has ADMIN role
        expect(useCompanyStore.getState().hasRole('ADMIN')).toBe(true);
        // ADMIN has MEMBER role (lower in hierarchy)
        expect(useCompanyStore.getState().hasRole('MEMBER')).toBe(true);
        // ADMIN does NOT have OWNER role (higher in hierarchy)
        expect(useCompanyStore.getState().hasRole('OWNER')).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 9: hasAnyRole
    // ---------------------------------------------------------------
    it('9. hasAnyRole() checks if current role matches any', () => {
        useCompanyStore.setState({ currentRole: 'MANAGER_HR' });

        expect(useCompanyStore.getState().hasAnyRole(['OWNER', 'ADMIN'])).toBe(false);
        expect(useCompanyStore.getState().hasAnyRole(['MANAGER_HR', 'ADMIN'])).toBe(true);
    });

    // ---------------------------------------------------------------
    // Scenario 10: computed helpers
    // ---------------------------------------------------------------
    it('10. hasMultipleCompanies + needsCompanySelection', () => {
        useCompanyStore.setState({
            companies: [{ companyId: 1 }, { companyId: 2 }],
            currentCompany: null,
        });

        expect(useCompanyStore.getState().hasMultipleCompanies()).toBe(true);
        expect(useCompanyStore.getState().needsCompanySelection()).toBe(true);

        useCompanyStore.setState({ currentCompany: { companyId: 1 } });
        expect(useCompanyStore.getState().needsCompanySelection()).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 11: inviteMember success
    // ---------------------------------------------------------------
    it('11. inviteMember() thành công → returns success', async () => {
        apiClient.post.mockResolvedValueOnce({});

        const result = await useCompanyStore.getState().inviteMember('new@example.com', 'MEMBER');

        expect(apiClient.post).toHaveBeenCalledWith('/api/company/invite', {
            email: 'new@example.com',
            role: 'MEMBER',
        });
        expect(result.success).toBe(true);
    });

    // ---------------------------------------------------------------
    // Scenario 12: removeMember with optimistic update
    // ---------------------------------------------------------------
    it('12. removeMember() → optimistic update removes from list', async () => {
        useCompanyStore.setState({
            currentCompany: { companyId: 1 },
            members: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
            ],
        });

        apiClient.delete.mockResolvedValueOnce({});

        const result = await useCompanyStore.getState().removeMember(1);

        expect(apiClient.delete).toHaveBeenCalledWith('/api/users/1');
        expect(result).toBe(true);
        expect(useCompanyStore.getState().members).toHaveLength(1);
        expect(useCompanyStore.getState().members[0].name).toBe('Bob');
    });

    // ---------------------------------------------------------------
    // Scenario 13: persist config
    // ---------------------------------------------------------------
    it('13. persist config partializes companies, currentCompany, currentRole', () => {
        const persistAPI = useCompanyStore.persist;
        const options = persistAPI.getOptions();

        expect(options.name).toBe('company-storage');

        const fullState = useCompanyStore.getState();
        const persisted = options.partialize(fullState);

        expect(persisted).toHaveProperty('companies');
        expect(persisted).toHaveProperty('currentCompany');
        expect(persisted).toHaveProperty('currentRole');
        expect(persisted).not.toHaveProperty('members');
        expect(persisted).not.toHaveProperty('loading');
        expect(persisted).not.toHaveProperty('error');
    });
});
