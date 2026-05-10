import { Link } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import { useState, useEffect, useRef } from 'react';

// Scroll-reveal hook
function useScrollReveal() {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return { ref, isVisible };
}

// Reveal wrapper
function Reveal({ children, className = '', delay = 0 }) {
    const { ref, isVisible } = useScrollReveal();
    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ${className}`}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
                transitionDelay: `${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

export default function LandingPage() {
    const { isAuthenticated, user, logout, isHydrated } = useAuthStore();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showStickyCta, setShowStickyCta] = useState(false);

    // Handle scroll for navbar transparency
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
            setShowStickyCta(window.scrollY > 600);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Show auth-aware content only after store rehydration
    const showAuthUI = isHydrated && isAuthenticated;

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-indigo-500 selection:text-white font-sans text-slate-900">
            {/* Header */}
            <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-lg border-b border-slate-200 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/30">
                                W
                            </div>
                            <span className={`text-2xl font-bold tracking-tight ${isScrolled ? 'text-slate-900' : 'text-slate-900'}`}>Workspace Hub</span>
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Tính năng</a>
                            <a href="#use-cases" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Giải pháp</a>
                        </nav>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-4">
                            {showAuthUI ? (
                                <div className="flex items-center gap-4">
                                    <Link to={user?.isSystemAdmin ? "/admin/companies" : "/app"} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg">
                                        {user?.isSystemAdmin ? "Vào Admin Portal" : "Vào Workspace"}
                                    </Link>
                                    
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                                            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-100 transition-all focus:outline-none"
                                        >
                                            <img 
                                                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.fullName}&background=6366f1&color=fff`} 
                                                alt="avatar" 
                                                className="w-10 h-10 rounded-full border border-slate-200 shadow-sm"
                                            />
                                        </button>

                                        {showProfileMenu && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in origin-top-right">
                                                    <div className="px-5 py-3 border-b border-slate-100">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</p>
                                                        <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                                                    </div>
                                                    <div className="p-2">
                                                        <button 
                                                            onClick={logout}
                                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                                                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                                            </div>
                                                            Đăng xuất
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link to="/login" className="hidden sm:block px-5 py-2.5 text-slate-600 hover:text-indigo-600 font-medium transition-colors">Đăng nhập</Link>
                                    <Link to="/register" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                                        Bắt đầu miễn phí
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-indigo-100/40 to-purple-100/40 blur-3xl opacity-70"></div>
                    <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-bl from-blue-100/40 to-cyan-100/40 blur-3xl opacity-70"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-medium text-sm mb-8 animate-fade-in-up">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Phiên bản Workspace Hub 2.0 đã ra mắt
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 tracking-tight leading-[1.1] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        Nền tảng Quản trị <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-300% animate-gradient">
                            Dự Án & Nhân Sự
                        </span>
                    </h1>
                    
                    <p className="text-xl md:text-2xl text-slate-500 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        Thay thế sự hỗn loạn của email, bảng tính và các công cụ rời rạc bằng một <strong>Không gian làm việc hợp nhất</strong>. Giúp đội ngũ của bạn tập trung vào kết quả.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <Link to={showAuthUI ? "/app" : "/register"} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold shadow-xl shadow-indigo-200 hover:-translate-y-1 transition-all w-full sm:w-auto flex items-center justify-center gap-3">
                            Bắt đầu ngay lập tức
                            <i className="fa-solid fa-arrow-right" />
                        </Link>
                        <a href="#use-cases" className="px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-lg font-bold transition-all w-full sm:w-auto flex items-center justify-center gap-3">
                            <i className="fa-regular fa-circle-play" />
                            Xem cách hoạt động
                        </a>
                    </div>
                    
                    <p className="mt-6 text-sm text-slate-400 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        Miễn phí vĩnh viễn cho team nhỏ • Không cần thẻ tín dụng
                    </p>

                    {/* Hero Image Mockup */}
                    <div className="mt-20 mx-auto max-w-6xl relative animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-30"></div>
                        <div className="relative rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                            {/* Browser Header */}
                            <div className="h-12 border-b border-slate-200 flex items-center px-4 bg-slate-50/80">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="mx-auto w-64 h-7 bg-white rounded-md border border-slate-200 text-xs flex items-center justify-center text-slate-400 font-mono shadow-sm">
                                    <i className="fa-solid fa-lock text-[10px] mr-2"></i> workspacehub.vn/app/projects
                                </div>
                            </div>
                            {/* Fake UI Body */}
                            <div className="h-[500px] flex">
                                {/* Sidebar */}
                                <div className="w-64 border-r border-slate-200 p-4 hidden md:block">
                                    <div className="h-8 bg-slate-200 rounded-md w-3/4 mb-8"></div>
                                    <div className="space-y-3">
                                        <div className="h-6 bg-indigo-100 rounded-md w-full"></div>
                                        <div className="h-6 bg-slate-100 rounded-md w-5/6"></div>
                                        <div className="h-6 bg-slate-100 rounded-md w-4/6"></div>
                                        <div className="h-6 bg-slate-100 rounded-md w-full"></div>
                                    </div>
                                    <div className="mt-12 space-y-3">
                                        <div className="h-6 bg-slate-100 rounded-md w-2/3"></div>
                                        <div className="h-6 bg-slate-100 rounded-md w-full"></div>
                                    </div>
                                </div>
                                {/* Main Content */}
                                <div className="flex-1 p-8 bg-slate-50/50">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="h-10 bg-slate-200 rounded-lg w-1/3"></div>
                                        <div className="flex gap-2">
                                            <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                                            <div className="h-10 w-10 bg-slate-200 rounded-full -ml-4 border-2 border-white"></div>
                                            <div className="h-10 w-24 bg-indigo-600 rounded-lg ml-2"></div>
                                        </div>
                                    </div>
                                    {/* Kanban columns */}
                                    <div className="grid grid-cols-3 gap-6 h-full">
                                        {[1, 2, 3].map(col => (
                                            <div key={col} className="bg-slate-100 rounded-xl p-4 flex flex-col gap-3">
                                                <div className="h-6 bg-slate-200 rounded w-1/2 mb-2"></div>
                                                <div className="h-24 bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                                                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                                                    <div className="flex justify-between">
                                                        <div className="h-4 bg-indigo-100 rounded w-1/4"></div>
                                                        <div className="h-6 w-6 bg-slate-200 rounded-full"></div>
                                                    </div>
                                                </div>
                                                <div className="h-32 bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                                                    <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                                                    <div className="h-4 bg-slate-200 rounded w-2/3 mb-4"></div>
                                                    <div className="flex justify-between mt-auto">
                                                        <div className="h-4 bg-red-100 rounded w-1/3"></div>
                                                        <div className="h-6 w-6 bg-slate-200 rounded-full"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Tất cả trong một nền tảng</h2>
                            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                                Một app duy nhất thay thế hàng loạt công cụ rời rạc — quản lý dự án, nhân sự, thời gian và báo cáo.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Reveal delay={0}>
                            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-default">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-table-columns"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Kanban Board</h3>
                                <p className="text-slate-500">Kéo thả task, tạo Sprints, thiết lập Workflow tùy theo quy trình của team.</p>
                            </div>
                        </Reveal>

                        <Reveal delay={100}>
                            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-default">
                                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-users-gear"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Resource Planning</h3>
                                <p className="text-slate-500">Phân bổ nhân sự hợp lý, theo dõi workload, tránh tình trạng quá tải.</p>
                            </div>
                        </Reveal>

                        <Reveal delay={200}>
                            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-default">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-clock"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Time Tracking</h3>
                                <p className="text-slate-500">Log giờ làm việc, báo cáo tự động, export dữ liệu nhanh chóng.</p>
                            </div>
                        </Reveal>

                        <Reveal delay={300}>
                            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-default">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-chart-line"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Analytics</h3>
                                <p className="text-slate-500">Dashboard trực quan, Burndown chart, Velocity tracking theo thời gian thực.</p>
                            </div>
                        </Reveal>

                        <Reveal delay={400}>
                            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-default">
                                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-user-group"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">HR Management</h3>
                                <p className="text-slate-500">Hồ sơ nhân sự, quản lý đơn nghỉ phép, đánh giá hiệu suất tích hợp.</p>
                            </div>
                        </Reveal>

                        <Reveal delay={500}>
                            <div className="group p-8 rounded-2xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/30 transition-all cursor-default">
                                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl mb-5 group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-bell"></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Notifications</h3>
                                <p className="text-slate-500">Cập nhật real-time, never miss deadline, theo dõi thay đổi trong dự án.</p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 bg-slate-50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Bắt đầu trong 3 phút</h2>
                            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Không cần setup phức tạp. Đăng ký, mời team, bắt đầu project.</p>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Reveal delay={0}>
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-indigo-200">
                                    1
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">Tạo Workspace</h3>
                                <p className="text-slate-500">Đăng ký tài khoản và tạo workspace cho công ty của bạn trong 30 giây.</p>
                            </div>
                        </Reveal>

                        <Reveal delay={150}>
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-indigo-200">
                                    2
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">Mời Team</h3>
                                <p className="text-slate-500">Gửi link invite, gán role và phân quyền cho từng thành viên nhanh chóng.</p>
                            </div>
                        </Reveal>

                        <Reveal delay={300}>
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-indigo-200">
                                    3
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">Bắt đầu Project</h3>
                                <p className="text-slate-500">Tạo project, thêm task, assign cho member và bắt đầu cộng tác ngay lập tức.</p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Features Use Cases (Left/Right Layout) */}
            <section id="use-cases" className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-20">
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Giải pháp hoàn hảo cho mọi khâu</h2>
                            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Workspace Hub kết nối quy trình làm việc, loại bỏ rào cản phòng ban, giúp doanh nghiệp vận hành trơn tru như một cỗ máy.</p>
                        </div>
                    </Reveal>

                    {/* Feature 1 */}
                    <Reveal>
                        <div className="flex flex-col lg:flex-row items-center gap-16 mb-32">
                            <div className="lg:w-1/2">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl mb-6">
                                    <i className="fa-solid fa-kanban"></i>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-4">Quản lý Dự án với Bảng Kanban</h3>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    Đừng để công việc bị trôi vào dĩ vãng. Trực quan hoá mọi tác vụ trên bảng Kanban, thiết lập Sprints, theo dõi tiến độ theo thời gian thực và tự động tạo báo cáo Burndown.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-indigo-500 mt-1"></i> Tùy chỉnh trạng thái Workflow theo team
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-indigo-500 mt-1"></i> Kéo thả task dễ dàng giữa các cột
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-indigo-500 mt-1"></i> Phân quyền chi tiết tới từng Issue
                                    </li>
                                </ul>
                            </div>
                            <div className="lg:w-1/2 w-full relative">
                                <div className="absolute -inset-4 bg-indigo-50 rounded-[3rem] transform rotate-3"></div>
                                <img src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?q=80&w=1000&auto=format&fit=crop" alt="Kanban UI mockup" className="relative rounded-2xl shadow-xl border border-slate-200 object-cover h-[400px] w-full" />
                            </div>
                        </div>
                    </Reveal>

                    {/* Feature 2 */}
                    <Reveal>
                        <div className="flex flex-col lg:flex-row-reverse items-center gap-16 mb-32">
                            <div className="lg:w-1/2">
                                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 text-2xl mb-6">
                                    <i className="fa-solid fa-users-gear"></i>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-4">Hoạch định Nguồn lực (Resource Planning)</h3>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    Nắm rõ ai đang làm gì và khối lượng công việc ra sao. Tránh tình trạng quá tải (Burnout) bằng cách phân bổ nhân sự hợp lý dựa trên năng lực và quỹ thời gian.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-purple-500 mt-1"></i> Biểu đồ tải công việc (Workload Chart)
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-purple-500 mt-1"></i> Quản lý đơn xin nghỉ phép (Leave Requests)
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-purple-500 mt-1"></i> Đánh giá hiệu suất nhân sự ngay trong dự án
                                    </li>
                                </ul>
                            </div>
                            <div className="lg:w-1/2 w-full relative">
                                <div className="absolute -inset-4 bg-purple-50 rounded-[3rem] transform -rotate-3"></div>
                                <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1000&auto=format&fit=crop" alt="Resource Planning" className="relative rounded-2xl shadow-xl border border-slate-200 object-cover h-[400px] w-full" />
                            </div>
                        </div>
                    </Reveal>

                    {/* Feature 3 */}
                    <Reveal>
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            <div className="lg:w-1/2">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl mb-6">
                                    <i className="fa-solid fa-chart-line"></i>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-4">Báo cáo & Phân tích chuyên sâu</h3>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    Dữ liệu không biết nói dối. Theo dõi sức khỏe của dự án qua các Dashboard trực quan, tự động tính toán thời gian hoàn thành để đưa ra quyết định kinh doanh chính xác.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-emerald-500 mt-1"></i> Sprint Velocity & Burndown Chart
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-emerald-500 mt-1"></i> Báo cáo thời gian đã log (Time-tracking)
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-700 font-medium">
                                        <i className="fa-solid fa-circle-check text-emerald-500 mt-1"></i> Xuất dữ liệu Excel/PDF dễ dàng
                                    </li>
                                </ul>
                            </div>
                            <div className="lg:w-1/2 w-full relative">
                                <div className="absolute -inset-4 bg-emerald-50 rounded-[3rem] transform rotate-3"></div>
                                <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop" alt="Analytics Dashboard" className="relative rounded-2xl shadow-xl border border-slate-200 object-cover h-[400px] w-full" />
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>


            {/* Final CTA */}
            <section className="relative py-24 bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20"></div>
                <Reveal>
                <div className="relative max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Sẵn sàng để tăng tốc dự án của bạn?</h2>
                    <p className="text-xl text-indigo-200 mb-10">Bắt đầu quản lý dự án và nhân sự của bạn trên một nền tảng hợp nhất ngay hôm nay.</p>
                    <Link to="/register" className="inline-block px-10 py-5 bg-white text-slate-900 rounded-xl text-lg font-bold shadow-xl hover:bg-indigo-50 hover:-translate-y-1 transition-all">
                        Tạo tài khoản miễn phí ngay
                    </Link>
                </div>
                </Reveal>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 pt-16 pb-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                                    W
                                </div>
                                <span className="text-2xl font-bold text-slate-900">Workspace Hub</span>
                            </div>
                            <p className="text-slate-500 max-w-sm mb-6 leading-relaxed">
                                Nền tảng quản trị dự án & nhân sự tập trung, giúp đội ngũ của bạn làm việc thông minh và hiệu quả hơn.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Workspace Hub. All rights reserved.</p>
                        <div className="flex gap-6 text-sm">
                            <a href="#" className="text-slate-500 hover:text-indigo-600">Điều khoản sử dụng</a>
                            <a href="#" className="text-slate-500 hover:text-indigo-600">Chính sách bảo mật</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Sticky CTA Bar */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-2xl transition-all duration-300 ${
                    showStickyCta ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="font-bold text-slate-900">Sẵn sàng bắt đầu?</p>
                        <p className="text-sm text-slate-500">Miễn phí vĩnh viễn cho team nhỏ</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to={showAuthUI ? "/app" : "/register"}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                        >
                            Dùng miễn phí
                        </Link>
                        <a href="#use-cases" className="px-6 py-3 text-slate-600 hover:text-indigo-600 font-medium transition-colors">
                            Tìm hiểu thêm
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
