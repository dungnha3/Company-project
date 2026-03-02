import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';

export default function RegisterPage() {
    const [searchParams] = useSearchParams();
    const planFromUrl = searchParams.get('plan');

    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        fullName: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    const navigate = useNavigate();
    const { register } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return; // Guard against double submit

        if (!acceptTerms) {
            setError('Vui lòng đồng ý với điều khoản sử dụng');
            return;
        }

        // Client-side password validation (matches BE policy)
        if (!PASSWORD_REGEX.test(form.password)) {
            setError('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const result = await register(form);

            if (result.success) {
                navigate('/app', { replace: true });
            } else {
                setError(result.error || 'Đăng ký thất bại');
            }
        } catch (err) {
            setError(err.message || 'Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // Password validation - matches BE RegisterRequest.java policy
    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    const validatePassword = (password) => {
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            digit: /\d/.test(password),
            special: /[@$!%*?&]/.test(password),
        };
        const passed = Object.values(checks).filter(Boolean).length;
        return { checks, passed, isValid: passed === 5 };
    };

    const passwordStrength = () => {
        const { checks, passed, isValid } = validatePassword(form.password);
        if (form.password.length === 0) return { level: 0, text: '', color: 'bg-gray-200', checks };
        if (passed <= 2) return { level: 1, text: 'Yếu', color: 'bg-red-500', checks };
        if (passed <= 4) return { level: 2, text: 'Trung bình', color: 'bg-yellow-500', checks };
        return { level: 3, text: 'Mạnh', color: 'bg-green-500', checks };
    };

    const strength = passwordStrength();

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Hero */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-white blur-3xl" />
                    <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-white blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center p-12 text-white">
                    <div className="mb-8">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                                S
                            </div>
                            <span className="text-2xl font-bold">SaaS Enterprise</span>
                        </Link>
                    </div>

                    <h1 className="text-4xl font-bold mb-6 leading-tight">
                        Bắt đầu hành trình <br />
                        <span className="text-emerald-200">quản trị doanh nghiệp!</span>
                    </h1>

                    <p className="text-lg text-emerald-100 mb-8 max-w-md">
                        Tạo tài khoản miễn phí và khám phá nền tảng quản lý all-in-one cho doanh nghiệp của bạn.
                    </p>

                    {/* Features List */}
                    <div className="space-y-4">
                        {[
                            'Quản lý nhân sự toàn diện',
                            'Theo dõi dự án với Kanban & Gantt',
                            'Time Tracking & Analytics',
                            'Chat realtime & File sharing',
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                    <i className="fa-solid fa-check text-xs" />
                                </div>
                                <span className="text-emerald-100">{feature}</span>
                            </div>
                        ))}
                    </div>

                    {/* Plan Badge */}
                    {planFromUrl && (
                        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full w-fit">
                            <i className="fa-solid fa-crown text-amber-300" />
                            <span>Đang chọn gói: <strong>{planFromUrl}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold">
                                S
                            </div>
                            <span className="text-xl font-bold text-gray-900">SaaS Enterprise</span>
                        </Link>
                    </div>

                    <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-gray-100">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Tạo tài khoản</h2>
                            <p className="text-gray-500 mt-2">Miễn phí, không cần thẻ tín dụng</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <i className="fa-solid fa-circle-exclamation" />
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Họ và tên
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="Nguyễn Văn A"
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tên đăng nhập
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-at absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="username123"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="email@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mật khẩu
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="Tối thiểu 6 ký tự"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                                    </button>
                                </div>
                                {/* Password Strength */}
                                {form.password && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${strength.color} transition-all`}
                                                style={{ width: `${(strength.level / 3) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs ${strength.level === 3 ? 'text-green-600' : strength.level === 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {strength.text}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Terms */}
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-0.5"
                                />
                                <label htmlFor="terms" className="text-sm text-gray-600">
                                    Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của SaaS Enterprise
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Đang tạo tài khoản...
                                    </>
                                ) : (
                                    <>
                                        Tạo tài khoản miễn phí
                                        <i className="fa-solid fa-arrow-right" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="my-6 flex items-center">
                            <div className="flex-1 border-t border-gray-200" />
                            <span className="px-4 text-sm text-gray-400">hoặc</span>
                            <div className="flex-1 border-t border-gray-200" />
                        </div>

                        {/* Social Login */}
                        <GoogleLoginButton text="Đăng ký bằng Google" />

                        {/* Login Link */}
                        <p className="text-center mt-6 text-gray-600">
                            Đã có tài khoản?{' '}
                            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-500">
                                Đăng nhập
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
