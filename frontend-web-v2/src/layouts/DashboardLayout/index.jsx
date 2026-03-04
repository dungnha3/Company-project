import { Outlet, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '@shared/stores/authStore';
import { useUIStore } from '@shared/stores/uiStore';
import useThemeStore from '@shared/stores/themeStore';
import { useKeyboardShortcuts } from '@shared/components/ShortcutsModal';
import AIAssistantSidebar from '@shared/components/AIAssistantSidebar';
import QuotaWarningBanner from '@shared/components/ui/QuotaWarningBanner';
import { useWebSocketStore } from '@shared/stores/websocketStore';

export default function DashboardLayout() {
    const { sidebarCollapsed } = useUIStore();
    const { initTheme } = useThemeStore();
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [showAI, setShowAI] = useState(false);
    const { connect, disconnect } = useWebSocketStore();
    const { isAuthenticated } = useAuthStore();

    // Initialize keyboard shortcuts
    const { ShortcutsModal } = useKeyboardShortcuts(navigate);

    // Initialize theme on mount
    useEffect(() => {
        initTheme();
    }, [initTheme]);

    // Global WebSocket connection — connect once when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            connect();
        }
        return () => disconnect();
    }, [isAuthenticated]);

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
                {/* Quota Warning Banner - shows when near/at quota limits */}
                <QuotaWarningBanner />
                <div className="p-6 animate-fade-in flex-1 overflow-x-hidden">
                    <Outlet />
                </div>
            </main>

            {/* Keyboard Shortcuts Modal */}
            <ShortcutsModal />

            {/* AI Assistant Floating Button */}
            <button
                onClick={() => setShowAI(true)}
                className="fixed right-6 bottom-6 w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-40 flex items-center justify-center group"
                title="AI Assistant (Ctrl+/)"
            >
                <i className="fa-solid fa-robot text-xl group-hover:animate-pulse" />
            </button>

            {/* AI Assistant Sidebar */}
            <AIAssistantSidebar
                isOpen={showAI}
                onClose={() => setShowAI(false)}
                projectId={projectId ? Number(projectId) : null}
            />
        </div>
    );
}

