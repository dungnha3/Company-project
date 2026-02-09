import { Link } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import PricingTable from './components/PricingTable';

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
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                S
                            </div>
                            <span className="text-xl font-bold text-gray-900">SaaS Enterprise</span>
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Tính năng</a>
                            <a href="#solutions" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Giải pháp</a>
                            <a href="#pricing" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Bảng giá</a>
                            <a href="#testimonials" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Khách hàng</a>
                        </nav>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-4">
                            {isAuthenticated ? (
                                <Link to={useAuthStore.getState().user?.isSystemAdmin ? "/admin" : "/app"} className="btn-primary">
                                    {useAuthStore.getState().user?.isSystemAdmin ? "Vào Admin Portal" : "Vào Ứng dụng"}
                                    <i className="fa-solid fa-arrow-right ml-2" />
                                </Link>
                            ) : (
                                <>
                                    <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">Đăng nhập</Link>
                                    <Link to="/register" className="btn-primary">Dùng miễn phí</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 overflow-hidden bg-gradient-to-b from-indigo-50/50 to-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 font-medium text-sm mb-8">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                        🚀 Phiên bản 2.0 với Time Tracking & Analytics
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
                        Quản trị Doanh nghiệp <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                            Thông minh & Hiệu quả
                        </span>
                    </h1>
                    <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
                        Nền tảng tất cả-trong-một: Nhân sự, Dự án, Chấm công, Tính lương,
                        Time Tracking, Analytics và Automation. Tối ưu hóa quy trình ngay hôm nay.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/register" className="btn-primary px-8 py-4 text-lg w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow">
                            Bắt đầu miễn phí <i className="fa-solid fa-arrow-right ml-2" />
                        </Link>
                        <a href="#demo" className="px-8 py-4 text-lg font-medium text-gray-600 hover:text-gray-900 w-full sm:w-auto flex items-center justify-center gap-2 group">
                            <i className="fa-solid fa-circle-play text-2xl text-indigo-600 group-hover:scale-110 transition-transform" />
                            Xem demo (2 phút)
                        </a>
                    </div>

                    {/* Dashboard Preview */}
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
                        <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-[400px]">
                            {/* Dashboard Preview - Feature Icons */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                                    <i className="fa-solid fa-users text-3xl text-blue-500 mb-2" />
                                    <div className="text-gray-700 font-medium">Nhân viên</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                                    <i className="fa-solid fa-diagram-project text-3xl text-indigo-500 mb-2" />
                                    <div className="text-gray-700 font-medium">Dự án</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                                    <i className="fa-solid fa-list-check text-3xl text-purple-500 mb-2" />
                                    <div className="text-gray-700 font-medium">Tasks</div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                                    <i className="fa-solid fa-clock text-3xl text-emerald-500 mb-2" />
                                    <div className="text-gray-700 font-medium">Time Tracking</div>
                                </div>
                            </div>

                            {/* Charts Preview */}
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 h-48 flex items-center justify-center">
                                    <div className="text-center text-gray-400">
                                        <i className="fa-solid fa-chart-line text-4xl mb-2 text-indigo-300" />
                                        <p className="text-sm">Burndown Chart</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 h-48 flex items-center justify-center">
                                    <div className="text-center text-gray-400">
                                        <i className="fa-solid fa-chart-pie text-4xl mb-2 text-purple-300" />
                                        <p className="text-sm">Analytics</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Features Grid - Updated with new features */}
            <section id="features" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-indigo-600 font-semibold uppercase tracking-wider text-sm">Tính năng</span>
                        <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Mọi công cụ bạn cần</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">Tích hợp đầy đủ các module quản lý doanh nghiệp, từ nhân sự đến dự án, tất cả trong một nền tảng.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: 'fa-users', color: 'bg-blue-500', title: 'Quản lý Nhân sự', desc: 'Hồ sơ nhân viên, phòng ban, chức vụ, hợp đồng. Quản lý toàn diện đội ngũ.' },
                            { icon: 'fa-list-check', color: 'bg-indigo-500', title: 'Quản lý Dự án', desc: 'Kanban board, Gantt chart, Sprint và Issue tracking. Theo dõi tiến độ trực quan.' },
                            { icon: 'fa-clock', color: 'bg-purple-500', title: 'Chấm công & Nghỉ phép', desc: 'GPS check-in, quản lý đơn nghỉ phép, tính công tự động.' },
                            { icon: 'fa-stopwatch', color: 'bg-cyan-500', title: 'Time Tracking', desc: 'Log thời gian làm việc cho từng task, báo cáo chi tiết productivity.', new: true },
                            { icon: 'fa-chart-line', color: 'bg-emerald-500', title: 'Analytics & Reports', desc: 'Burndown, Velocity, Status distribution. Biểu đồ đẹp mắt, insights sâu.', new: true },
                            { icon: 'fa-calendar-days', color: 'bg-rose-500', title: 'Calendar & Events', desc: 'Quản lý sự kiện, cuộc họp, deadline. Đồng bộ với lịch cá nhân.', new: true },
                            { icon: 'fa-bolt', color: 'bg-amber-500', title: 'Workflow Automation', desc: 'Tự động hóa quy trình: khi issue được tạo → gán → thông báo.', new: true },
                            { icon: 'fa-comments', color: 'bg-green-500', title: 'Chat & Collaboration', desc: 'Trò chuyện thời gian thực, channels, threads và file sharing.' },
                            { icon: 'fa-money-bill-wave', color: 'bg-teal-500', title: 'Bảng lương tự động', desc: 'Tính lương dựa trên công, nghỉ phép. Xuất payslip PDF.' },
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all group relative">
                                {feature.new && (
                                    <span className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        MỚI
                                    </span>
                                )}
                                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center text-white text-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <i className={`fa-solid ${feature.icon}`} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Solutions Section */}
            <section id="solutions" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-indigo-600 font-semibold uppercase tracking-wider text-sm">Giải pháp</span>
                        <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Phù hợp mọi ngành nghề</h2>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { icon: 'fa-laptop-code', title: 'Công ty IT', desc: 'Sprint, Kanban, Code review workflow' },
                            { icon: 'fa-building-columns', title: 'Ngân hàng & Tài chính', desc: 'Bảo mật cao, audit logs' },
                            { icon: 'fa-shopping-cart', title: 'Retail & E-commerce', desc: 'Quản lý shift, nhân viên part-time' },
                            { icon: 'fa-graduation-cap', title: 'Giáo dục', desc: 'Quản lý giáo viên, lịch dạy' },
                        ].map((solution, idx) => (
                            <div key={idx} className="text-center p-6 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                <div className="w-16 h-16 mx-auto rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl mb-4">
                                    <i className={`fa-solid ${solution.icon}`} />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">{solution.title}</h3>
                                <p className="text-sm text-gray-500">{solution.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <PricingTable />

            {/* Testimonials */}
            <section id="testimonials" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-indigo-600 font-semibold uppercase tracking-wider text-sm">Khách hàng</span>
                        <h2 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Được tin dùng bởi</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: 'Nguyễn Văn A', role: 'CEO, TechCorp VN', quote: 'SaaS Enterprise giúp chúng tôi tiết kiệm 40% thời gian quản lý nhân sự. Tính năng Time Tracking rất hữu ích!', avatar: 'A' },
                            { name: 'Trần Thị B', role: 'HR Manager, FinanceHub', quote: 'Giao diện đẹp, dễ sử dụng. Nhân viên rất thích tính năng chấm công bằng GPS và đơn nghỉ phép online.', avatar: 'B' },
                            { name: 'Lê Văn C', role: 'PM Lead, DevStudio', quote: 'Analytics và Burndown chart giúp team dễ dàng theo dõi velocity. Automation giảm 80% công việc thủ công.', avatar: 'C' },
                        ].map((testimonial, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex gap-1 text-amber-400 mb-4">
                                    {[1, 2, 3, 4, 5].map(i => <i key={i} className="fa-solid fa-star" />)}
                                </div>
                                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{testimonial.name}</div>
                                        <div className="text-sm text-gray-500">{testimonial.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-4xl font-bold text-white mb-6">
                        Sẵn sàng nâng cấp quy trình làm việc?
                    </h2>
                    <p className="text-xl text-indigo-100 mb-10">
                        Bắt đầu miễn phí ngay hôm nay. Không cần thẻ tín dụng.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/register" className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg">
                            Tạo tài khoản miễn phí
                        </Link>
                        <a href="#demo" className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors">
                            Xem demo
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                    S
                                </div>
                                <span className="text-xl font-bold">SaaS Enterprise</span>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Nền tảng quản trị doanh nghiệp toàn diện cho thời đại số.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="text-gray-400 hover:text-white transition-colors"><i className="fa-brands fa-facebook text-xl" /></a>
                                <a href="#" className="text-gray-400 hover:text-white transition-colors"><i className="fa-brands fa-linkedin text-xl" /></a>
                                <a href="#" className="text-gray-400 hover:text-white transition-colors"><i className="fa-brands fa-youtube text-xl" /></a>
                            </div>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="font-bold mb-4">Sản phẩm</h4>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li><a href="#features" className="hover:text-white transition-colors">Tính năng</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Bảng giá</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h4 className="font-bold mb-4">Công ty</h4>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">Về chúng tôi</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Tuyển dụng</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Liên hệ</a></li>
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="font-bold mb-4">Hỗ trợ</h4>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">Trung tâm trợ giúp</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Điều khoản sử dụng</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Chính sách bảo mật</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Status Page</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-500 text-sm">© 2024 SaaS Enterprise. All rights reserved.</p>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <span>Made with</span>
                            <i className="fa-solid fa-heart text-red-500" />
                            <span>in Vietnam</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
