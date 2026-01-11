import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import NotificationDropdown from '@shared/components/ui/NotificationDropdown';
import UserMenu from './UserMenu';
import ThemeToggle from '@components/ui/ThemeToggle';
import GlobalSearch from '@shared/components/GlobalSearch';

const PAGE_TITLES = {
    '/': 'Dashboard',
    '/employees': 'Quản lý nhân viên',
    '/departments': 'Quản lý phòng ban',
    '/positions': 'Quản lý chức vụ',
    '/contracts': 'Quản lý hợp đồng',
    '/attendance': 'Chấm công',
    '/leave-requests': 'Nghỉ phép',
    '/salaries': 'Bảng lương',
    '/projects': 'Dự án',
    '/my-issues': 'Công việc của tôi',
    '/storage': 'Tài liệu',
    '/chat': 'Trò chuyện',
    '/notifications': 'Thông báo',
    '/profile': 'Cài đặt tài khoản',
    '/org-chart': 'Sơ đồ tổ chức',
    '/hr-dashboard': 'HR Dashboard',
    '/reviews': 'Đánh giá nhân viên',
};

export default function Header() {
    const location = useLocation();
    const { user } = useAuthStore();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Global keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cmd+K or Ctrl+K to open search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Get page title based on current path
    const getPageTitle = () => {
        // Exact match
        if (PAGE_TITLES[location.pathname]) {
            return PAGE_TITLES[location.pathname];
        }
        // Check for detail pages
        if (location.pathname.startsWith('/employees/')) return 'Chi tiết nhân viên';
        if (location.pathname.startsWith('/projects/')) return 'Chi tiết dự án';
        return 'Tổng quan';
    };

    return (
        <>
            <header className="header sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="header-title">
                    <h1 className="text-gray-900 dark:text-gray-100">{getPageTitle()}</h1>
                    <p className="text-gray-500 dark:text-gray-400">Xin chào, {user?.username || 'Người dùng'}</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Button */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
                    >
                        <i className="fa-solid fa-search text-sm" />
                        <span className="hidden md:inline text-sm">Tìm kiếm...</span>
                        <kbd className="hidden md:inline px-1.5 py-0.5 bg-white dark:bg-gray-700 text-xs rounded border border-gray-200 dark:border-gray-600">
                            ⌘K
                        </kbd>
                    </button>

                    <ThemeToggle />
                    <NotificationDropdown />
                    <UserMenu />
                </div>
            </header>

            {/* Global Search Modal */}
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
}
