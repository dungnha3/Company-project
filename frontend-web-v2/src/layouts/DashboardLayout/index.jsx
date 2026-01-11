import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '@shared/stores/uiStore';
import useThemeStore from '@shared/stores/themeStore';
import { useKeyboardShortcuts } from '@shared/components/ShortcutsModal';
import AIAssistantSidebar from '@shared/components/AIAssistantSidebar';

export default function DashboardLayout() {
    const { sidebarCollapsed } = useUIStore();
    const { initTheme } = useThemeStore();
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [showAI, setShowAI] = useState(false);

    // Initialize keyboard shortcuts
    const { ShortcutsModal } = useKeyboardShortcuts(navigate);

    // Initialize theme on mount
    useEffect(() => {
        initTheme();
    }, [initTheme]);

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-900 transition-colors duration-300">
            <Sidebar />
            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                <Header />
                <div className="p-6 animate-fade-in">
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

