import { create } from 'zustand';

export const useUIStore = create((set) => ({
    // Sidebar state
    sidebarCollapsed: false,
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    // Modal state
    modals: {},
    openModal: (modalId, data = null) =>
        set((state) => ({ modals: { ...state.modals, [modalId]: { isOpen: true, data } } })),
    closeModal: (modalId) =>
        set((state) => ({ modals: { ...state.modals, [modalId]: { isOpen: false, data: null } } })),

    // Loading state
    globalLoading: false,
    setGlobalLoading: (loading) => set({ globalLoading: loading }),

    // Theme
    theme: 'light',
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));
