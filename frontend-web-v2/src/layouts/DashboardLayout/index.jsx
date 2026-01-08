import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '@shared/stores/uiStore';

export default function DashboardLayout() {
    const { sidebarCollapsed } = useUIStore();

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Sidebar />
            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                <Header />
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
