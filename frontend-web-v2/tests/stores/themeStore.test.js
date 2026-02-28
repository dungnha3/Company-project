import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useThemeStore from '@shared/stores/themeStore';

// --- Console spies ---
let consoleErrorSpy;

const resetStore = () => {
    useThemeStore.setState({ theme: 'light' });
};

describe('themeStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        // Reset document.documentElement.classList
        document.documentElement.classList.remove('dark');
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // ---------------------------------------------------------------
    // Scenario 1: Default state
    // ---------------------------------------------------------------
    it('1. Khởi tạo: theme=light', () => {
        expect(useThemeStore.getState().theme).toBe('light');
    });

    // ---------------------------------------------------------------
    // Scenario 2: setTheme('dark')
    // ---------------------------------------------------------------
    it('2. setTheme(dark) → theme=dark + document class updated', () => {
        useThemeStore.getState().setTheme('dark');

        expect(useThemeStore.getState().theme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    // ---------------------------------------------------------------
    // Scenario 3: toggleTheme()
    // ---------------------------------------------------------------
    it('3. toggleTheme() → light↔dark', () => {
        expect(useThemeStore.getState().theme).toBe('light');

        useThemeStore.getState().toggleTheme();
        expect(useThemeStore.getState().theme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        useThemeStore.getState().toggleTheme();
        expect(useThemeStore.getState().theme).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    // ---------------------------------------------------------------
    // Scenario 4: initTheme() reads from persisted state
    // ---------------------------------------------------------------
    it('4. initTheme() with theme=dark → sets document class', () => {
        useThemeStore.setState({ theme: 'dark' });

        useThemeStore.getState().initTheme();

        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    // ---------------------------------------------------------------
    // Scenario 5: initTheme() with system theme
    // ---------------------------------------------------------------
    it('5. initTheme() with theme=system → reads prefers-color-scheme', () => {
        // Mock matchMedia
        const mockMatchMedia = vi.fn().mockReturnValue({ matches: true });
        window.matchMedia = mockMatchMedia;

        useThemeStore.setState({ theme: 'system' });
        useThemeStore.getState().initTheme();

        expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    // ---------------------------------------------------------------
    // Scenario 6: isDark() computed helper
    // ---------------------------------------------------------------
    it('6. isDark() returns correct value based on theme', () => {
        useThemeStore.getState().setTheme('light');
        expect(useThemeStore.getState().isDark()).toBe(false);

        useThemeStore.getState().setTheme('dark');
        expect(useThemeStore.getState().isDark()).toBe(true);
    });

    // ---------------------------------------------------------------
    // Scenario 7: Persist config
    // ---------------------------------------------------------------
    it('7. persist config uses theme-storage name', () => {
        const persistAPI = useThemeStore.persist;
        expect(persistAPI).toBeDefined();

        const options = persistAPI.getOptions();
        expect(options.name).toBe('theme-storage');
    });

    // ZERO unexpected console errors
    it('8. ZERO unexpected console errors', () => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
