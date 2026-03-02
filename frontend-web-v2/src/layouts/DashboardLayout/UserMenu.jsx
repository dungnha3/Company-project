import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import { Avatar } from '@shared/components/OptimizedImage';

export default function UserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuthStore();

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
                <div className="avatar">
                    {user?.avatarUrl ? (
                        <Avatar src={user.avatarUrl} name={user.username} size="md" className="w-full h-full" />
                    ) : (
                        <span>{user?.username?.charAt(0)?.toUpperCase() || 'U'}</span>
                    )}
                </div>
                <i className="fa-solid fa-chevron-down text-gray-400 text-xs" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                            <div className="font-semibold dark:text-gray-100">{user?.username}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
                        </div>

                        <div className="py-2">
                            <Link
                                to="/app/me/profile"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <i className="fa-solid fa-user w-4" />
                                Hồ sơ cá nhân
                            </Link>
                            <Link
                                to="/app/me/profile?tab=security"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <i className="fa-solid fa-gear w-4" />
                                Cài đặt
                            </Link>
                        </div>

                        <div className="border-t border-gray-100 py-2">
                            <button
                                onClick={() => { logout(); setIsOpen(false); }}
                                className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                            >
                                <i className="fa-solid fa-right-from-bracket w-4" />
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
