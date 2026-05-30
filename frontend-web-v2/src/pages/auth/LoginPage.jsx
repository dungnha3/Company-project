import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { login, verify2fa } = useAuthStore();
    const { clearWorkspace, fetchWorkspaces } = useWorkspaceStore();

    // 2FA state
    const [show2fa, setShow2fa] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [twoFaCode, setTwoFaCode] = useState('');
    const [verifying2fa, setVerifying2fa] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setError('');
        setLoading(true);

        try {
            const result = await login(form);

            if (result.requiresTwoFactor) {
                setTempToken(result.tempToken);
                setShow2fa(true);
                setLoading(false);
                return;
            }

            if (result.success) {
                await clearWorkspace();
                await fetchWorkspaces();
                if (result.user?.isSystemAdmin) {
                    navigate('/admin/companies', { replace: true });
                } else {
                    navigate('/app', { replace: true });
                }
            } else {
                setError(result.error || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2fa = async () => {
        setVerifying2fa(true);
        setError('');
        try {
            const result = await verify2fa(tempToken, twoFaCode);
            if (result.success) {
                await clearWorkspace();
                await fetchWorkspaces();
                if (result.user?.isSystemAdmin) {
                    navigate('/admin/companies', { replace: true });
                } else {
                    navigate('/app', { replace: true });
                }
            } else {
                setError(result.error || 'Mã xác thực không đúng');
            }
        } catch (err) {
            setError('Đã có lỗi xảy ra');
        } finally {
            setVerifying2fa(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Hero */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center p-12 text-white">
                    <div className="mb-8">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                                W
                            </div>
                            <span className="text-2xl font-bold">Workspace Hub</span>
                        </Link>
                    </div>

                    <h1 className="text-4xl font-bold mb-6 leading-tight">
                        Chào mừng trở lại! <br />
                        <span className="text-indigo-200">Sẵn sàng làm việc hiệu quả.</span>
                    </h1>

                    <p className="text-lg text-indigo-100 mb-8 max-w-md">
                        Đăng nhập để truy cập dashboard, quản lý dự án và theo dõi tiến độ công việc của bạn.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                                W
                            </div>
                            <span className="text-xl font-bold text-gray-900">Workspace Hub</span>
                        </Link>
                    </div>

                    <div role="dialog" aria-modal="true" className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-gray-100">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Đăng nhập</h2>
                            <p className="text-gray-500 mt-2">Nhập thông tin để tiếp tục</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                            >
                                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email đăng nhập
                                </label>
                                <div className="relative">
                                    <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        spellCheck={false}
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Nhập email của bạn…"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        Mật khẩu
                                    </label>
                                    <Link to="/forgot-password" tabIndex={-1} className="text-sm text-indigo-600 hover:text-indigo-500">
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                                    Ghi nhớ đăng nhập
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    <>
                                        Đăng nhập
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
                        <GoogleLoginButton text="Tiếp tục với Google" />

                        {/* Register Link */}
                        <p className="text-center mt-6 text-gray-600">
                            Chưa có tài khoản?{' '}
                            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Đăng ký miễn phí
                            </Link>
                        </p>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-6">
                        Bằng việc đăng nhập, bạn đồng ý với Điều khoản và Chính sách bảo mật của Workspace Hub.
                    </p>
                </div>
            </div>

            {/* 2FA Verification Modal */}
            {show2fa && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                                <i className="fa-solid fa-shield-halved text-2xl text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Xác thực hai yếu tố</h3>
                            <p className="text-gray-500 mt-1">Nhập mã 6 số từ ứng dụng Authenticator</p>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                <i className="fa-solid fa-circle-exclamation" />
                                {error}
                            </div>
                        )}

                        <div className="mb-6">
                            <input
                                type="text"
                                maxLength={6}
                                autoFocus
                                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="000000"
                                value={twoFaCode}
                                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                onKeyDown={(e) => e.key === 'Enter' && twoFaCode.length === 6 && handleVerify2fa()}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShow2fa(false);
                                    setTwoFaCode('');
                                    setTempToken('');
                                    setError('');
                                }}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleVerify2fa}
                                disabled={twoFaCode.length !== 6 || verifying2fa}
                                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {verifying2fa ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Đang xác thực...
                                    </>
                                ) : (
                                    'Xác nhận'
                                )}
                            </button>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-4">
                            Bạn cũng có thể dùng mã dự phòng (backup code)
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
