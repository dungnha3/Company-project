import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUIStore } from '@shared/stores/uiStore';

// --- Console spies ---
let consoleErrorSpy;

const resetStore = () => {
    useUIStore.setState({
        sidebarCollapsed: false,
        modals: {},
        globalLoading: false,
        theme: 'light',
    });
};

describe('uiStore', () => {
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
    it('1. Khởi tạo: sidebarCollapsed=false', () => {
        const state = useUIStore.getState();
        expect(state.sidebarCollapsed).toBe(false);
        expect(state.modals).toEqual({});
        expect(state.globalLoading).toBe(false);
        expect(state.theme).toBe('light');
    });

    // ---------------------------------------------------------------
    // Scenario 2: toggleSidebar()
    // ---------------------------------------------------------------
    it('2. toggleSidebar() → false→true', () => {
        expect(useUIStore.getState().sidebarCollapsed).toBe(false);
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    // ---------------------------------------------------------------
    // Scenario 3: toggleSidebar() twice
    // ---------------------------------------------------------------
    it('3. toggleSidebar() 2 lần → false→true→false', () => {
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarCollapsed).toBe(true);
        useUIStore.getState().toggleSidebar();
        expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 4: Modal open/close
    // ---------------------------------------------------------------
    it('4. openModal/closeModal → manages modal state correctly', () => {
        useUIStore.getState().openModal('create-employee', { deptId: 5 });

        const state1 = useUIStore.getState();
        expect(state1.modals['create-employee']).toEqual({
            isOpen: true,
            data: { deptId: 5 },
        });

        useUIStore.getState().closeModal('create-employee');

        const state2 = useUIStore.getState();
        expect(state2.modals['create-employee']).toEqual({
            isOpen: false,
            data: null,
        });
    });

    // ---------------------------------------------------------------
    // Scenario 5: setSidebarCollapsed
    // ---------------------------------------------------------------
    it('5. setSidebarCollapsed(true) → directly sets value', () => {
        useUIStore.getState().setSidebarCollapsed(true);
        expect(useUIStore.getState().sidebarCollapsed).toBe(true);

        useUIStore.getState().setSidebarCollapsed(false);
        expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 6: setGlobalLoading
    // ---------------------------------------------------------------
    it('6. setGlobalLoading() → sets global loading state', () => {
        useUIStore.getState().setGlobalLoading(true);
        expect(useUIStore.getState().globalLoading).toBe(true);

        useUIStore.getState().setGlobalLoading(false);
        expect(useUIStore.getState().globalLoading).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 7: toggleTheme
    // ---------------------------------------------------------------
    it('7. toggleTheme() → light↔dark', () => {
        expect(useUIStore.getState().theme).toBe('light');
        useUIStore.getState().toggleTheme();
        expect(useUIStore.getState().theme).toBe('dark');
        useUIStore.getState().toggleTheme();
        expect(useUIStore.getState().theme).toBe('light');
    });

    // No unexpected console errors
    it('8. ZERO unexpected console errors across all tests', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
