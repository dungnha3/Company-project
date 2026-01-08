import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(3); // TODO: Connect to API

    return (
        <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <i className="fa-solid fa-bell text-gray-500 text-xl" />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
