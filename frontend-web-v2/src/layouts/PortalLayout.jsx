import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';

export default function PortalLayout({ children }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen relative flex flex-col overflow-x-hidden bg-[#F3F4F6]">
            {/* Animated Background Blobs (Mimicking v1 Style) */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-300/30 blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/30 blur-[100px] animate-pulse delay-1000" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-pink-300/20 blur-[80px]" />
            </div>

            {/* Navbar (Light Glass) */}
            <header className="relative z-30 border-b border-white/60 bg-white/60 backdrop-blur-xl sticky top-0 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/portal')}>
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                                S
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-800">SaaS Portal</span>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 hidden sm:block font-medium">
                                Xin chào, <strong>{user?.fullName || user?.username}</strong>
                            </span>
                            <div className="relative group">
                                <button className="flex items-center gap-2 focus:outline-none">
                                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 hover:bg-indigo-100 transition-all">
                                        {(user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                                    </div>
                                </button>

                                {/* Dropdown (Light) */}
                                <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-100 py-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all transform origin-top-right z-50 translate-y-2 group-hover:translate-y-0 duration-200">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                                    </div>
                                    <Link to="/app/profile" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                        <i className="fa-solid fa-user mr-3 w-4 opacity-70" /> Hồ sơ cá nhân
                                    </Link>
                                    <button
                                        onClick={logout}
                                        className="w-full text-left block px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <i className="fa-solid fa-right-from-bracket mr-3 w-4 opacity-70" /> Đăng xuất
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
                {children}
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-gray-200/60 py-6 mt-auto bg-white/40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
                    &copy; 2024 SaaS Enterprise.
                    <span className="opacity-50 mx-2">|</span>
                    Designed for performance
                </div>
            </footer>
        </div>
    );
}
