import { Link } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';

export default function LandingPage() {
    const { isAuthenticated } = useAuthStore();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                                S
                            </div>
                            <span className="text-xl font-bold text-gray-900">SaaS Enterprise</span>
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-gray-500 hover:text-gray-900 font-medium">Tính năng</a>
                            <a href="#solutions" className="text-gray-500 hover:text-gray-900 font-medium">Giải pháp</a>
                            <a href="#pricing" className="text-gray-500 hover:text-gray-900 font-medium">Bảng giá</a>
                            <a href="#about" className="text-gray-500 hover:text-gray-900 font-medium">Về chúng tôi</a>
                        </nav>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-4">
                            {isAuthenticated ? (
                                <Link
                                    to="/app"
                                    className="btn-primary"
                                >
                                    Đến Dashboard
                                    <i className="fa-solid fa-arrow-right ml-2" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-gray-600 hover:text-gray-900 font-medium"
                                    >
                                        Đăng nhập
                                    </Link>
                                    <Link
                                        to="/login" // TODO: Add Register page later
                                        className="btn-primary"
                                    >
                                        Dùng miễn phí
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 font-medium text-sm mb-8">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                        Phiên bản Enterprise 2.0 đã sẵn sàng
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
                        Quản trị Doanh nghiệp <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            Thông minh & Hiệu quả
                        </span>
                    </h1>
                    <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
                        Nền tảng quản lý tất cả-trong-một: Nhân sự, Dự án, Tài chính và Giao tiếp nội bộ.
                        Tối ưu hóa quy trình làm việc của bạn ngay hôm nay.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/login" className="btn-primary px-8 py-4 text-lg w-full sm:w-auto">
                            Bắt đầu ngay miễn phí
                        </Link>
                        <button className="px-8 py-4 text-lg font-medium text-gray-600 hover:text-gray-900 w-full sm:w-auto flex items-center justify-center gap-2">
                            <i className="fa-solid fa-circle-play text-xl" />
                            Xem demo
                        </button>
                    </div>

                    {/* Dashboard Preview Image */}
                    <div className="mt-16 mx-auto max-w-5xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-white">
                        <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <div className="mx-auto w-1/2 h-6 bg-white rounded-md shadow-sm text-xs flex items-center justify-center text-gray-400 font-mono">
                                app.saas-enterprise.com/dashboard
                            </div>
                        </div>
                        {/* Mock UI Content */}
                        <div className="p-1 min-h-[400px] bg-slate-50 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <i className="fa-solid fa-chart-pie text-6xl mb-4 text-gray-300" />
                                <p>Dashboard Preview</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Tính năng mạnh mẽ</h2>
                        <p className="text-gray-500">Mọi công cụ bạn cần để vận hành doanh nghiệp</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: 'fa-users', title: 'Quản lý Nhân sự', desc: 'Hồ sơ nhân viên, chấm công, nghỉ phép và tính lương tự động.' },
                            { icon: 'fa-list-check', title: 'Quản lý Dự án', desc: 'Kanban board, Gantt chart và theo dõi tiến độ công việc trực quan.' },
                            { icon: 'fa-comments', title: 'Chat & Giao tiếp', desc: 'Trao đổi thời gian thực, thông báo tức thì và chia sẻ tài liệu.' },
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl mb-6">
                                    <i className={`fa-solid ${feature.icon}`} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-500">© 2024 SaaS Enterprise. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
