import { Outlet, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '@shared/stores/authStore';
import { useUIStore } from '@shared/stores/uiStore';
import useThemeStore from '@shared/stores/themeStore';
import { useKeyboardShortcuts } from '@shared/components/ShortcutsModal';


export default function DashboardLayout() {
    const { sidebarCollapsed } = useUIStore();
    const { initTheme } = useThemeStore();
    const navigate = useNavigate();
    const { projectId } = useParams();
    const { isAuthenticated } = useAuthStore();

    // Initialize keyboard shortcuts
    const { ShortcutsModal } = useKeyboardShortcuts(navigate);

    // Initialize theme on mount
    useEffect(() => {
        initTheme();
    }, [initTheme]);


    // [SYSADMIN FIX] Double check redirect
    const { user } = useAuthStore.getState();
    if (user?.isSystemAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 transition-colors duration-300">
            <Sidebar />
            <main className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                <Header />

                <div className="p-6 animate-fade-in flex-1 overflow-x-hidden">
                    <Outlet />
                </div>
            </main>

            {/* Keyboard Shortcuts Modal */}
            <ShortcutsModal />

        </div>
    );
}

