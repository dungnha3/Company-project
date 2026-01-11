import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme Store - manages dark/light mode
 * Persists to localStorage and syncs with document class
 */
const useThemeStore = create(
    persist(
        (set, get) => ({
            theme: 'light', // 'light' | 'dark' | 'system'

            // Initialize theme on app load
            initTheme: () => {
                const currentTheme = get().theme;
                if (currentTheme === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.classList.toggle('dark', prefersDark);
                } else {
                    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
                }
            },

            // Set specific theme
            setTheme: (theme) => {
                set({ theme });
                if (theme === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.classList.toggle('dark', prefersDark);
                } else {
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                }
            },

            // Toggle between light and dark
            toggleTheme: () => {
                const current = get().theme;
                const next = current === 'light' ? 'dark' : 'light';
                get().setTheme(next);
            },

            // Check if currently dark mode
            isDark: () => {
                const theme = get().theme;
                if (theme === 'system') {
                    return window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                return theme === 'dark';
            },
        }),
        {
            name: 'theme-storage',
        }
    )
);

export default useThemeStore;
