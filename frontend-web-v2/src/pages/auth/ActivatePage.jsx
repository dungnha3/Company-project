import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '@shared/stores/authStore';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';

export default function ActivatePage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();
    const { activate } = useAuthStore();
    const { clearWorkspace, fetchWorkspaces } = useWorkspaceStore();

    const validatePassword = (pass) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(pass);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setError('');

        if (!token) {
            setError('Đường dẫn kích hoạt không hợp lệ hoặc thiếu mã xác thực (token).');
            return;
        }

        if (!password) {
            setError('Vui lòng nhập mật khẩu.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        if (!validatePassword(password)) {
            setError('Mật khẩu phải từ 8 ký tự trở lên, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt (@$!%*?&).');
            return;
        }

        setLoading(true);
        try {
            const result = await activate(token, password);
            if (result.success) {
                setSuccess(true);
                await clearWorkspace();
                await fetchWorkspaces();
                setTimeout(() => {
                    if (result.user?.isSystemAdmin) {
                        navigate('/admin/companies', { replace: true });
                    } else {
                        navigate('/app', { replace: true });
                    }
                }, 1500);
            } else {
                setError(result.error || 'Kích hoạt tài khoản thất bại. Token có thể đã hết hạn hoặc không tồn tại.');
            }
        } catch (err) {
            setError('Đã xảy ra lỗi kết nối đến hệ thống.');
        } finally {
            setLoading(false);
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
                        Chào mừng bạn gia nhập! <br />
                        <span className="text-indigo-200">Kích hoạt tài khoản của bạn.</span>
                    </h1>

                    <p className="text-lg text-indigo-100 mb-8 max-w-md">
                        Chỉ một bước nữa để kết nối với đội ngũ, quản lý công việc và cộng tác dự án hiệu quả.
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
                            <h2 className="text-2xl font-bold text-gray-900">Kích hoạt tài khoản</h2>
                            <p className="text-gray-500 mt-2">Thiết lập mật khẩu hoặc đăng nhập nhanh</p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                            >
                                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success Alert */}
                        {success && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                            >
                                <i className="fa-solid fa-circle-check text-green-500" aria-hidden="true" />
                                <span>Kích hoạt tài khoản thành công! Đang chuyển hướng vào hệ thống...</span>
                            </div>
                        )}

                        {!token ? (
                            <div className="text-center text-gray-500 py-6">
                                <i className="fa-solid fa-triangle-exclamation text-4xl text-amber-500 mb-3" />
                                <p className="font-medium text-gray-700">Thiếu mã token kích hoạt</p>
                                <p className="text-sm mt-1">Đường dẫn kích hoạt này không chính xác hoặc đã lỗi thời. Vui lòng sử dụng liên kết trong email chào mừng từ nhân sự.</p>
                            </div>
                        ) : (
                            <>
                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Mật khẩu mới
                                        </label>
                                        <div className="relative">
                                            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                placeholder="Mật khẩu của bạn…"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
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

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                            Xác nhận mật khẩu mới
                                        </label>
                                        <div className="relative">
                                            <i className="fa-solid fa-lock-open absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                                            <input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                                placeholder="Nhập lại mật khẩu mới…"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                            >
                                                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || success}
                                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Đang kích hoạt...
                                            </>
                                        ) : (
                                            <>
                                                Kích hoạt & Đăng nhập
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
