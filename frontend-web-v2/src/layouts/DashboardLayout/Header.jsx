import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import NotificationDropdown from '@shared/components/ui/NotificationDropdown';
import UserMenu from './UserMenu';

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
};

export default function Header() {
    const location = useLocation();
    const { user } = useAuthStore();

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
        <header className="header sticky top-0 z-30">
            <div className="header-title">
                <h1>{getPageTitle()}</h1>
                <p>Xin chào, {user?.username || 'Người dùng'}</p>
            </div>

            <div className="flex items-center gap-4">
                <NotificationDropdown />
                <UserMenu />
            </div>
        </header>
    );
}
