import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

// --- Mock apiClient ---
vi.mock('@shared/api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('@shared/api/endpoints', () => ({
    ENDPOINTS: {
        WORKSPACES: {
            LIST: '/api/workspaces',
            PERSONAL: '/api/workspaces/personal',
        },
        COMPANIES: {
            SETTINGS: (id) => `/api/companies/${id}/settings`,
        },
    },
}));

import apiClient from '@shared/api/client';

// --- Spy console.error/warn → ZERO unexpected errors ---
let consoleErrorSpy;
let consoleWarnSpy;

// Helper to reset store to initial state
const resetStore = () => {
    useWorkspaceStore.setState({
        workspaces: [],
        currentWorkspace: null,
        workspaceType: 'PERSONAL',
        personalWorkspace: null,
        loading: false,
        error: null,
    });
};

describe('workspaceStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
        localStorage.clear();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    // ---------------------------------------------------------------
    // Scenario 1: Default state
    // ---------------------------------------------------------------
    it('1. Khởi tạo: currentWorkspace=null, workspaces=[], workspaceType=PERSONAL', () => {
        const state = useWorkspaceStore.getState();
        expect(state.currentWorkspace).toBeNull();
        expect(state.workspaces).toEqual([]);
        expect(state.workspaceType).toBe('PERSONAL');
        expect(state.personalWorkspace).toBeNull();
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
    });

    // ---------------------------------------------------------------
    // Scenario 2: setWorkspaces()
    // ---------------------------------------------------------------
    it('2. setWorkspaces() → set workspaces array', () => {
        const workspaces = [
            { id: 1, name: 'Personal', type: 'PERSONAL' },
            { id: 2, name: 'Company A', type: 'COMPANY' },
        ];
        useWorkspaceStore.getState().setWorkspaces(workspaces);

        const state = useWorkspaceStore.getState();
        expect(state.workspaces).toHaveLength(2);
        expect(state.workspaces[0].name).toBe('Personal');
        expect(state.workspaces[1].name).toBe('Company A');
    });

    // ---------------------------------------------------------------
    // Scenario 3: setPersonalWorkspace()
    // ---------------------------------------------------------------
    it('3. setPersonalWorkspace() → set personalWorkspace', () => {
        const personalWS = { workspaceId: 'ws-1', name: 'My Space', plan: 'FREE' };
        useWorkspaceStore.getState().setPersonalWorkspace(personalWS);

        const state = useWorkspaceStore.getState();
        expect(state.personalWorkspace).toEqual(personalWS);
        expect(state.personalWorkspace.plan).toBe('FREE');
    });

    // ---------------------------------------------------------------
    // Scenario 4: fetchWorkspaces() success
    // ---------------------------------------------------------------
    it('4. fetchWorkspaces() thành công → gọi API, set workspaces', async () => {
        const mockWorkspaces = [
            { id: 1, name: 'Personal', type: 'PERSONAL' },
            { id: 2, name: 'Acme Corp', type: 'COMPANY' },
        ];
        apiClient.get.mockResolvedValueOnce({ data: mockWorkspaces });

        const result = await useWorkspaceStore.getState().fetchWorkspaces();

        expect(apiClient.get).toHaveBeenCalledWith('/api/workspaces');
        expect(result).toHaveLength(2);

        const state = useWorkspaceStore.getState();
        expect(state.workspaces).toHaveLength(2);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 5: fetchWorkspaces() failed
    // ---------------------------------------------------------------
    it('5. fetchWorkspaces() thất bại → error state, không crash', async () => {
        apiClient.get.mockRejectedValueOnce(new Error('Network Error'));

        const result = await useWorkspaceStore.getState().fetchWorkspaces();

        expect(result).toEqual([]);
        const state = useWorkspaceStore.getState();
        expect(state.loading).toBe(false);
        expect(state.error).toBe('Network Error');

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // ---------------------------------------------------------------
    // Scenario 6: selectWorkspace()
    // ---------------------------------------------------------------
    it('6. selectWorkspace() → set currentWorkspace + workspaceType', () => {
        const workspace = { id: 2, name: 'Company B', type: 'COMPANY' };
        useWorkspaceStore.getState().selectWorkspace(workspace);

        const state = useWorkspaceStore.getState();
        expect(state.currentWorkspace).toEqual(workspace);
        expect(state.workspaceType).toBe('COMPANY');
    });

    // ---------------------------------------------------------------
    // Scenario 7: switchToPersonal()
    // ---------------------------------------------------------------
    it('7. switchToPersonal() → set currentWorkspace=personal, workspaceType=PERSONAL', () => {
        // Set up personal workspace first
        useWorkspaceStore.setState({
            personalWorkspace: { workspaceId: 'ws-personal', name: 'My Space', plan: 'FREE' },
            currentWorkspace: { id: 2, name: 'Company', type: 'COMPANY' },
            workspaceType: 'COMPANY',
        });

        useWorkspaceStore.getState().switchToPersonal();

        const state = useWorkspaceStore.getState();
        expect(state.workspaceType).toBe('PERSONAL');
        expect(state.currentWorkspace.type).toBe('PERSONAL');
        expect(state.currentWorkspace.id).toBe('ws-personal');
        expect(state.currentWorkspace.roles).toEqual(['OWNER']); // personal always OWNER
    });

    // ---------------------------------------------------------------
    // Scenario 8: switchToCompany() success
    // ---------------------------------------------------------------
    it('8. switchToCompany() thành công → gọi API settings, set currentWorkspace, roles, workspaceType=COMPANY', async () => {
        const company = { id: 5, name: 'Acme Corp', type: 'COMPANY', roles: ['ADMIN'] };
        useWorkspaceStore.setState({ workspaces: [company] });

        apiClient.get.mockResolvedValueOnce({
            data: { hrModuleEnabled: true, projectModuleEnabled: true },
        });

        await useWorkspaceStore.getState().switchToCompany(5);

        // Verify API call to company settings
        expect(apiClient.get).toHaveBeenCalledWith('/api/companies/5/settings');

        const state = useWorkspaceStore.getState();
        expect(state.workspaceType).toBe('COMPANY');
        expect(state.currentWorkspace.id).toBe(5);
        expect(state.currentWorkspace.name).toBe('Acme Corp');
        expect(state.currentWorkspace.settings).toEqual({
            hrModuleEnabled: true,
            projectModuleEnabled: true,
        });
        expect(state.currentWorkspace.roles).toEqual(['ADMIN']);

        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    // ---------------------------------------------------------------
    // Scenario 9: switchToCompany() failed (settings fetch fails)
    // ---------------------------------------------------------------
    it('9. switchToCompany() thất bại → settings=null, still switches workspace', async () => {
        const company = { id: 5, name: 'Acme Corp', type: 'COMPANY', roles: ['MEMBER'] };
        useWorkspaceStore.setState({ workspaces: [company] });

        apiClient.get.mockRejectedValueOnce(new Error('Settings fetch failed'));

        await useWorkspaceStore.getState().switchToCompany(5);

        const state = useWorkspaceStore.getState();
        // Workspace still switched even if settings failed
        expect(state.workspaceType).toBe('COMPANY');
        expect(state.currentWorkspace.id).toBe(5);
        expect(state.currentWorkspace.settings).toBeNull();

        // Expected console.warn for settings failure
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    // ---------------------------------------------------------------
    // Scenario 10: clearWorkspace()
    // ---------------------------------------------------------------
    it('10. clearWorkspace() → reset về default', () => {
        useWorkspaceStore.setState({
            workspaces: [{ id: 1 }],
            currentWorkspace: { id: 1 },
            workspaceType: 'COMPANY',
            personalWorkspace: { id: 'p' },
            error: 'some error',
        });

        useWorkspaceStore.getState().clearWorkspace();

        const state = useWorkspaceStore.getState();
        expect(state.workspaces).toEqual([]);
        expect(state.currentWorkspace).toBeNull();
        expect(state.workspaceType).toBe('PERSONAL');
        expect(state.personalWorkspace).toBeNull();
        expect(state.error).toBeNull();
    });

    // ---------------------------------------------------------------
    // Scenario 11: isPersonalContext()
    // ---------------------------------------------------------------
    it('11. isPersonalContext() trả true khi type=PERSONAL', () => {
        useWorkspaceStore.setState({ workspaceType: 'PERSONAL' });
        expect(useWorkspaceStore.getState().isPersonalContext()).toBe(true);

        useWorkspaceStore.setState({ workspaceType: 'COMPANY' });
        expect(useWorkspaceStore.getState().isPersonalContext()).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 12: isCompanyContext()
    // ---------------------------------------------------------------
    it('12. isCompanyContext() trả true khi type=COMPANY', () => {
        useWorkspaceStore.setState({ workspaceType: 'COMPANY' });
        expect(useWorkspaceStore.getState().isCompanyContext()).toBe(true);

        useWorkspaceStore.setState({ workspaceType: 'PERSONAL' });
        expect(useWorkspaceStore.getState().isCompanyContext()).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 13: getCurrentCompanyId()
    // ---------------------------------------------------------------
    it('13. getCurrentCompanyId() trả ID từ currentWorkspace', () => {
        useWorkspaceStore.setState({
            currentWorkspace: { id: 42, type: 'COMPANY' },
            workspaceType: 'COMPANY',
        });
        expect(useWorkspaceStore.getState().getCurrentCompanyId()).toBe(42);
    });

    it('13b. getCurrentCompanyId() trả null khi PERSONAL', () => {
        useWorkspaceStore.setState({
            currentWorkspace: { id: 1, type: 'PERSONAL' },
            workspaceType: 'PERSONAL',
        });
        expect(useWorkspaceStore.getState().getCurrentCompanyId()).toBeNull();
    });

    // ---------------------------------------------------------------
    // Scenario 14: hasRole('ADMIN') → true
    // ---------------------------------------------------------------
    it('14. hasRole(ADMIN) trả true khi roles includes ADMIN', () => {
        useWorkspaceStore.setState({
            currentWorkspace: { id: 2, roles: ['ADMIN', 'MEMBER'] },
        });
        expect(useWorkspaceStore.getState().hasRole('ADMIN')).toBe(true);
    });

    // ---------------------------------------------------------------
    // Scenario 15: hasRole('ADMIN') → false
    // ---------------------------------------------------------------
    it('15. hasRole(ADMIN) trả false khi roles chỉ có MEMBER', () => {
        useWorkspaceStore.setState({
            currentWorkspace: { id: 2, roles: ['MEMBER'] },
        });
        expect(useWorkspaceStore.getState().hasRole('ADMIN')).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 16: hasPermission()
    // ---------------------------------------------------------------
    it('16. hasPermission(hrViewList) kiểm tra permissions object', () => {
        // ADMIN always has permission (bypass)
        useWorkspaceStore.setState({
            currentWorkspace: { id: 2, roles: ['ADMIN'], permissions: null },
            workspaceType: 'COMPANY',
        });
        expect(useWorkspaceStore.getState().hasPermission('hrViewList')).toBe(true);

        // MEMBER with explicit permission
        useWorkspaceStore.setState({
            currentWorkspace: { id: 2, roles: ['MEMBER'], permissions: { hrViewList: true } },
            workspaceType: 'COMPANY',
        });
        expect(useWorkspaceStore.getState().hasPermission('hrViewList')).toBe(true);

        // MEMBER without permission
        useWorkspaceStore.setState({
            currentWorkspace: { id: 2, roles: ['MEMBER'], permissions: { hrViewList: false } },
            workspaceType: 'COMPANY',
        });
        expect(useWorkspaceStore.getState().hasPermission('hrViewList')).toBe(false);

        // PERSONAL context → always true
        useWorkspaceStore.setState({
            currentWorkspace: { id: 1, roles: ['MEMBER'] },
            workspaceType: 'PERSONAL',
        });
        expect(useWorkspaceStore.getState().hasPermission('anything')).toBe(true);
    });
});
