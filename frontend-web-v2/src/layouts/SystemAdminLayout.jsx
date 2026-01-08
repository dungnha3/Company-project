import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';

export default function SystemAdminLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const menuItems = [
        { icon: 'fa-building', label: 'Quản lý Công ty', path: '/admin/companies' },
        { icon: 'fa-users', label: 'Quản lý Tài khoản', path: '/admin/users' },
        { icon: 'fa-chart-line', label: 'Thống kê hệ thống', path: '/admin/analytics' },
        { icon: 'fa-gear', label: 'Cấu hình Global', path: '/admin/settings' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-screen z-10">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center mr-3">
                        <i className="fa-solid fa-server text-white text-sm" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">SaaS Admin</h1>
                        <p className="text-xs text-gray-400">System Control Portal</p>
                    </div>
                </div>

                {/* User Info */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                            SA
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.username || 'Admin'}</p>
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Online
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }
                            `}
                        >
                            <i className={`fa-solid ${item.icon} w-5 text-center`} />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors"
                    >
                        <i className="fa-solid fa-right-from-bracket w-5 text-center" />
                        <span className="font-medium">Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
