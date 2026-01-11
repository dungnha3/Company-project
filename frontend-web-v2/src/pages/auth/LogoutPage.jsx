import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';

export default function LogoutPage() {
    const { logout, isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await logout();
            setDone(true);
            // Redirect after 2 seconds
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 2000);
        } catch (error) {
            console.error('Logout error:', error);
            navigate('/');
        }
    };

    // If not authenticated, redirect to home
    useEffect(() => {
        if (!isAuthenticated && !done) {
            navigate('/');
        }
    }, [isAuthenticated, navigate, done]);

    if (!isAuthenticated && !done) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
                {done ? (
                    <>
                        {/* Done State */}
                        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
                            <i className="fa-solid fa-check text-green-600 text-3xl" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Đã đăng xuất!
                        </h1>
                        <p className="text-gray-500 mb-6">
                            Cảm ơn bạn đã sử dụng SaaS Enterprise.<br />
                            Đang chuyển hướng...
                        </p>
                        <div className="w-8 h-8 mx-auto border-3 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
                    </>
                ) : loading ? (
                    <>
                        {/* Loading State */}
                        <div className="w-20 h-20 mx-auto rounded-full bg-indigo-100 flex items-center justify-center mb-6">
                            <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Đang đăng xuất...
                        </h1>
                        <p className="text-gray-500">
                            Vui lòng đợi trong giây lát
                        </p>
                    </>
                ) : (
                    <>
                        {/* Confirm State */}
                        <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-6">
                            <i className="fa-solid fa-right-from-bracket text-amber-600 text-3xl" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Đăng xuất?
                        </h1>
                        <p className="text-gray-500 mb-6">
                            Xin chào, <strong>{user?.fullName || user?.username}</strong>!<br />
                            Bạn có chắc chắn muốn đăng xuất không?
                        </p>

                        <div className="flex gap-3">
                            <Link
                                to="/app"
                                className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Quay lại
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                            >
                                <i className="fa-solid fa-right-from-bracket mr-2" />
                                Đăng xuất
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
